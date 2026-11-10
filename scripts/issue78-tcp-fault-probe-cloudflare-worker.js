import { connect } from "cloudflare:sockets";
import { createTcpFaultProbeWorker } from "../test/issue78-tcp-fault-probe-worker.js";

// Disposable probe entrypoint only. Never import this from the production Worker.
export default createTcpFaultProbeWorker({ connectTcp: connect });
