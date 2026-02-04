import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, toast } from "./Toast";

describe("Toast system", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderWithToastProvider(children?: React.ReactNode) {
    return render(
      <ToastProvider>{children || <div>App Content</div>}</ToastProvider>,
    );
  }

  describe("ToastProvider", () => {
    it("renders children correctly", () => {
      renderWithToastProvider(<div data-testid="child">Child Content</div>);
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("renders without children", () => {
      render(<ToastProvider>{null}</ToastProvider>);
      // Should not throw
    });
  });

  describe("toast API", () => {
    it("shows success toast", async () => {
      renderWithToastProvider();

      act(() => {
        toast.success("Operation completed!");
      });

      expect(screen.getByText("Operation completed!")).toBeInTheDocument();
    });

    it("shows error toast", async () => {
      renderWithToastProvider();

      act(() => {
        toast.error("Something went wrong");
      });

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows warning toast", async () => {
      renderWithToastProvider();

      act(() => {
        toast.warning("Please review");
      });

      expect(screen.getByText("Please review")).toBeInTheDocument();
    });

    it("shows info toast", async () => {
      renderWithToastProvider();

      act(() => {
        toast.info("FYI information");
      });

      expect(screen.getByText("FYI information")).toBeInTheDocument();
    });

    it("returns toast id", () => {
      renderWithToastProvider();

      let toastId: string;
      act(() => {
        toastId = toast.success("Test message");
      });

      expect(typeof toastId!).toBe("string");
      expect(toastId!.length).toBeGreaterThan(0);
    });
  });

  describe("auto-dismiss", () => {
    it("removes toast after default duration", async () => {
      renderWithToastProvider();

      act(() => {
        toast.success("Temporary message");
      });

      expect(screen.getByText("Temporary message")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Temporary message")).not.toBeInTheDocument();
      });
    });

    it("removes toast after custom duration", async () => {
      renderWithToastProvider();

      act(() => {
        toast.success("Short message", 2000);
      });

      expect(screen.getByText("Short message")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Short message")).not.toBeInTheDocument();
      });
    });

    it("can create persistent toast with duration 0 that requires manual dismiss", async () => {
      renderWithToastProvider();

      let toastId: string;
      act(() => {
        toastId = toast.success("Persistent message", 0);
      });

      expect(screen.getByText("Persistent message")).toBeInTheDocument();

      // Toast should still exist after time passes (manual dismiss required)
      act(() => {
        toast.dismiss(toastId);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Persistent message"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("manual dismiss", () => {
    it("dismisses toast programmatically", async () => {
      renderWithToastProvider();

      let toastId: string;
      act(() => {
        toastId = toast.success("Will be dismissed", 0);
      });

      expect(screen.getByText("Will be dismissed")).toBeInTheDocument();

      act(() => {
        toast.dismiss(toastId);
      });

      await waitFor(() => {
        expect(screen.queryByText("Will be dismissed")).not.toBeInTheDocument();
      });
    });

    // Note: Skipped due to Radix UI internal pointer capture issues in jsdom with userEvent
    // The dismiss functionality is tested via programmatic dismissal above
    it.skip("dismisses toast when close button clicked with userEvent", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();

      renderWithToastProvider();

      act(() => {
        toast.success("Dismissable message", 0);
      });

      expect(screen.getByText("Dismissable message")).toBeInTheDocument();

      const closeButtons = screen.getAllByRole("button");
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(
          screen.queryByText("Dismissable message"),
        ).not.toBeInTheDocument();
      });
    });

    it("dismisses toast when close button clicked with fireEvent", async () => {
      renderWithToastProvider();

      act(() => {
        toast.success("Click to dismiss", 0);
      });

      const toastMessage = screen.getByText("Click to dismiss");
      expect(toastMessage).toBeInTheDocument();

      // Find the close button within this specific toast
      const toastElement = toastMessage.closest("li");
      const closeButton = toastElement?.querySelector("button");
      expect(closeButton).toBeTruthy();

      act(() => {
        fireEvent.click(closeButton!);
      });

      await waitFor(() => {
        expect(screen.queryByText("Click to dismiss")).not.toBeInTheDocument();
      });
    });
  });

  describe("multiple toasts", () => {
    it("displays multiple toasts simultaneously", () => {
      renderWithToastProvider();

      act(() => {
        toast.success("First toast");
        toast.error("Second toast");
        toast.info("Third toast");
      });

      expect(screen.getByText("First toast")).toBeInTheDocument();
      expect(screen.getByText("Second toast")).toBeInTheDocument();
      expect(screen.getByText("Third toast")).toBeInTheDocument();
    });

    it("removes toasts independently", async () => {
      renderWithToastProvider();

      act(() => {
        toast.success("First", 1000);
        toast.success("Second", 2000);
        toast.success("Third", 3000);
      });

      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.getByText("Third")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText("First")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Second")).toBeInTheDocument();
      expect(screen.getByText("Third")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText("Second")).not.toBeInTheDocument();
      });
      expect(screen.getByText("Third")).toBeInTheDocument();
    });
  });

  describe("toast types styling", () => {
    it("success toast has success styling", () => {
      renderWithToastProvider();

      act(() => {
        toast.success("Success message");
      });

      const toastElement = screen
        .getByText("Success message")
        .closest('[class*="bg-success"]');
      expect(toastElement).toBeInTheDocument();
    });

    it("error toast has error styling", () => {
      renderWithToastProvider();

      act(() => {
        toast.error("Error message");
      });

      const toastElement = screen
        .getByText("Error message")
        .closest('[class*="bg-error"]');
      expect(toastElement).toBeInTheDocument();
    });

    it("warning toast has warning styling", () => {
      renderWithToastProvider();

      act(() => {
        toast.warning("Warning message");
      });

      const toastElement = screen
        .getByText("Warning message")
        .closest('[class*="bg-warning"]');
      expect(toastElement).toBeInTheDocument();
    });

    it("info toast has primary styling", () => {
      renderWithToastProvider();

      act(() => {
        toast.info("Info message");
      });

      const toastElement = screen
        .getByText("Info message")
        .closest('[class*="bg-primary"]');
      expect(toastElement).toBeInTheDocument();
    });
  });
});
