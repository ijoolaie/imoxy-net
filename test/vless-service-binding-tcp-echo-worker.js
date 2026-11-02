// Internal-only TCP echo endpoint. Do not enable workers.dev or add a route.
export default {
  async connect(socket) {
    // A Worker can reach this handler only through a Service Binding TCP
    // forward; Cloudflare does not expose this as a public TCP listener.
    let chunks = 0;
    let bytes = 0;
    const diagnostics = new TransformStream({
      transform(chunk, controller) {
        chunks += 1;
        bytes += chunk?.byteLength ?? 0;
        // Payload-free counters help distinguish echo ingress from egress stalls.
        console.log(`VLESS_SMOKE_ECHO chunks=${chunks} bytes=${bytes} chunkBytes=${chunk?.byteLength ?? 0}`);
        controller.enqueue(chunk);
      }
    });
    await socket.readable.pipeThrough(diagnostics).pipeTo(socket.writable);
  }
};
