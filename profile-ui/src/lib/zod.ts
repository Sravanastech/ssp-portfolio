import { z } from "zod";

// The CSP forbids eval, so zod's JIT can never run here. Without `jitless` zod still probes
// `new Function("")` on first parse, which the browser reports as a CSP violation.
z.config({ jitless: true });

export { z };
