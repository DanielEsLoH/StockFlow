import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

// Mock useTheme hook
const mockToggleTheme = vi.fn();
const mockTheme = { current: "light" as "light" | "dark" };

vi.mock("~/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    toggleTheme: mockToggleTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme.current = "light";
  });

  it("renders the toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it('displays "Modo oscuro" title when in light theme', () => {
    mockTheme.current = "light";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Modo oscuro")).toBeInTheDocument();
  });

  it('displays "Modo claro" title when in dark theme', () => {
    mockTheme.current = "dark";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Modo claro")).toBeInTheDocument();
  });

  it("calls toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button"));

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("calls toggleTheme multiple times on multiple clicks", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(mockToggleTheme).toHaveBeenCalledTimes(3);
  });

  it("renders with correct accessibility attributes", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title");
  });

  it("has correct base styles", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("flex", "items-center", "justify-center");
  });
});
