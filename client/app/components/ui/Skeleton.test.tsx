import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonProductCard,
} from "./Skeleton";

describe("Skeleton", () => {
  describe("Basic Rendering", () => {
    it("should render a div element", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton.tagName).toBe("DIV");
    });

    it("should have animate-shimmer class", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("animate-shimmer");
    });

    it("should have gradient background classes", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("bg-gradient-to-r");
    });
  });

  describe("Variants", () => {
    it("should apply default variant (rounded-lg)", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("rounded-lg");
    });

    it("should apply circular variant (rounded-full)", () => {
      render(<Skeleton data-testid="skeleton" variant="circular" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("rounded-full");
    });

    it("should apply rounded variant (rounded-xl)", () => {
      render(<Skeleton data-testid="skeleton" variant="rounded" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("rounded-xl");
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(<Skeleton data-testid="skeleton" className="h-10 w-full" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-10");
      expect(skeleton).toHaveClass("w-full");
    });

    it("should merge with default classes", () => {
      render(<Skeleton data-testid="skeleton" className="h-10" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-10");
      expect(skeleton).toHaveClass("animate-shimmer");
    });
  });
});

describe("SkeletonText", () => {
  it("should render default 3 lines", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll('[class*="animate-shimmer"]');
    expect(lines.length).toBe(3);
  });

  it("should render specified number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll('[class*="animate-shimmer"]');
    expect(lines.length).toBe(5);
  });

  it("should render single line", () => {
    const { container } = render(<SkeletonText lines={1} />);
    const lines = container.querySelectorAll('[class*="animate-shimmer"]');
    expect(lines.length).toBe(1);
  });

  it("should make last line shorter when multiple lines", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('[class*="animate-shimmer"]');
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toHaveClass("w-3/4");
  });

  it("should accept custom className", () => {
    const { container } = render(<SkeletonText className="custom-text" />);
    expect(container.firstChild).toHaveClass("custom-text");
  });
});

describe("SkeletonCard", () => {
  it("should render card structure", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass("rounded-2xl");
    expect(container.firstChild).toHaveClass("border");
  });

  it("should contain skeleton elements", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('[class*="animate-shimmer"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should have circular avatar skeleton", () => {
    const { container } = render(<SkeletonCard />);
    const circular = container.querySelector(".rounded-full");
    expect(circular).toBeInTheDocument();
  });

  it("should accept custom className", () => {
    const { container } = render(<SkeletonCard className="custom-card" />);
    expect(container.firstChild).toHaveClass("custom-card");
  });
});

describe("SkeletonTableRow", () => {
  it("should render a table row", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    expect(row).toBeInTheDocument();
    expect(row?.tagName).toBe("TR");
  });

  it("should render default 5 columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    const cells = row?.querySelectorAll("td");
    expect(cells?.length).toBe(5);
  });

  it("should render specified number of columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow columns={3} />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    const cells = row?.querySelectorAll("td");
    expect(cells?.length).toBe(3);
  });

  it("should contain skeleton in each cell", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    const skeletons = row?.querySelectorAll('[class*="animate-shimmer"]');
    expect(skeletons?.length).toBe(5);
  });

  it("should have border styling", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    expect(row).toHaveClass("border-b");
  });

  it("should accept custom className", () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonTableRow className="custom-row" />
        </tbody>
      </table>,
    );

    const row = container.querySelector("tr");
    expect(row).toHaveClass("custom-row");
  });
});

describe("SkeletonTable", () => {
  it("should render a table structure", () => {
    const { container } = render(<SkeletonTable />);
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();
  });

  it("should render default 5 rows", () => {
    const { container } = render(<SkeletonTable />);
    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    expect(rows?.length).toBe(5);
  });

  it("should render specified number of rows", () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    expect(rows?.length).toBe(3);
  });

  it("should render default 5 columns", () => {
    const { container } = render(<SkeletonTable />);
    const thead = container.querySelector("thead");
    const headerCells = thead?.querySelectorAll("th");
    expect(headerCells?.length).toBe(5);
  });

  it("should render specified number of columns", () => {
    const { container } = render(<SkeletonTable columns={7} />);
    const thead = container.querySelector("thead");
    const headerCells = thead?.querySelectorAll("th");
    expect(headerCells?.length).toBe(7);
  });

  it("should have border and rounded styling", () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toHaveClass("rounded-2xl");
    expect(container.firstChild).toHaveClass("border");
  });

  it("should accept custom className", () => {
    const { container } = render(<SkeletonTable className="custom-table" />);
    expect(container.firstChild).toHaveClass("custom-table");
  });
});

describe("SkeletonProductCard", () => {
  it("should render product card structure", () => {
    const { container } = render(<SkeletonProductCard />);
    expect(container.firstChild).toHaveClass("rounded-2xl");
    expect(container.firstChild).toHaveClass("border");
  });

  it("should have image skeleton", () => {
    const { container } = render(<SkeletonProductCard />);
    const imageSkeleton = container.querySelector(".aspect-square");
    expect(imageSkeleton).toBeInTheDocument();
  });

  it("should have rounded image skeleton", () => {
    const { container } = render(<SkeletonProductCard />);
    const imageSkeleton = container.querySelector(".aspect-square");
    expect(imageSkeleton).toHaveClass("rounded-xl");
  });

  it("should contain multiple skeleton elements for product details", () => {
    const { container } = render(<SkeletonProductCard />);
    const skeletons = container.querySelectorAll('[class*="animate-shimmer"]');
    // Image, title, SKU, price, stock
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("should accept custom className", () => {
    const { container } = render(
      <SkeletonProductCard className="custom-product" />,
    );
    expect(container.firstChild).toHaveClass("custom-product");
  });

  it("should have price and stock section", () => {
    const { container } = render(<SkeletonProductCard />);
    // Should have a flex container for price and stock
    const flexContainer = container.querySelector(
      ".flex.items-center.justify-between",
    );
    expect(flexContainer).toBeInTheDocument();
  });
});
