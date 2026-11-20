import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { staticContent } from "@/content/siteContentContext";
import AetherHomeStage from "../AetherHomeStage";

function mockMedia(matching: string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderAetherHome() {
  return render(
    <MemoryRouter>
      <AetherHomeStage />
    </MemoryRouter>,
  );
}

describe("AetherHomeStage", () => {
  beforeEach(() => {
    mockMedia([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the central Singularity Core, axis hairlines, and chapter nav pills", () => {
    const { container } = renderAetherHome();

    const singularity = container.querySelector(".aether-singularity");
    expect(singularity).not.toBeNull();
    expect(container.querySelector(".aether-axis-x")).not.toBeNull();
    expect(container.querySelector(".aether-axis-y")).not.toBeNull();
    expect(singularity).toHaveTextContent("SP");
    expect(singularity).toHaveTextContent("01 / ORIGIN");

    const chapterNav = screen.getByRole("navigation", {
      name: /cinema chapters/i,
    });
    const pills = chapterNav.querySelectorAll("button.aether-chapter-pill");
    expect(pills).toHaveLength(4);
    expect(pills[0]).toHaveTextContent("01");
    expect(pills[1]).toHaveTextContent("02");
    expect(pills[2]).toHaveTextContent("03");
    expect(pills[3]).toHaveTextContent("04");
  });

  it("renders floating headline words, real identity, and origin actions", () => {
    const { container } = renderAetherHome();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(staticContent.profile.headline);

    const words = container.querySelectorAll(".aether-word");
    const expectedWordCount = staticContent.profile.headline
      .trim()
      .split(/\s+/).length;
    expect(words).toHaveLength(expectedWordCount);
    words.forEach((word, index) => {
      const el = word as HTMLElement;
      expect(el.style.getPropertyValue("--word-index")).toBe(String(index));
      expect(el.style.getPropertyValue("--blast-x")).not.toBe("");
      expect(el.style.getPropertyValue("--blast-y")).not.toBe("");
    });

    const originSection = container.querySelector("#aether-origin")!;
    expect(originSection).toHaveTextContent(staticContent.profile.name);
    expect(originSection).toHaveTextContent(staticContent.profile.role);
    expect(originSection).toHaveTextContent(staticContent.profile.employer);
    expect(originSection).toHaveTextContent(staticContent.profile.location);

    const workLinks = screen.getAllByRole("link", {
      name: /explore selected work/i,
    });
    expect(workLinks[0]).toHaveAttribute("href", "/work");
  });

  it("renders all 5 real case studies as alternating shards with links to /work/:slug", () => {
    const { container } = renderAetherHome();

    const workShards = container.querySelectorAll("article.aether-shard");
    expect(workShards).toHaveLength(staticContent.caseStudies.length);
    expect(workShards).toHaveLength(5);

    staticContent.caseStudies.forEach((study, index) => {
      const shard = workShards[index];
      expect(shard).toHaveAttribute(
        "data-side",
        index % 2 === 0 ? "left" : "right",
      );
      expect(shard).toHaveTextContent(study.organization);
      expect(shard).toHaveTextContent(study.role);
      expect(shard).toHaveTextContent(study.summary);
      expect(shard).toHaveTextContent(study.preview);

      const titleLink = screen.getByRole("link", { name: study.name });
      expect(titleLink).toHaveAttribute("href", `/work/${study.slug}`);

      study.technologies.forEach((tech) => {
        expect(shard).toHaveTextContent(tech);
      });
    });
  });

  it("renders all real employers in the architectural spine and top technologies", () => {
    const { container } = renderAetherHome();

    const spineSection = container.querySelector("#aether-spine")!;
    const blades = spineSection.querySelectorAll("li.aether-blade");
    expect(blades).toHaveLength(staticContent.experiences.length);

    const expectedEmployers = [
      "Fifth Third Bank",
      "Kroger",
      "FISA-OPA",
      "ICF Next Global",
      "Earth7",
    ];
    expectedEmployers.forEach((employer) => {
      expect(spineSection).toHaveTextContent(employer);
    });

    const stackItems = spineSection.querySelectorAll(".aether-stack-list li");
    expect(stackItems.length).toBeGreaterThan(0);
  });

  it("renders the closing gravitational convergence CTA with /contact and /resume links", () => {
    const { container } = renderAetherHome();

    const convergeSection = container.querySelector("#aether-converge")!;
    expect(convergeSection).toHaveTextContent(
      "Hiring for a senior engineering role?",
    );

    const contactLink = convergeSection.querySelector('a[href="/contact"]');
    expect(contactLink).not.toBeNull();

    const resumeLink = convergeSection.querySelector('a[href="/resume"]');
    expect(resumeLink).not.toBeNull();
  });

  it("sets --t to 0 and --focus to 1 immediately when prefers-reduced-motion is enabled", () => {
    mockMedia(["(prefers-reduced-motion: reduce)"]);
    const { container } = renderAetherHome();

    const scenes = container.querySelectorAll<HTMLElement>(".aether-scene");
    const shards = container.querySelectorAll<HTMLElement>(".aether-shard");
    expect(scenes.length).toBe(4);
    expect(shards.length).toBeGreaterThan(0);

    [...scenes, ...shards].forEach((el) => {
      expect(el.style.getPropertyValue("--t")).toBe("0");
      expect(el.style.getPropertyValue("--focus")).toBe("1");
    });
  });

  it("scrolls to the target act when clicking a chapter nav pill", () => {
    const { container } = renderAetherHome();
    const workSection = container.querySelector("#aether-work")!;
    const scrollIntoViewMock = vi.fn();
    workSection.scrollIntoView = scrollIntoViewMock;

    const workPill = screen.getByRole("button", {
      name: /jump to act 02/i,
    });
    fireEvent.click(workPill);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});
