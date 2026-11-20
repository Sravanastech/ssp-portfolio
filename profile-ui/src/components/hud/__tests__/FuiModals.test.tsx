import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { staticContent } from "@/content/siteContentContext";
import { FuiDossierModal } from "../FuiDossierModal";
import { FuiCommandPalette } from "../FuiCommandPalette";

describe("FuiDossierModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const study = staticContent.caseStudies[0];

  it("renders null when study is null", () => {
    const { container } = render(
      <MemoryRouter>
        <FuiDossierModal study={null} index={0} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders technical dossier metadata, SVG workflow nodes, and case study link", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <FuiDossierModal study={study} index={0} onClose={onClose} />
      </MemoryRouter>,
    );

    const dialog = screen.getByRole("dialog", { name: study.name });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("PRJ // 01")).toBeInTheDocument();
    expect(
      screen.getByText(`${study.organization} · ${study.role}`),
    ).toBeInTheDocument();

    const svg = container.querySelector("svg.fui-arch-svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("title")).toHaveTextContent(
      `${study.name} conceptual workflow`,
    );
    for (const step of study.flow) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
    expect(screen.getByText(study.flowNote)).toBeInTheDocument();

    expect(screen.getByText(study.problem)).toBeInTheDocument();
    expect(screen.getByText(study.contribution)).toBeInTheDocument();
    expect(screen.getByText(study.outcome)).toBeInTheDocument();

    const fullLink = screen.getByRole("link", {
      name: /Open Full Case Study/i,
    });
    expect(fullLink).toHaveAttribute("href", `/work/${study.slug}`);
  });

  it("exposes a named close button that calls onClose", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <FuiDossierModal study={study} index={0} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key and backdrop click", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <FuiDossierModal study={study} index={0} onClose={onClose} />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = container.querySelector(".fui-modal-backdrop");
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("FuiCommandPalette", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders null when closed", () => {
    const { container } = render(
      <MemoryRouter>
        <FuiCommandPalette
          open={false}
          onClose={vi.fn()}
          fuiTheme="void"
          onToggleFuiTheme={vi.fn()}
          onSelectStudy={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("filters projects by tech stack and selects matching study", () => {
    const onClose = vi.fn();
    const onSelectStudy = vi.fn();

    render(
      <MemoryRouter>
        <FuiCommandPalette
          open
          onClose={onClose}
          fuiTheme="void"
          onToggleFuiTheme={vi.fn()}
          onSelectStudy={onSelectStudy}
        />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      /Search projects, tech stack, or commands/i,
    );
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "Shopify" } });

    const retailBtn = screen.getByRole("button", {
      name: /Retail eCommerce storefront/i,
    });
    expect(retailBtn).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Enterprise application modernization/i,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(retailBtn);
    expect(onSelectStudy).toHaveBeenCalledWith("retail-ecommerce-storefront");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("toggles VOID/CLEANROOM theme and copies contact email with COPIED_TO_CLIPBOARD badge", () => {
    const onToggleFuiTheme = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { rerender } = render(
      <MemoryRouter>
        <FuiCommandPalette
          open
          onClose={vi.fn()}
          fuiTheme="void"
          onToggleFuiTheme={onToggleFuiTheme}
          onSelectStudy={vi.fn()}
        />
      </MemoryRouter>,
    );

    const toCleanroom = screen.getByRole("button", {
      name: /Switch FUI Theme \(CLEANROOM\)/i,
    });
    fireEvent.click(toCleanroom);
    expect(onToggleFuiTheme).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <FuiCommandPalette
          open
          onClose={vi.fn()}
          fuiTheme="cleanroom"
          onToggleFuiTheme={onToggleFuiTheme}
          onSelectStudy={vi.fn()}
        />
      </MemoryRouter>,
    );

    const toVoid = screen.getByRole("button", {
      name: /Switch FUI Theme \(VOID\)/i,
    });
    fireEvent.click(toVoid);
    expect(onToggleFuiTheme).toHaveBeenCalledTimes(2);

    const copyBtn = screen.getByRole("button", {
      name: new RegExp(
        `Copy Contact Email \\(${staticContent.profile.email}\\)`,
        "i",
      ),
    });
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith(staticContent.profile.email);
    expect(screen.getByText("COPIED_TO_CLIPBOARD")).toBeInTheDocument();
  });

  it("supports tech-stack filter chips and ArrowDown/Enter keyboard execution", () => {
    const onClose = vi.fn();
    const onSelectStudy = vi.fn();

    render(
      <MemoryRouter>
        <FuiCommandPalette
          open
          onClose={onClose}
          fuiTheme="void"
          onToggleFuiTheme={vi.fn()}
          onSelectStudy={onSelectStudy}
        />
      </MemoryRouter>,
    );

    const reactChip = screen.getByRole("button", { name: "React" });
    fireEvent.click(reactChip);
    expect(reactChip).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(onSelectStudy).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <FuiCommandPalette
          open
          onClose={onClose}
          fuiTheme="void"
          onToggleFuiTheme={vi.fn()}
          onSelectStudy={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
