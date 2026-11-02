// Internal-only TCP echo endpoint. Do not enable workers.dev or add a route.
export default {
  async connect(socket) {
    // A Worker can reach this handler only through a Service Binding TCP
    // forward; Cloudflare does not expose this as a public TCP listener.
    await socket.readable.pipeTo(socket.writable);
  }
};
