/** Shared lazy import of the pdf.js renderer so early preloading and the page reuse one request. */
let rendererModule: Promise<typeof import("@/lib/pdfRender")> | undefined;

export function loadPdfRenderer() {
  return (rendererModule ??= import("@/lib/pdfRender").catch((cause) => {
    rendererModule = undefined; // allow a retry to re-import
    throw cause;
  }));
}
