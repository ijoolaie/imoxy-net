#!/usr/bin/env python3
"""One-run, fixed-protocol TCP FIN/RST fault injector for Issue #78.

This program is intentionally Linux-only. It is not a proxy and never forwards
arbitrary client data to another destination.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
import socket
import stat
import struct
import sys
import time
from pathlib import Path
from typing import Any

PRELUDE = b"IMXY-RST-PRELUDE"
TOKEN_RE = re.compile(rb"^[A-Za-z0-9_-]{32,128}$")
NONCE_RE = re.compile(rb"^[a-f0-9]{32}$")
SIGNATURE_RE = re.compile(rb"^[a-f0-9]{64}$")
MAX_LINE_BYTES = 256
MAX_ACCEPTS = 4
IO_TIMEOUT_SECONDS = 5.0
MAX_RUNTIME_SECONDS = 60.0
DEFAULT_PORT = 24443


class ProbeProtocolError(Exception):
    """A bounded protocol or authentication failure."""


def emit(event: str, *, mode: str | None = None, nonce: str | None = None,
         peer: tuple[str, int] | None = None, detail: str | None = None) -> None:
    record: dict[str, Any] = {
        "event": event,
        "monotonic_ns": time.monotonic_ns(),
    }
    if mode is not None:
        record["mode"] = mode
    if nonce is not None:
        record["nonce"] = nonce
    if peer is not None:
        record["peer_ip"] = peer[0]
        record["peer_port"] = peer[1]
    if detail is not None:
        record["detail"] = detail
    print(json.dumps(record, separators=(",", ":")), flush=True)


def read_bounded_line(client: socket.socket) -> bytes:
    data = bytearray()
    while len(data) <= MAX_LINE_BYTES:
        chunk = client.recv(1)
        if not chunk:
            raise ProbeProtocolError("unexpected_eof")
        if chunk == b"\n":
            return bytes(data[:-1] if data.endswith(b"\r") else data)
        data.extend(chunk)
    raise ProbeProtocolError("line_too_long")


def validate_command(line: bytes, token: bytes, seen_nonces: set[bytes],
                     completed_modes: set[str]) -> tuple[str, bytes]:
    parts = line.split(b" ")
    if len(parts) != 4 or parts[0] != b"MODE":
        raise ProbeProtocolError("invalid_command")
    mode_bytes, nonce, supplied_signature = parts[1], parts[2], parts[3]
    if mode_bytes not in (b"FIN", b"RST"):
        raise ProbeProtocolError("invalid_mode")
    if not NONCE_RE.fullmatch(nonce):
        raise ProbeProtocolError("invalid_nonce")
    if not SIGNATURE_RE.fullmatch(supplied_signature):
        raise ProbeProtocolError("authentication_failed")
    signed_message = b"MODE " + mode_bytes + b" " + nonce
    expected_signature = hmac.new(token, signed_message, hashlib.sha256).hexdigest().encode("ascii")
    if not hmac.compare_digest(supplied_signature, expected_signature):
        raise ProbeProtocolError("authentication_failed")
    mode = mode_bytes.decode("ascii")
    if mode in completed_modes:
        raise ProbeProtocolError("mode_already_completed")
    if nonce in seen_nonces:
        raise ProbeProtocolError("nonce_replayed")
    seen_nonces.add(nonce)
    return mode, nonce


def handle_client(client: socket.socket, peer: tuple[str, int], token: bytes,
                  seen_nonces: set[bytes], completed_modes: set[str]) -> str:
    client.settimeout(IO_TIMEOUT_SECONDS)
    nonce_text: str | None = None
    mode: str | None = None
    try:
        line = read_bounded_line(client)
        mode, nonce = validate_command(line, token, seen_nonces, completed_modes)
        nonce_text = nonce.decode("ascii")
        client.sendall(b"READY " + nonce + b"\n" + PRELUDE)
        emit("accepted", mode=mode, nonce=nonce_text, peer=peer)

        ack = read_bounded_line(client)
        if ack != b"ACK " + nonce:
            raise ProbeProtocolError("ack_mismatch")
        emit("acknowledged", mode=mode, nonce=nonce_text, peer=peer)

        if mode == "FIN":
            client.shutdown(socket.SHUT_WR)
            emit("fin_sent", mode=mode, nonce=nonce_text, peer=peer)
            while True:
                extra = client.recv(1)
                if not extra:
                    break
                raise ProbeProtocolError("unexpected_client_payload")
            emit("fin_peer_closed", mode=mode, nonce=nonce_text, peer=peer)
        else:
            if not sys.platform.startswith("linux"):
                raise ProbeProtocolError("rst_requires_linux")
            # Linux struct linger is two native ints: l_onoff=1, l_linger=0.
            linger = struct.pack("ii", 1, 0)
            client.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, linger)
            emit("rst_armed", mode=mode, nonce=nonce_text, peer=peer)
        return mode
    except ProbeProtocolError as error:
        emit("connection_rejected", mode=mode, nonce=nonce_text, peer=peer,
             detail=str(error))
        raise
    except (OSError, TimeoutError) as error:
        emit("connection_error", mode=mode, nonce=nonce_text, peer=peer,
             detail=type(error).__name__)
        raise


def load_one_run_token(path: Path) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(path, flags)
    with os.fdopen(descriptor, "rb") as handle:
        metadata = os.fstat(handle.fileno())
        if not stat.S_ISREG(metadata.st_mode):
            raise PermissionError("token_file_must_be_regular_file")
        if metadata.st_uid != os.geteuid():
            raise PermissionError("token_file_must_be_owned_by_server_user")
        if stat.S_IMODE(metadata.st_mode) & 0o077:
            raise PermissionError("token_file_permissions_must_be_0600_or_stricter")
        raw = handle.read(130)
    if raw.endswith(b"\r\n"):
        raw = raw[:-2]
    elif raw.endswith(b"\n"):
        raw = raw[:-1]
    if not TOKEN_RE.fullmatch(raw):
        raise ValueError("token_file_must_contain_32_to_128_base64url_characters")
    return raw


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--token-file", required=True, type=Path)
    parser.add_argument("--delete-token-file", action="store_true",
                        help="explicitly allow deleting the one-run token file on exit")
    parser.add_argument("--public-bind", action="store_true",
                        help="bind 0.0.0.0 instead of loopback")
    parser.add_argument("--ack-public-exposure", action="store_true",
                        help="required together with --public-bind")
    args = parser.parse_args(argv)
    if not 1024 <= args.port <= 65535:
        parser.error("--port must be between 1024 and 65535")
    if args.public_bind != args.ack_public_exposure:
        parser.error("--public-bind and --ack-public-exposure must be supplied together")
    if not args.delete_token_file:
        parser.error("--delete-token-file is required for one-run token cleanup")
    return args


def run_server(args: argparse.Namespace) -> int:
    if not sys.platform.startswith("linux"):
        raise RuntimeError("The fault injector must run on Linux.")
    token = load_one_run_token(args.token_file)
    bind_address = "0.0.0.0" if args.public_bind else "127.0.0.1"
    completed_modes: set[str] = set()
    seen_nonces: set[bytes] = set()
    accepted_connections = 0
    deadline = time.monotonic() + MAX_RUNTIME_SECONDS
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind((bind_address, args.port))
        listener.listen(2)
        listener.settimeout(0.5)
        emit("listener_started", detail=f"{bind_address}:{args.port}")
        while len(completed_modes) < 2 and accepted_connections < MAX_ACCEPTS:
            if time.monotonic() >= deadline:
                break
            try:
                client, peer = listener.accept()
            except socket.timeout:
                continue
            accepted_connections += 1
            mode = None
            close_ok = False
            try:
                mode = handle_client(client, peer, token, seen_nonces, completed_modes)
            except (ProbeProtocolError, OSError, TimeoutError):
                pass
            finally:
                try:
                    client.close()
                    close_ok = True
                    if mode == "RST":
                        emit("rst_socket_close_called", mode=mode, peer=peer)
                    elif mode == "FIN":
                        emit("fin_socket_close_called", mode=mode, peer=peer)
                except OSError as error:
                    emit("socket_close_error", mode=mode, peer=peer,
                         detail=type(error).__name__)
            if mode is not None and close_ok:
                completed_modes.add(mode)
                emit("mode_completed", mode=mode, peer=peer)
        if completed_modes == {"FIN", "RST"}:
            emit("probe_pair_completed")
            return 0
        emit("probe_pair_incomplete",
             detail="completed_modes=" + ",".join(sorted(completed_modes)))
        return 1
    finally:
        try:
            listener.close()
            emit("listener_stopped")
        finally:
            if args.delete_token_file:
                try:
                    args.token_file.unlink(missing_ok=True)
                    emit("one_run_token_file_deleted")
                except OSError as error:
                    emit("token_file_cleanup_error", detail=type(error).__name__)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    return run_server(args)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - CLI boundary logs only error type.
        emit("fatal", detail=type(error).__name__)
        raise SystemExit(1)
