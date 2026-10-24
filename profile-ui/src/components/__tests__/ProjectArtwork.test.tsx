import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProjectArtwork from "../ProjectArtwork";

const ids = [
  "application-modernization",
  "quality-inspection",
  "workforce-modernization",
  "ecommerce-shopify-vue",
  "business-web-applications",
];

describe("ProjectArtwork", () => {
  it("renders a distinct labelled diagram per project", () => {
    const labels = ids.map((id) => {
      const { unmount } = render(<ProjectArtwork id={id} />);
      const label = screen.getByRole("img").getAttribute("aria-label");
      unmount();
      return label;
    });
    expect(labels.every(Boolean)).toBe(true);
    expect(new Set(labels).size).toBe(ids.length);
  });
});
