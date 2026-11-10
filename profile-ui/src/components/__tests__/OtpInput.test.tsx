import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import OtpInput from "../OtpInput";

const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[];
const type = (i: number, v: string) =>
  fireEvent.change(boxes()[i], { target: { value: v } });
const paste = (i: number, text: string) =>
  fireEvent.paste(boxes()[i], { clipboardData: { getData: () => text } });
const key = (i: number, k: string) => fireEvent.keyDown(boxes()[i], { key: k });

describe("OtpInput", () => {
  it("renders a labelled group of six numeric boxes", () => {
    render(<OtpInput legend="Verification code" onComplete={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: "Verification code" }),
    ).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    boxes().forEach((b, i) => {
      expect(b).toHaveAttribute("inputmode", "numeric");
      expect(b).toHaveAttribute("aria-label", `Digit ${i + 1} of 6`);
    });
    // First box accepts the whole code so OS autofill is not truncated.
    expect(boxes()[0]).toHaveAttribute("maxlength", "6");
    expect(boxes()[1]).toHaveAttribute("maxlength", "1");
    expect(boxes()[0]).toHaveAttribute("autocomplete", "one-time-code");
    expect(boxes()[1]).toHaveAttribute("autocomplete", "off");
  });

  it("moves forward as digits are typed and ignores non-digits", () => {
    render(<OtpInput legend="Code" onComplete={vi.fn()} />);
    type(0, "a");
    expect(boxes()[0]).toHaveValue("");
    type(0, "4");
    expect(boxes()[0]).toHaveValue("4");
    expect(boxes()[1]).toHaveFocus();
  });

  it("auto-submits on the sixth digit exactly once", () => {
    const onComplete = vi.fn();
    render(<OtpInput legend="Code" onComplete={onComplete} />);
    "123456".split("").forEach((d, i) => type(i, d));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("splits a pasted code across the boxes", () => {
    const onComplete = vi.fn();
    render(<OtpInput legend="Code" onComplete={onComplete} />);
    paste(0, " 12 34-56 ");
    expect(
      boxes()
        .map((b) => b.value)
        .join(""),
    ).toBe("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(boxes()[5]).toHaveFocus();
  });

  it("handles autofill that lands several digits in the first box", () => {
    const onComplete = vi.fn();
    render(<OtpInput legend="Code" onComplete={onComplete} />);
    type(0, "654321");
    expect(onComplete).toHaveBeenCalledWith("654321");
  });

  it("partial paste fills from the focused box without submitting", () => {
    const onComplete = vi.fn();
    render(<OtpInput legend="Code" onComplete={onComplete} />);
    paste(2, "99");
    expect(
      boxes()
        .map((b) => b.value)
        .join(""),
    ).toBe("99");
    expect(boxes()[2]).toHaveValue("9");
    expect(boxes()[3]).toHaveValue("9");
    expect(boxes()[4]).toHaveFocus();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("backspace clears the box, or moves left when empty", () => {
    render(<OtpInput legend="Code" onComplete={vi.fn()} />);
    type(0, "1");
    type(1, "2");
    boxes()[2].focus();
    key(2, "Backspace");
    expect(boxes()[1]).toHaveFocus();
    expect(boxes()[1]).toHaveValue("");
    expect(boxes()[0]).toHaveValue("1");
  });

  it("arrow keys, Home and End navigate", () => {
    render(<OtpInput legend="Code" onComplete={vi.fn()} />);
    boxes()[3].focus();
    key(3, "ArrowLeft");
    expect(boxes()[2]).toHaveFocus();
    key(2, "ArrowRight");
    expect(boxes()[3]).toHaveFocus();
    key(3, "Home");
    expect(boxes()[0]).toHaveFocus();
    key(0, "End");
    expect(boxes()[5]).toHaveFocus();
  });

  it("disables every box while pending", () => {
    render(<OtpInput legend="Code" disabled onComplete={vi.fn()} />);
    boxes().forEach((b) => expect(b).toBeDisabled());
  });

  it("reflects the error state and description link", () => {
    render(
      <OtpInput legend="Code" invalid describedBy="why" onComplete={vi.fn()} />,
    );
    boxes().forEach((b) => {
      expect(b).toHaveAttribute("aria-invalid", "true");
      expect(b).toHaveAttribute("aria-describedby", "why");
    });
  });

  it("clears and refocuses when resetKey changes", () => {
    const { rerender } = render(
      <OtpInput legend="Code" resetKey={0} onComplete={vi.fn()} />,
    );
    paste(0, "123456");
    rerender(<OtpInput legend="Code" resetKey={1} onComplete={vi.fn()} />);
    expect(boxes().every((b) => b.value === "")).toBe(true);
    expect(boxes()[0]).toHaveFocus();
  });
});
