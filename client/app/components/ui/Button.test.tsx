import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";
import { Mail, ArrowRight } from "lucide-react";

describe("Button", () => {
  describe("rendering", () => {
    it("should render children correctly", () => {
      render(<Button>Click me</Button>);

      expect(
        screen.getByRole("button", { name: /click me/i }),
      ).toBeInTheDocument();
    });

    it("should render as a button element", () => {
      render(<Button>Test</Button>);

      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should forward ref correctly", () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Test</Button>);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });

    it("should pass additional props to button element", () => {
      render(
        <Button data-testid="custom-button" type="submit">
          Submit
        </Button>,
      );

      const button = screen.getByTestId("custom-button");
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  describe("variants", () => {
    it("should render primary variant by default", () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-primary-600");
    });

    it("should render secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-neutral-100");
    });

    it("should render outline variant", () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("border-2");
      expect(button.className).toContain("bg-transparent");
    });

    it("should render ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-transparent");
    });

    it("should render danger variant", () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-error-600");
    });

    it("should render success variant", () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-success-600");
    });
  });

  describe("sizes", () => {
    it("should render md size by default", () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-10");
    });

    it("should render sm size", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-9");
    });

    it("should render lg size", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-12");
    });

    it("should render xl size", () => {
      render(<Button size="xl">Extra Large</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-14");
    });

    it("should render icon size", () => {
      render(
        <Button size="icon">
          <Mail />
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-10");
      expect(button.className).toContain("w-10");
    });

    it("should render icon-sm size", () => {
      render(
        <Button size="icon-sm">
          <Mail />
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-8");
      expect(button.className).toContain("w-8");
    });

    it("should render icon-lg size", () => {
      render(
        <Button size="icon-lg">
          <Mail />
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-12");
      expect(button.className).toContain("w-12");
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);

      // The Loader2 icon should be rendered with animate-spin class
      const button = screen.getByRole("button");
      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should disable button when isLoading is true", () => {
      render(<Button isLoading>Loading</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should hide leftIcon when loading", () => {
      render(
        <Button isLoading leftIcon={<Mail data-testid="left-icon" />}>
          Loading
        </Button>,
      );

      expect(screen.queryByTestId("left-icon")).not.toBeInTheDocument();
    });

    it("should hide rightIcon when loading", () => {
      render(
        <Button isLoading rightIcon={<ArrowRight data-testid="right-icon" />}>
          Loading
        </Button>,
      );

      expect(screen.queryByTestId("right-icon")).not.toBeInTheDocument();
    });

    it("should still render children text when loading", () => {
      render(<Button isLoading>Submit</Button>);

      expect(screen.getByText("Submit")).toBeInTheDocument();
    });
  });

  describe("icons", () => {
    it("should render leftIcon", () => {
      render(
        <Button leftIcon={<Mail data-testid="left-icon" />}>Email</Button>,
      );

      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    });

    it("should render rightIcon", () => {
      render(
        <Button rightIcon={<ArrowRight data-testid="right-icon" />}>
          Next
        </Button>,
      );

      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("should render both icons", () => {
      render(
        <Button
          leftIcon={<Mail data-testid="left-icon" />}
          rightIcon={<ArrowRight data-testid="right-icon" />}
        >
          Email
        </Button>,
      );

      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should have opacity-50 class when disabled", () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("disabled:opacity-50");
    });

    it("should not trigger onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("interactions", () => {
    it("should call onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>,
      );

      await user.click(screen.getByRole("button"));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should handle multiple clicks", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Multi-click</Button>);

      await user.click(screen.getByRole("button"));
      await user.click(screen.getByRole("button"));
      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe("custom className", () => {
    it("should merge custom className with default classes", () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
      // Should still have default classes
      expect(button.className).toContain("inline-flex");
    });
  });

  describe("accessibility", () => {
    it("should be focusable", async () => {
      const user = userEvent.setup();
      render(<Button>Focusable</Button>);

      await user.tab();

      expect(screen.getByRole("button")).toHaveFocus();
    });

    it("should have focus ring styles", () => {
      render(<Button>Focus</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("focus-visible:ring-2");
    });

    it("should support aria-label", () => {
      render(
        <Button aria-label="Close dialog">
          <Mail />
        </Button>,
      );

      expect(
        screen.getByRole("button", { name: /close dialog/i }),
      ).toBeInTheDocument();
    });
  });
});
