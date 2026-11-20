import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParadigmProvider } from "@/theme/ParadigmContext";
import AetherCanvas from "../AetherCanvas";
import {
  AETHER_FRAGMENT_SHADER,
  AETHER_VERTEX_SHADER,
  createAetherProgram,
} from "@/lib/aetherShader";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createMockWebGL2Context(options?: {
  compileOk?: boolean;
  linkOk?: boolean;
}) {
  const compileOk = options?.compileOk ?? true;
  const linkOk = options?.linkOk ?? true;

  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TRIANGLES: 0x0004,
    createShader: vi.fn(() => ({}) as WebGLShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => compileOk),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({}) as WebGLProgram),
    attachShader: vi.fn(),
    detachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => linkOk),
    deleteProgram: vi.fn(),
    createVertexArray: vi.fn(() => ({}) as WebGLVertexArrayObject),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    getUniformLocation: vi.fn(
      (_program: WebGLProgram, name: string) =>
        ({ name }) as unknown as WebGLUniformLocation,
    ),
    useProgram: vi.fn(),
    viewport: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
    isContextLost: vi.fn(() => false),
  };

  return gl as unknown as WebGL2RenderingContext & typeof gl;
}

function renderInParadigm(paradigm: "studio" | "kinetic" | "aether") {
  localStorage.setItem("portfolio-paradigm", paradigm);
  return render(
    <ParadigmProvider>
      <AetherCanvas />
    </ParadigmProvider>,
  );
}

describe("AetherCanvas", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.perf;
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset.perf;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("returns null in studio and kinetic modes", () => {
    const { unmount } = renderInParadigm("studio");
    expect(screen.queryByTestId("aether-canvas")).not.toBeInTheDocument();
    unmount();

    renderInParadigm("kinetic");
    expect(screen.queryByTestId("aether-canvas")).not.toBeInTheDocument();
  });

  it("returns null under prefers-reduced-motion: reduce", () => {
    mockMatchMedia(true);
    renderInParadigm("aether");
    expect(screen.queryByTestId("aether-canvas")).not.toBeInTheDocument();
  });

  it('returns null when data-perf="lite" is set', () => {
    document.documentElement.dataset.perf = "lite";
    renderInParadigm("aether");
    expect(screen.queryByTestId("aether-canvas")).not.toBeInTheDocument();
  });

  it('renders canvas in aether mode and handles getContext("webgl2") === null cleanly', () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);

    renderInParadigm("aether");

    const canvas = screen.getByTestId("aether-canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("aether-canvas");
    expect(getContextSpy).toHaveBeenCalledWith(
      "webgl2",
      expect.objectContaining({
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      }),
    );
    expect(canvas).toHaveStyle({ display: "none" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("caps DPR at 1.5, pauses on hidden, and disposes GL resources on unmount", () => {
    const mockGl = createMockWebGL2Context();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockGl as unknown as RenderingContext,
    );

    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });

    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return 42;
      });
    const cancelSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});

    const { unmount } = renderInParadigm("aether");

    const canvas = screen.getByTestId("aether-canvas") as HTMLCanvasElement;
    expect(canvas.width).toBe(1500);
    expect(canvas.height).toBe(900);
    expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 1500, 900);
    expect(rafSpy).toHaveBeenCalledTimes(1);

    // Run one frame
    rafCallbacks[0]?.(16);
    expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.TRIANGLES, 0, 3);

    // Pause when tab becomes hidden
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(cancelSpy).toHaveBeenCalledWith(42);

    // Handle webglcontextlost gracefully
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(canvas).toHaveStyle({ display: "none" });

    unmount();
    expect(mockGl.deleteVertexArray).toHaveBeenCalledTimes(1);
    expect(mockGl.deleteProgram).toHaveBeenCalledTimes(1);
  });
});

describe("aetherShader", () => {
  it("exports GLSL ES 3.00 shaders with required uniforms", () => {
    expect(AETHER_VERTEX_SHADER).toContain("#version 300 es");
    expect(AETHER_VERTEX_SHADER).toContain("gl_VertexID");
    expect(AETHER_FRAGMENT_SHADER).toContain("#version 300 es");
    expect(AETHER_FRAGMENT_SHADER).toContain("uniform vec2 uResolution;");
    expect(AETHER_FRAGMENT_SHADER).toContain("uniform float uTime;");
    expect(AETHER_FRAGMENT_SHADER).toContain("uniform vec2 uMouse;");
    expect(AETHER_FRAGMENT_SHADER).toContain("uniform float uScroll;");
  });

  it("returns null cleanly without throwing when shader compilation fails", () => {
    const mockGl = createMockWebGL2Context({ compileOk: false });
    expect(createAetherProgram(mockGl)).toBeNull();
    expect(mockGl.deleteShader).toHaveBeenCalled();
  });

  it("returns null cleanly without throwing when program linking fails", () => {
    const mockGl = createMockWebGL2Context({ linkOk: false });
    expect(createAetherProgram(mockGl)).toBeNull();
    expect(mockGl.deleteProgram).toHaveBeenCalled();
  });
});
