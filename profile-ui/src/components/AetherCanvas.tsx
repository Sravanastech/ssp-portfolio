import { useEffect, useRef, useState, type ReactElement } from "react";
import { useParadigm } from "@/theme/ParadigmContext";
import { createAetherProgram } from "@/lib/aetherShader";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_DPR = 1.5;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

function isLitePerfMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.perf === "lite";
}

export default function AetherCanvas(): ReactElement | null {
  const { isAether } = useParadigm();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setMotionTick] = useState(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    if (typeof mql.addEventListener !== "function") return;
    const onChange = () => setMotionTick((n) => n + 1);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const canRender =
    isAether &&
    typeof window !== "undefined" &&
    !isLitePerfMode() &&
    !prefersReducedMotion();

  useEffect(() => {
    if (!canRender) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });

    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    const handle = createAetherProgram(gl);
    if (!handle) {
      canvas.style.display = "none";
      return;
    }

    canvas.style.display = "";

    let rafId: number | null = null;
    let contextLost = false;
    let elapsed = 0;
    let lastTime = performance.now();

    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let scrollProgress = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const updateScroll = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };

    const onPointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      targetMouseX = Math.min(1, Math.max(0, event.clientX / width));
      targetMouseY = Math.min(1, Math.max(0, 1 - event.clientY / height));
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const render = (now: number) => {
      rafId = null;
      if (contextLost || document.hidden) return;

      const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 0.1);
      lastTime = now;
      elapsed += dt;

      const damp = 1 - Math.exp(-4.5 * dt);
      mouseX += (targetMouseX - mouseX) * damp;
      mouseY += (targetMouseY - mouseY) * damp;

      gl.useProgram(handle.program);
      if (handle.vao) {
        gl.bindVertexArray(handle.vao);
      }
      gl.uniform2f(handle.uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(handle.uniforms.time, elapsed);
      gl.uniform2f(handle.uniforms.mouse, mouseX, mouseY);
      gl.uniform1f(handle.uniforms.scroll, scrollProgress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      rafId = window.requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (rafId !== null || contextLost || document.hidden) return;
      lastTime = performance.now();
      rafId = window.requestAnimationFrame(render);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stopLoop();
      canvas.style.display = "none";
    };

    resize();
    updateScroll();

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", updateScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("webglcontextlost", onContextLost);

    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", updateScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      handle.dispose();
    };
  }, [canRender]);

  if (!canRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="aether-canvas"
      aria-hidden="true"
      data-testid="aether-canvas"
    />
  );
}
