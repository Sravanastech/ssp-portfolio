import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/theme/ThemeContext";
import { caseStudies } from "@/data/caseStudies";
import { PROJECT_SLUGS } from "@/routes";
import ProjectPage from "../ProjectPage";

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider>
          <Routes>
            <Route path="/work/:slug" element={<ProjectPage />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("ProjectPage", () => {
  it("defines a slug for every case study matching the route list", () => {
    expect(caseStudies.map((study) => study.slug)).toEqual([...PROJECT_SLUGS]);
  });

  it.each(caseStudies.map((study) => [study.slug, study] as const))(
    "renders %s",
    (slug, study) => {
      renderAt(`/work/${slug}`);
      expect(
        screen.getByRole("heading", { level: 1, name: study.name }),
      ).toBeInTheDocument();
      expect(screen.getByText(study.summary)).toBeInTheDocument();
      expect(screen.getByText(study.organization)).toBeInTheDocument();
      for (const name of ["Problem", "My contribution", "Outcome"]) {
        expect(
          screen.getByRole("heading", { level: 2, name }),
        ).toBeInTheDocument();
      }
      expect(screen.getByText(study.problem)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute(
        "href",
        "/work",
      );
      expect(screen.getByText("View resume")).toHaveAttribute(
        "href",
        "/resume",
      );
      expect(screen.getByText("Get in touch")).toHaveAttribute(
        "href",
        "/contact",
      );
      const relatedLinks = screen
        .getByRole("heading", { name: "Related work" })
        .parentElement!.querySelectorAll("a");
      expect(relatedLinks).toHaveLength(2);
      relatedLinks.forEach((link) =>
        expect(link.getAttribute("href")).toMatch(/^\/work\/[a-z-]+$/),
      );
    },
  );

  it("shows the 404 page for an unknown slug", () => {
    renderAt("/work/does-not-exist");
    expect(
      screen.getByText("The page you're looking for doesn't exist."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Problem")).not.toBeInTheDocument();
  });
});
