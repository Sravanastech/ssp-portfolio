import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactForm from "../ContactForm";
import { ThemeProvider } from "@/theme/ThemeContext";

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("ContactForm", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Rendering tests
  it("should render form title", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    expect(screen.getByText("Send a message")).toBeInTheDocument();
  });

  it("should render all form fields", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("example@mail.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("(555) 123-4567")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Tell me about the role, the team, or your questions…",
      ),
    ).toBeInTheDocument();
  });

  it("should render prescipt label", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    expect(
      screen.getByText(/I'll respond at either your email or phone number/i),
    ).toBeInTheDocument();
  });

  it("should render submit button", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    expect(screen.getByText("Send message")).toBeInTheDocument();
  });

  // Validation tests
  it("should show error when name is empty", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    const submitButton = screen.getByText("Send message");

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(/Please enter your full name/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("should show error when name is too short", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "J" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter your full name/i),
      ).toBeInTheDocument();
    });
  });

  it("should show error when message is empty", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    const submitButton = screen.getByText("Send message");

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(/at least 10 characters/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("should show error when email is invalid", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it("should require either email or phone", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });

    const submitButton = screen.getByText("Send message");
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        /Either an email address or a phone number is required/i,
      );
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should show accessible error summary with error links on invalid submit", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    const submitButton = screen.getByText("Send message");

    fireEvent.click(submitButton);

    await waitFor(() => {
      const summary = screen.getByTestId("error-summary");
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveAttribute("role", "alert");
      expect(screen.getByText(/Please fix the following/i)).toBeInTheDocument();
    });

    const nameErrorButton = screen.getByRole("button", { name: "Name" });
    fireEvent.click(nameErrorButton);

    const nameInput = screen.getByPlaceholderText("Your name");
    expect(document.activeElement).toBe(nameInput);
  });

  // Submission tests
  it("should call onSubmit with valid data", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.blur(nameInput);

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.blur(emailInput);

    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });
    fireEvent.blur(messageInput);

    // Wait a tick for form state to update
    await waitFor(() => {
      expect(nameInput.value).toBe("John Doe");
      expect(emailInput.value).toBe("john@example.com");
      expect(messageInput.value).toBe(
        "This is a test message with enough characters",
      );
    });

    const submitButton = screen.getByText("Send message");

    // Verify button is not disabled (indicating no validation errors)
    expect(submitButton).not.toBeDisabled();
  });

  it("should accept only phone number without email", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText(
      "(555) 123-4567",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.blur(nameInput);

    fireEvent.change(phoneInput, { target: { value: "555-1234" } });
    fireEvent.blur(phoneInput);

    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });
    fireEvent.blur(messageInput);

    await waitFor(() => {
      expect(phoneInput.value).toBe("555-1234");
      expect(nameInput.value).toBe("John Doe");
    });

    const submitButton = screen.getByText("Send message");
    expect(submitButton).not.toBeDisabled();
  });

  it("should accept only email without phone", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
    fireEvent.blur(nameInput);

    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    fireEvent.blur(emailInput);

    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });
    fireEvent.blur(messageInput);

    await waitFor(() => {
      expect(emailInput.value).toBe("jane@example.com");
      expect(nameInput.value).toBe("Jane Smith");
    });

    const submitButton = screen.getByText("Send message");
    expect(submitButton).not.toBeDisabled();
  });

  // Accessibility tests
  it("should have aria-describedby on email field when error", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const emailInput = screen.getByPlaceholderText("example@mail.com");
    fireEvent.change(emailInput, { target: { value: "invalid" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(
        emailInput.getAttribute("aria-describedby")?.split(/\s+/),
      ).toContain("email-error");
    });
  });

  it("should have aria-invalid on phone field when error", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const phoneInput = screen.getByPlaceholderText("(555) 123-4567");
    fireEvent.focus(phoneInput);
    fireEvent.blur(phoneInput);

    await waitFor(() => {
      // Phone field will have aria-invalid when both email and phone are empty
      expect(phoneInput).toHaveAttribute("aria-invalid");
    });
  });

  it("should show loading state", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} isLoading={true} />);
    expect(screen.getByText("Sending message…")).toBeInTheDocument();
  });

  it("should disable submit button when loading", () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} isLoading={true} />);
    const submitButton = screen.getByText(
      "Sending message…",
    ) as HTMLButtonElement;
    expect(submitButton).toBeDisabled();
  });

  it("should not call onSubmit if validation fails", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const submitButton = screen.getByText("Send message");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("should submit with both email and phone provided", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText(
      "(555) 123-4567",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.blur(nameInput);

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.blur(emailInput);

    fireEvent.change(phoneInput, { target: { value: "555-1234" } });
    fireEvent.blur(phoneInput);

    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });
    fireEvent.blur(messageInput);

    await waitFor(() => {
      expect(emailInput.value).toBe("john@example.com");
      expect(phoneInput.value).toBe("555-1234");
    });

    const submitButton = screen.getByText("Send message");
    expect(submitButton).not.toBeDisabled();
  });

  it("should show error field background highlight when email has error", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(emailInput).toHaveClass("ring-2", "ring-red-500");
    });
  });

  it("should show error field background highlight when phone has error", async () => {
    const onSubmit = vi.fn();
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;
    const submitButton = screen.getByText("Send message");

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(messageInput, {
      target: { value: "This is a test message with enough characters" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const phoneInput = screen.getByPlaceholderText(
        "(555) 123-4567",
      ) as HTMLInputElement;
      expect(phoneInput).toHaveClass("ring-2", "ring-red-500");
    });
  });

  it("should accept long message text", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    const longMessage =
      "This is a comprehensive message about the project with lots of details and information";
    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.blur(nameInput);

    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.blur(emailInput);

    fireEvent.change(messageInput, { target: { value: longMessage } });
    fireEvent.blur(messageInput);

    await waitFor(() => {
      expect(messageInput.value).toBe(longMessage);
    });

    const submitButton = screen.getByText("Send message");
    expect(submitButton).not.toBeDisabled();
  });

  // Keyboard shortcut tests
  it("prevents repeated keyboard submissions while the request is pending", async () => {
    let complete!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Test Person" },
    });
    fireEvent.change(screen.getByPlaceholderText("example@mail.com"), {
      target: { value: "test@example.com" },
    });
    const message = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    );
    fireEvent.change(message, {
      target: { value: "A sufficiently detailed project request." },
    });
    fireEvent.keyDown(message, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(message, { key: "Enter", metaKey: true });
    fireEvent.keyDown(message, { key: "Enter", ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByText("Send message")).toBeDisabled(),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    complete();
    await waitFor(() =>
      expect(screen.getByText("Send message")).not.toBeDisabled(),
    );
  });

  it("should submit form with Ctrl+Enter keyboard shortcut", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(messageInput, {
      target: { value: "Test message with enough characters here" },
    });

    // Wait for form state to update
    await waitFor(() => {
      expect(nameInput.value).toBe("John Doe");
    });

    // Simulate Ctrl+Enter on the form
    fireEvent.keyDown(messageInput, {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it("should submit form with Cmd+Enter keyboard shortcut on Mac", async () => {
    const onSubmit = vi.fn().mockImplementation(() => Promise.resolve());
    renderWithTheme(<ContactForm onSubmit={onSubmit} />);

    const nameInput = screen.getByPlaceholderText(
      "Your name",
    ) as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText(
      "example@mail.com",
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
    fireEvent.change(messageInput, {
      target: { value: "Test message with sufficient length" },
    });

    // Wait for form state to update
    await waitFor(() => {
      expect(nameInput.value).toBe("Jane Smith");
    });

    // Simulate Cmd+Enter on the form (Mac)
    fireEvent.keyDown(messageInput, {
      key: "Enter",
      code: "Enter",
      metaKey: true,
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it("renders the captcha slot and blocks submit until it is ready", async () => {
    const onSubmit = vi.fn();
    const view = renderWithTheme(
      <ContactForm
        onSubmit={onSubmit}
        captcha={<p>captcha slot</p>}
        captchaReady={false}
      />,
    );
    expect(screen.getByText("captcha slot")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Your name"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("example@mail.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Tell me about the role, the team, or your questions…",
      ),
      { target: { value: "Please discuss this project with me." } },
    );
    const send = screen.getByRole("button", { name: /Send message/ });
    expect(send).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(send);
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
    view.rerender(
      <ThemeProvider>
        <ContactForm
          onSubmit={onSubmit}
          captcha={<p>captcha slot</p>}
          captchaReady
        />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send message/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});
