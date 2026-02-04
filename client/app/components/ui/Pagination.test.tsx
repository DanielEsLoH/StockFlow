import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination, PaginationInfo } from "./Pagination";

describe("Pagination", () => {
  describe("Basic Rendering", () => {
    it("should render pagination controls", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should have proper aria-label", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      expect(screen.getByRole("navigation")).toHaveAttribute(
        "aria-label",
        "Paginacion",
      );
    });

    it("should not render if totalPages is 1 or less", () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={1}
          totalPages={1}
          onPageChange={onPageChange}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render page number buttons", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Pagina 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 2" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 5" }),
      ).toBeInTheDocument();
    });
  });

  describe("Previous Button", () => {
    it("should be disabled on first page", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const prevButton = screen.getByRole("button", {
        name: "Pagina anterior",
      });
      expect(prevButton).toBeDisabled();
    });

    it("should be enabled on pages after first", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const prevButton = screen.getByRole("button", {
        name: "Pagina anterior",
      });
      expect(prevButton).not.toBeDisabled();
    });

    it("should call onPageChange with previous page when clicked", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const prevButton = screen.getByRole("button", {
        name: "Pagina anterior",
      });
      fireEvent.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("should not call onPageChange when clicking previous on first page", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const prevButton = screen.getByRole("button", {
        name: "Pagina anterior",
      }) as HTMLButtonElement;
      // Access the React fiber to get the onClick prop
      const fiberKey = Object.keys(prevButton).find((key) =>
        key.startsWith("__reactFiber$"),
      );
      if (fiberKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fiber = (prevButton as any)[fiberKey];
        const onClick = fiber.memoizedProps?.onClick;
        if (onClick) {
          // Directly invoke the onClick handler
          onClick();
        }
      }

      // The guard condition (currentPage > 1) should prevent the call
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("Next Button", () => {
    it("should be disabled on last page", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const nextButton = screen.getByRole("button", {
        name: "Pagina siguiente",
      });
      expect(nextButton).toBeDisabled();
    });

    it("should be enabled on pages before last", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const nextButton = screen.getByRole("button", {
        name: "Pagina siguiente",
      });
      expect(nextButton).not.toBeDisabled();
    });

    it("should call onPageChange with next page when clicked", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const nextButton = screen.getByRole("button", {
        name: "Pagina siguiente",
      });
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("should not call onPageChange when clicking next on last page", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const nextButton = screen.getByRole("button", {
        name: "Pagina siguiente",
      }) as HTMLButtonElement;
      // Access the React fiber to get the onClick prop
      const fiberKey = Object.keys(nextButton).find((key) =>
        key.startsWith("__reactFiber$"),
      );
      if (fiberKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fiber = (nextButton as any)[fiberKey];
        const onClick = fiber.memoizedProps?.onClick;
        if (onClick) {
          // Directly invoke the onClick handler
          onClick();
        }
      }

      // The guard condition (currentPage < totalPages) should prevent the call
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("Page Number Buttons", () => {
    it("should call onPageChange when a page number is clicked", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const page3Button = screen.getByRole("button", { name: "Pagina 3" });
      fireEvent.click(page3Button);

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("should mark current page with aria-current", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const currentPageButton = screen.getByRole("button", {
        name: "Pagina 3",
      });
      expect(currentPageButton).toHaveAttribute("aria-current", "page");
    });

    it("should not have aria-current on non-current pages", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={onPageChange}
        />,
      );

      const otherPageButton = screen.getByRole("button", { name: "Pagina 1" });
      expect(otherPageButton).not.toHaveAttribute("aria-current");
    });
  });

  describe("Ellipsis", () => {
    it("should show ellipsis when there are many pages", () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={5}
          totalPages={10}
          onPageChange={onPageChange}
        />,
      );

      // Ellipsis elements are spans with aria-hidden
      const ellipsisElements = container.querySelectorAll(
        '[aria-hidden="true"]',
      );
      expect(ellipsisElements.length).toBeGreaterThan(0);
    });

    it("should always show first and last page", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          onPageChange={onPageChange}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Pagina 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 10" }),
      ).toBeInTheDocument();
    });

    it("should show only right ellipsis when on first pages", () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={2}
          totalPages={10}
          onPageChange={onPageChange}
        />,
      );

      // Should show pages 1,2,3,4,5 and then ellipsis and last page
      expect(
        screen.getByRole("button", { name: "Pagina 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 2" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 3" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 4" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 5" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 10" }),
      ).toBeInTheDocument();

      // Only one ellipsis (on the right side) - target span elements with aria-hidden that are direct children of the page numbers container
      const ellipsisElements = container.querySelectorAll(
        'span[aria-hidden="true"]',
      );
      expect(ellipsisElements.length).toBe(1);
    });

    it("should show only left ellipsis when on last pages", () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={9}
          totalPages={10}
          onPageChange={onPageChange}
        />,
      );

      // Should show first page, ellipsis, and then pages 6,7,8,9,10
      expect(
        screen.getByRole("button", { name: "Pagina 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 6" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 7" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 8" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 9" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 10" }),
      ).toBeInTheDocument();

      // Only one ellipsis (on the left side) - target span elements with aria-hidden
      const ellipsisElements = container.querySelectorAll(
        'span[aria-hidden="true"]',
      );
      expect(ellipsisElements.length).toBe(1);
    });

    it("should show both ellipses when in the middle", () => {
      const onPageChange = vi.fn();
      const { container } = render(
        <Pagination
          currentPage={5}
          totalPages={10}
          onPageChange={onPageChange}
        />,
      );

      // Should show first page, ellipsis, middle pages, ellipsis, last page
      expect(
        screen.getByRole("button", { name: "Pagina 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 4" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 5" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 6" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 10" }),
      ).toBeInTheDocument();

      // Two ellipses (one on each side) - target span elements with aria-hidden
      const ellipsisElements = container.querySelectorAll(
        'span[aria-hidden="true"]',
      );
      expect(ellipsisElements.length).toBe(2);
    });
  });

  describe("Sibling Count", () => {
    it("should respect siblingCount prop", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={5}
          totalPages={10}
          onPageChange={onPageChange}
          siblingCount={2}
        />,
      );

      // With siblingCount=2, we should see pages 3,4,5,6,7 around current page 5
      expect(
        screen.getByRole("button", { name: "Pagina 3" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 4" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 5" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 6" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pagina 7" }),
      ).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={onPageChange}
          className="custom-pagination"
        />,
      );

      expect(screen.getByRole("navigation")).toHaveClass("custom-pagination");
    });
  });
});

describe("PaginationInfo", () => {
  it("should render pagination info text", () => {
    render(<PaginationInfo currentPage={1} pageSize={10} totalItems={100} />);

    expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should calculate correct start and end values", () => {
    render(<PaginationInfo currentPage={2} pageSize={10} totalItems={100} />);

    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("should handle last page with partial results", () => {
    const { container } = render(
      <PaginationInfo currentPage={3} pageSize={10} totalItems={25} />,
    );

    // Page 3 with pageSize 10 would normally show 21-30, but total is 25
    // Check that the text contains both 21 and 25
    expect(container.textContent).toContain("21");
    expect(container.textContent).toContain("25");
  });

  it("should accept custom className", () => {
    const { container } = render(
      <PaginationInfo
        currentPage={1}
        pageSize={10}
        totalItems={100}
        className="custom-info"
      />,
    );

    expect(container.firstChild).toHaveClass("custom-info");
  });

  it("should display correct format for single item", () => {
    const { container } = render(
      <PaginationInfo currentPage={1} pageSize={10} totalItems={1} />,
    );

    // Should show "1" in multiple places (start, end, total)
    const spans = container.querySelectorAll("span.font-medium");
    expect(spans.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("1");
  });

  it("should handle first page correctly", () => {
    render(<PaginationInfo currentPage={1} pageSize={20} totalItems={50} />);

    // First page should start at 1
    const spans = screen.getAllByText("1");
    expect(spans.length).toBeGreaterThan(0);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });
});
