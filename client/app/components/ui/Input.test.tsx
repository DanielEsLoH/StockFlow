import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";
import { Search, Eye } from "lucide-react";
import { createRef, useState } from "react";

describe("Input", () => {
  describe("rendering", () => {
    it("should render an input element", () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("should render with default type text", () => {
      render(<Input />);

      const input = screen.getByRole("textbox");
      // HTML inputs default to type="text" when no type is specified
      // The attribute may not be present but the behavior is text
      expect(input.getAttribute("type") ?? "text").toBe("text");
    });

    it("should render with specified type", () => {
      render(<Input type="email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("should render password type input", () => {
      render(<Input type="password" data-testid="password-input" />);

      const input = screen.getByTestId("password-input");
      expect(input).toHaveAttribute("type", "password");
    });

    it("should be wrapped in a relative div container", () => {
      render(<Input data-testid="test-input" />);

      const input = screen.getByTestId("test-input");
      expect(input.parentElement).toHaveClass("relative");
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to input element", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should allow focus via ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      ref.current?.focus();

      expect(ref.current).toHaveFocus();
    });

    it("should allow programmatic value changes via ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      if (ref.current) {
        ref.current.value = "programmatic value";
      }

      expect(ref.current?.value).toBe("programmatic value");
    });
  });

  describe("error state", () => {
    it("should apply error styles when error prop is true", () => {
      render(<Input error />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("border-error-500");
    });

    it("should not apply error styles by default", () => {
      render(<Input />);

      const input = screen.getByRole("textbox");
      expect(input.className).not.toContain("border-error-500");
      expect(input.className).toContain("border-neutral-200");
    });

    it("should apply error focus ring when error is true", () => {
      render(<Input error />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("focus:ring-error-500");
    });
  });

  describe("leftElement", () => {
    it("should render left element", () => {
      render(<Input leftElement={<Search data-testid="search-icon" />} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should position left element correctly", () => {
      render(<Input leftElement={<Search data-testid="search-icon" />} />);

      const icon = screen.getByTestId("search-icon");
      expect(icon.parentElement).toHaveClass("absolute");
      expect(icon.parentElement).toHaveClass("left-3");
    });

    it("should add left padding to input when leftElement is provided", () => {
      render(<Input leftElement={<Search />} />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("pl-10");
    });

    it("should not add left padding when no leftElement", () => {
      render(<Input />);

      const input = screen.getByRole("textbox");
      expect(input.className).not.toContain("pl-10");
    });
  });

  describe("rightElement", () => {
    it("should render right element", () => {
      render(<Input rightElement={<Eye data-testid="eye-icon" />} />);

      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    });

    it("should position right element correctly", () => {
      render(<Input rightElement={<Eye data-testid="eye-icon" />} />);

      const icon = screen.getByTestId("eye-icon");
      expect(icon.parentElement).toHaveClass("absolute");
      expect(icon.parentElement).toHaveClass("right-3");
    });

    it("should add right padding to input when rightElement is provided", () => {
      render(<Input rightElement={<Eye />} />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("pr-10");
    });

    it("should not add right padding when no rightElement", () => {
      render(<Input />);

      const input = screen.getByRole("textbox");
      expect(input.className).not.toContain("pr-10");
    });
  });

  describe("both left and right elements", () => {
    it("should render both elements simultaneously", () => {
      render(
        <Input
          leftElement={<Search data-testid="left-icon" />}
          rightElement={<Eye data-testid="right-icon" />}
        />,
      );

      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should apply both paddings", () => {
      render(<Input leftElement={<Search />} rightElement={<Eye />} />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("pl-10");
      expect(input.className).toContain("pr-10");
    });
  });

  describe("interactions", () => {
    it("should call onChange when typing", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "hello");

      expect(handleChange).toHaveBeenCalled();
    });

    it("should update value when typing", async () => {
      const user = userEvent.setup();

      render(<Input />);
      const input = screen.getByRole("textbox");

      await user.type(input, "hello world");

      expect(input).toHaveValue("hello world");
    });

    it("should call onFocus when focused", async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} />);

      await user.click(screen.getByRole("textbox"));

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it("should call onBlur when blurred", async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(<Input onBlur={handleBlur} />);

      await user.click(screen.getByRole("textbox"));
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should have disabled styles", () => {
      render(<Input disabled />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("disabled:cursor-not-allowed");
      expect(input.className).toContain("disabled:opacity-50");
    });

    it("should not allow typing when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input disabled onChange={handleChange} />);

      await user.type(screen.getByRole("textbox"), "test");

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("custom className", () => {
    it("should merge custom className with default styles", () => {
      render(<Input className="custom-class" />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("custom-class");
      // Should still have default rounded class
      expect(input.className).toContain("rounded-xl");
    });
  });

  describe("accessibility", () => {
    it("should be focusable via keyboard", async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();

      expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("should support aria-label", () => {
      render(<Input aria-label="Email address" />);

      expect(
        screen.getByRole("textbox", { name: /email address/i }),
      ).toBeInTheDocument();
    });

    it("should support aria-describedby for error messages", () => {
      render(
        <>
          <Input aria-describedby="error-message" error />
          <span id="error-message">This field is required</span>
        </>,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "error-message");
    });

    it("should support aria-invalid for error state", () => {
      render(<Input aria-invalid="true" error />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("placeholder", () => {
    it("should display placeholder text", () => {
      render(<Input placeholder="Enter your email" />);

      expect(
        screen.getByPlaceholderText("Enter your email"),
      ).toBeInTheDocument();
    });

    it("should have placeholder styling", () => {
      render(<Input placeholder="Placeholder" />);

      const input = screen.getByRole("textbox");
      expect(input.className).toContain("placeholder:text-neutral-400");
    });
  });

  describe("controlled vs uncontrolled", () => {
    it("should work as controlled input", async () => {
      const user = userEvent.setup();
      const ControlledInput = () => {
        const [value, setValue] = useState("");
        return (
          <Input
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setValue(e.target.value)
            }
          />
        );
      };

      render(<ControlledInput />);

      await user.type(screen.getByRole("textbox"), "controlled");

      expect(screen.getByRole("textbox")).toHaveValue("controlled");
    });

    it("should work as uncontrolled input with defaultValue", () => {
      render(<Input defaultValue="initial value" />);

      expect(screen.getByRole("textbox")).toHaveValue("initial value");
    });
  });
});
