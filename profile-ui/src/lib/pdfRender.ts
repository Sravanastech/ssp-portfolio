/**
 * Canvas PDF renderer. Loaded only by the resume page (dynamic import) so pdf.js never
 * reaches other routes. The worker is a same-origin asset, eval and wasm are disabled so
 * the site CSP (no unsafe-eval, no wasm-unsafe-eval) holds. pdf.js 6 removed its
 * eval path entirely (no isEvalSupported option exists any more).
 */
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfPreviewHandle = { destroy: () => void };

type Options = {
  host: HTMLElement;
  data: Uint8Array;
  onFirstPage: () => void;
  onError: (error: unknown) => void;
};

const MAX_DPR = 2;
const RESIZE_THRESHOLD = 24;

export function renderPdf({
  host,
  data,
  onFirstPage,
  onError,
}: Options): PdfPreviewHandle {
  let destroyed = false;
  let generation = 0;
  let renderedWidth = 0;
  let doc: PDFDocumentProxy | null = null;
  let task: RenderTask | null = null;
  let resizeTimer: number | undefined;
  let firstReported = false;

  const loading = getDocument({
    data,
    useWasm: false,
    enableXfa: false,
  });

  async function paint(pdf: PDFDocumentProxy) {
    const run = ++generation;
    const width = Math.floor(host.clientWidth);
    if (width <= 0) return;
    renderedWidth = width;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const stale = () => destroyed || run !== generation;

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      if (stale()) return;
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.className = "resume-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Resume, page ${n} of ${pdf.numPages}`);
      task = page.render({ canvas, viewport });
      try {
        await task.promise;
      } catch (cause) {
        if (stale()) return;
        throw cause;
      }
      if (stale()) return;
      if (n === 1) {
        host.replaceChildren(canvas);
        if (!firstReported) {
          firstReported = true;
          onFirstPage();
        }
      } else {
        host.append(canvas);
      }
    }
  }

  loading.promise
    .then((pdf) => {
      if (destroyed) {
        void loading.destroy();
        return;
      }
      doc = pdf;
      return paint(pdf);
    })
    .catch((cause) => {
      if (!destroyed) onError(cause);
    });

  const observer =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            if (
              doc &&
              Math.abs(host.clientWidth - renderedWidth) > RESIZE_THRESHOLD
            )
              void paint(doc).catch((cause) => {
                if (!destroyed) onError(cause);
              });
          }, 200);
        })
      : null;
  observer?.observe(host);

  return {
    destroy() {
      destroyed = true;
      generation++;
      window.clearTimeout(resizeTimer);
      observer?.disconnect();
      task?.cancel();
      void loading.destroy();
      host.replaceChildren();
    },
  };
}
