import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Footer from "../Footer";

describe("Footer", () => {
  it("does not render the appearance settings disclosure or theme controls", () => {
    const { container } = render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>,
    );

    expect(container.querySelector("details.appearance-settings")).toBeNull();
    expect(container.querySelector(".theme-switcher")).toBeNull();
    expect(container.querySelector(".composition-switcher")).toBeNull();
  });
});
