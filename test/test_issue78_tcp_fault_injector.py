import hashlib
import hmac
import importlib.util
import io
import os
import pathlib
import socket
import struct
import tempfile
import threading
import sys
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "issue78-tcp-fault-injector.py"
SPEC = importlib.util.spec_from_file_location("issue78_tcp_fault_injector", SCRIPT)
INJECTOR = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = INJECTOR
SPEC.loader.exec_module(INJECTOR)

TOKEN = b"A" * 43
NONCE = b"0123456789abcdef0123456789abcdef"
PEER = ("198.51.100.10", 54321)


def command(mode=b"FIN", nonce=NONCE, token=TOKEN):
    message = b"MODE " + mode + b" " + nonce
    signature = hmac.new(token, message, hashlib.sha256).hexdigest().encode("ascii")
    return message + b" " + signature + b"\n"


class FakeSocket:
    def __init__(self, incoming):
        self.incoming = list(incoming)
        self.buffer = bytearray()
        self.sent = []
        self.timeouts = []
        self.shutdown_calls = []
        self.socket_options = []
        self.closed = False

    def settimeout(self, value):
        self.timeouts.append(value)

    def recv(self, size):
        while not self.buffer and self.incoming:
            self.buffer.extend(self.incoming.pop(0))
        if not self.buffer:
            return b""
        chunk = bytes(self.buffer[:size])
        del self.buffer[:size]
        return chunk

    def sendall(self, value):
        self.sent.append(value)

    def shutdown(self, how):
        self.shutdown_calls.append(how)

    def setsockopt(self, level, option, value):
        self.socket_options.append((level, option, value))

    def close(self):
        self.closed = True


class FaultInjectorTests(unittest.TestCase):
    def test_fin_sends_nonce_prelude_and_orderly_write_shutdown(self):
        client = FakeSocket([command(b"FIN"), b"ACK " + NONCE + b"\n", b""])
        completed = INJECTOR.handle_client(client, PEER, TOKEN, set(), set())
        self.assertEqual(completed, "FIN")
        self.assertEqual(client.sent, [b"READY " + NONCE + b"\n" + INJECTOR.PRELUDE])
        self.assertEqual(client.shutdown_calls, [INJECTOR.socket.SHUT_WR])
        self.assertEqual(client.socket_options, [])

    def test_rst_arms_zero_linger_and_does_not_use_orderly_shutdown(self):
        client = FakeSocket([command(b"RST"), b"ACK " + NONCE + b"\n"])
        with patch.object(INJECTOR.sys, "platform", "linux"):
            completed = INJECTOR.handle_client(client, PEER, TOKEN, set(), set())
        self.assertEqual(completed, "RST")
        self.assertEqual(
            client.socket_options,
            [(INJECTOR.socket.SOL_SOCKET, INJECTOR.socket.SO_LINGER, struct.pack("ii", 1, 0))]
        )
        self.assertEqual(client.shutdown_calls, [])

    @unittest.skipUnless(sys.platform.startswith("linux"), "requires Linux TCP SO_LINGER semantics")
    def test_linux_loopback_peer_observes_reset_after_zero_linger_close(self):
        listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        port = listener.getsockname()[1]
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.settimeout(3)
        client.connect(("127.0.0.1", port))
        accepted, peer_address = listener.accept()
        server_result = []
        server_errors = []

        def serve():
            try:
                server_result.append(
                    INJECTOR.handle_client(accepted, peer_address, TOKEN, set(), set())
                )
                accepted.close()
            except Exception as error:
                server_errors.append(error)
                try:
                    accepted.close()
                except OSError:
                    pass

        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        try:
            client.sendall(command(b"RST"))
            response_line = bytearray()
            while not response_line.endswith(b"\n"):
                response_line.extend(client.recv(1))
            self.assertEqual(bytes(response_line), b"READY " + NONCE + b"\n")
            prelude = bytearray()
            while len(prelude) < len(INJECTOR.PRELUDE):
                prelude.extend(client.recv(len(INJECTOR.PRELUDE) - len(prelude)))
            self.assertEqual(bytes(prelude), INJECTOR.PRELUDE)
            client.sendall(b"ACK " + NONCE + b"\n")
            with self.assertRaises(ConnectionResetError):
                client.recv(1)
            thread.join(timeout=3)
            self.assertFalse(thread.is_alive())
            self.assertEqual(server_result, ["RST"])
            self.assertEqual(server_errors, [])
        finally:
            client.close()
            listener.close()
            thread.join(timeout=3)

    def test_authentication_failure_sends_no_ready_or_prelude(self):
        invalid = b"MODE RST " + NONCE + b" " + b"B" * 64 + b"\n"
        client = FakeSocket([invalid])
        output = io.StringIO()
        with redirect_stdout(output):
            with self.assertRaises(INJECTOR.ProbeProtocolError):
                INJECTOR.handle_client(client, PEER, TOKEN, set(), set())
        self.assertEqual(client.sent, [])
        self.assertNotIn(TOKEN.decode(), output.getvalue())
        self.assertIn("authentication_failed", output.getvalue())

    def test_nonce_replay_and_mode_replay_are_rejected(self):
        seen = {NONCE}
        with self.assertRaises(INJECTOR.ProbeProtocolError):
            INJECTOR.validate_command(command(b"FIN").strip(), TOKEN, seen, set())
        with self.assertRaises(INJECTOR.ProbeProtocolError):
            INJECTOR.validate_command(
                command(b"RST", b"f" * 32).strip(), TOKEN, set(), {"RST"}
            )

    def test_only_exact_protocol_commands_are_accepted(self):
        bad_lines = [
            b"RST " + NONCE + b" " + b"0" * 64,
            b"MODE UDP " + NONCE + b" " + b"0" * 64,
            b"MODE FIN " + b"not-a-nonce" + b" " + b"0" * 64,
            b"MODE FIN " + NONCE + b" " + b"0" * 64 + b" extra",
            b"MODE FIN " + NONCE + b" " + TOKEN,
        ]
        for line in bad_lines:
            with self.subTest(line=line):
                with self.assertRaises(INJECTOR.ProbeProtocolError):
                    INJECTOR.validate_command(line, TOKEN, set(), set())

    def test_ack_mismatch_is_rejected_before_fin_or_rst_action(self):
        client = FakeSocket([command(b"FIN"), b"ACK " + b"f" * 32 + b"\n"])
        with self.assertRaises(INJECTOR.ProbeProtocolError):
            INJECTOR.handle_client(client, PEER, TOKEN, set(), set())
        self.assertEqual(client.shutdown_calls, [])
        self.assertEqual(client.socket_options, [])

    def test_bounded_line_reader_rejects_oversized_line(self):
        client = FakeSocket([b"x"] * (INJECTOR.MAX_LINE_BYTES + 1))
        with self.assertRaises(INJECTOR.ProbeProtocolError):
            INJECTOR.read_bounded_line(client)

    def test_rst_mode_fails_closed_when_not_running_on_linux(self):
        client = FakeSocket([command(b"RST"), b"ACK " + NONCE + b"\n"])
        with patch.object(INJECTOR.sys, "platform", "win32"):
            with self.assertRaises(INJECTOR.ProbeProtocolError):
                INJECTOR.handle_client(client, PEER, TOKEN, set(), set())
        self.assertEqual(client.socket_options, [])

    @unittest.skipIf(os.name == "nt", "POSIX file owner/mode checks require Linux")
    def test_one_run_token_file_requires_private_regular_file(self):
        with tempfile.TemporaryDirectory() as directory:
            token_path = pathlib.Path(directory) / "token"
            token_path.write_bytes(TOKEN + b"\n")
            os.chmod(token_path, 0o600)
            self.assertEqual(INJECTOR.load_one_run_token(token_path), TOKEN)
            os.chmod(token_path, 0o644)
            with self.assertRaises(PermissionError):
                INJECTOR.load_one_run_token(token_path)
            symlink_path = pathlib.Path(directory) / "token-link"
            symlink_path.symlink_to(token_path)
            with self.assertRaises(OSError):
                INJECTOR.load_one_run_token(symlink_path)

    def test_public_bind_requires_both_explicit_acknowledgements(self):
        with self.assertRaises(SystemExit):
            INJECTOR.parse_args(["--token-file", "token", "--delete-token-file", "--public-bind"])
        with self.assertRaises(SystemExit):
            INJECTOR.parse_args(["--token-file", "token", "--delete-token-file", "--ack-public-exposure"])
        args = INJECTOR.parse_args([
            "--token-file", "token", "--delete-token-file",
            "--public-bind", "--ack-public-exposure"
        ])
        self.assertTrue(args.public_bind)
        self.assertTrue(args.ack_public_exposure)

    def test_token_cleanup_is_explicitly_required(self):
        with self.assertRaises(SystemExit):
            INJECTOR.parse_args(["--token-file", "token"])


if __name__ == "__main__":
    unittest.main()
