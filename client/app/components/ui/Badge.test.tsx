import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge, StatusBadge, CountBadge } from "./Badge";

describe("Badge", () => {
  describe("Basic Rendering", () => {
    it("should render badge with text content", () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("should render as a span element", () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.tagName).toBe("SPAN");
    });

    it("should have default styling classes", () => {
      render(<Badge data-testid="badge">Content</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("rounded-full");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("font-medium");
    });
  });

  describe("Variants", () => {
    it("should apply default variant styles", () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-neutral-100");
      expect(badge).toHaveClass("text-neutral-800");
    });

    it("should apply primary variant styles", () => {
      render(
        <Badge data-testid="badge" variant="primary">
          Primary
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-primary-100");
      expect(badge).toHaveClass("text-primary-700");
    });

    it("should apply secondary variant styles", () => {
      render(
        <Badge data-testid="badge" variant="secondary">
          Secondary
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-neutral-100");
      expect(badge).toHaveClass("text-neutral-600");
    });

    it("should apply success variant styles", () => {
      render(
        <Badge data-testid="badge" variant="success">
          Success
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-success-100");
      expect(badge).toHaveClass("text-success-700");
    });

    it("should apply warning variant styles", () => {
      render(
        <Badge data-testid="badge" variant="warning">
          Warning
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-warning-100");
      expect(badge).toHaveClass("text-warning-700");
    });

    it("should apply error variant styles", () => {
      render(
        <Badge data-testid="badge" variant="error">
          Error
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("bg-error-100");
      expect(badge).toHaveClass("text-error-700");
    });

    it("should apply outline variant styles", () => {
      render(
        <Badge data-testid="badge" variant="outline">
          Outline
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("border");
      expect(badge).toHaveClass("border-neutral-200");
    });
  });

  describe("Sizes", () => {
    it("should apply small size styles", () => {
      render(
        <Badge data-testid="badge" size="sm">
          Small
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("px-2");
      expect(badge).toHaveClass("py-0.5");
      expect(badge).toHaveClass("text-xs");
    });

    it("should apply medium size styles (default)", () => {
      render(
        <Badge data-testid="badge" size="md">
          Medium
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("px-2.5");
      expect(badge).toHaveClass("py-1");
    });

    it("should apply large size styles", () => {
      render(
        <Badge data-testid="badge" size="lg">
          Large
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("px-3");
      expect(badge).toHaveClass("py-1.5");
      expect(badge).toHaveClass("text-sm");
    });
  });

  describe("Dot", () => {
    it("should render dot when dot prop is true", () => {
      const { container } = render(<Badge dot>With Dot</Badge>);

      // The dot is a span inside the badge
      const dots = container.querySelectorAll("span span");
      expect(dots.length).toBeGreaterThan(0);
    });

    it("should apply dot styles", () => {
      render(
        <Badge dot data-testid="badge">
          With Dot
        </Badge>,
      );

      const badge = screen.getByTestId("badge");
      const dot = badge.querySelector("span");
      expect(dot).toHaveClass("rounded-full");
      expect(dot).toHaveClass("h-1.5");
      expect(dot).toHaveClass("w-1.5");
    });

    it("should apply custom dot color", () => {
      render(
        <Badge dot dotColor="bg-red-500" data-testid="badge">
          Custom Dot
        </Badge>,
      );

      const badge = screen.getByTestId("badge");
      const dot = badge.querySelector("span");
      expect(dot).toHaveClass("bg-red-500");
    });

    it("should not render dot when dot prop is false or not provided", () => {
      render(<Badge data-testid="badge">No Dot</Badge>);

      const badge = screen.getByTestId("badge");
      // Should only have the text, no nested span for dot
      expect(badge.childElementCount).toBe(0);
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(
        <Badge data-testid="badge" className="custom-class">
          Custom
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("custom-class");
    });

    it("should merge custom className with default classes", () => {
      render(
        <Badge data-testid="badge" className="ml-2">
          Custom
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("ml-2");
      expect(badge).toHaveClass("inline-flex");
    });
  });
});

describe("StatusBadge", () => {
  describe("ACTIVE Status", () => {
    it("should render with success variant and correct label", () => {
      render(<StatusBadge status="ACTIVE" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Activo")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-success-100");
      expect(badge).toHaveClass("text-success-700");
    });
  });

  describe("INACTIVE Status", () => {
    it("should render with secondary variant and correct label", () => {
      render(<StatusBadge status="INACTIVE" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-neutral-100");
      expect(badge).toHaveClass("text-neutral-600");
    });
  });

  describe("DISCONTINUED Status", () => {
    it("should render with error variant and correct label", () => {
      render(<StatusBadge status="DISCONTINUED" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Descontinuado")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-error-100");
      expect(badge).toHaveClass("text-error-700");
    });
  });

  describe("PAID Status", () => {
    it("should render with success variant and correct label", () => {
      render(<StatusBadge status="PAID" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Pagada")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-success-100");
    });
  });

  describe("PENDING Status", () => {
    it("should render with warning variant and correct label", () => {
      render(<StatusBadge status="PENDING" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Pendiente")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-warning-100");
      expect(badge).toHaveClass("text-warning-700");
    });
  });

  describe("OVERDUE Status", () => {
    it("should render with error variant and correct label", () => {
      render(<StatusBadge status="OVERDUE" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Vencida")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-error-100");
    });
  });

  describe("CANCELLED Status", () => {
    it("should render with secondary variant and correct label", () => {
      render(<StatusBadge status="CANCELLED" data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      expect(screen.getByText("Cancelada")).toBeInTheDocument();
      expect(badge).toHaveClass("bg-neutral-100");
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(
        <StatusBadge
          status="ACTIVE"
          data-testid="badge"
          className="custom-status"
        />,
      );
      const badge = screen.getByTestId("badge");
      expect(badge).toHaveClass("custom-status");
    });
  });

  describe("Unknown Status", () => {
    it("should fallback to default variant and use status as label for unknown status", () => {
      // Test the fallback branch when status is not in statusConfig
      const unknownStatus = "UNKNOWN_STATUS" as "ACTIVE";
      render(<StatusBadge status={unknownStatus} data-testid="badge" />);
      const badge = screen.getByTestId("badge");

      // Should display the raw status value as the label
      expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
      // Should apply default variant styles
      expect(badge).toHaveClass("bg-neutral-100");
      expect(badge).toHaveClass("text-neutral-800");
    });
  });

  describe("showDot prop", () => {
    it("should hide dot when showDot is false", () => {
      render(
        <StatusBadge status="ACTIVE" showDot={false} data-testid="badge" />,
      );
      const badge = screen.getByTestId("badge");

      // Badge should render but without dot (no nested span for dot)
      expect(screen.getByText("Activo")).toBeInTheDocument();
      expect(badge.childElementCount).toBe(0);
    });
  });
});

describe("Badge Removable", () => {
  it("should render remove button when removable is true", () => {
    render(
      <Badge removable data-testid="badge">
        Removable
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("should call onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <Badge removable onRemove={onRemove} data-testid="badge">
        Removable
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    fireEvent.click(button!);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("should stop propagation when remove button is clicked", () => {
    const onBadgeClick = vi.fn();
    const onRemove = vi.fn();

    render(
      <div onClick={onBadgeClick}>
        <Badge removable onRemove={onRemove} data-testid="badge">
          Removable
        </Badge>
      </div>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    fireEvent.click(button!);

    expect(onRemove).toHaveBeenCalledTimes(1);
    // Event propagation should be stopped, so parent onClick should not be called
    expect(onBadgeClick).not.toHaveBeenCalled();
  });

  it("should render remove button with correct size for xs", () => {
    render(
      <Badge removable size="xs" data-testid="badge">
        Small
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    expect(button).toHaveClass("ml-0.5");
  });

  it("should render remove button with correct size for sm", () => {
    render(
      <Badge removable size="sm" data-testid="badge">
        Small
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    expect(button).toHaveClass("ml-1");
  });

  it("should render remove button with correct size for lg", () => {
    render(
      <Badge removable size="lg" data-testid="badge">
        Large
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");
    expect(button).toHaveClass("ml-1.5");
  });

  it("should not call onRemove if not provided", () => {
    render(
      <Badge removable data-testid="badge">
        Removable
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const button = badge.querySelector("button");

    // Should not throw when clicking without onRemove handler
    expect(() => fireEvent.click(button!)).not.toThrow();
  });
});

describe("Badge Icon", () => {
  it("should render icon when provided", () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(
      <Badge icon={<TestIcon />} data-testid="badge">
        With Icon
      </Badge>,
    );

    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("should apply correct icon spacing for xs size", () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(
      <Badge icon={<TestIcon />} size="xs" data-testid="badge">
        XS Icon
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const iconWrapper = badge.querySelector("span");
    expect(iconWrapper).toHaveClass("mr-0.5");
  });

  it("should apply correct icon spacing for sm size", () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(
      <Badge icon={<TestIcon />} size="sm" data-testid="badge">
        SM Icon
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const iconWrapper = badge.querySelector("span");
    expect(iconWrapper).toHaveClass("mr-1");
  });

  it("should apply correct icon spacing for lg size", () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(
      <Badge icon={<TestIcon />} size="lg" data-testid="badge">
        LG Icon
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const iconWrapper = badge.querySelector("span");
    expect(iconWrapper).toHaveClass("mr-1.5");
  });
});

describe("Badge Dot Sizes", () => {
  it("should apply correct dot size for xs", () => {
    render(
      <Badge dot size="xs" data-testid="badge">
        XS Dot
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const dot = badge.querySelector("span");
    expect(dot).toHaveClass("h-1");
    expect(dot).toHaveClass("w-1");
  });

  it("should apply correct dot size for lg", () => {
    render(
      <Badge dot size="lg" data-testid="badge">
        LG Dot
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    const dot = badge.querySelector("span");
    expect(dot).toHaveClass("h-2");
    expect(dot).toHaveClass("w-2");
  });
});

describe("Badge Pill Variants", () => {
  it("should not be pill when pill is false", () => {
    render(
      <Badge pill={false} data-testid="badge">
        Not Pill
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).not.toHaveClass("rounded-full");
  });
});

describe("Badge Additional Variants", () => {
  it("should apply outline-primary variant", () => {
    render(
      <Badge variant="outline-primary" data-testid="badge">
        Outline Primary
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("border-primary-300");
    expect(badge).toHaveClass("text-primary-600");
  });

  it("should apply outline-success variant", () => {
    render(
      <Badge variant="outline-success" data-testid="badge">
        Outline Success
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("border-success-300");
  });

  it("should apply outline-warning variant", () => {
    render(
      <Badge variant="outline-warning" data-testid="badge">
        Outline Warning
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("border-warning-300");
  });

  it("should apply outline-error variant", () => {
    render(
      <Badge variant="outline-error" data-testid="badge">
        Outline Error
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("border-error-300");
  });

  it("should apply gradient variant", () => {
    render(
      <Badge variant="gradient" data-testid="badge">
        Gradient
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-gradient-to-r");
    expect(badge).toHaveClass("text-white");
  });

  it("should apply gradient-success variant", () => {
    render(
      <Badge variant="gradient-success" data-testid="badge">
        Gradient Success
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-gradient-to-r");
  });

  it("should apply glass variant", () => {
    render(
      <Badge variant="glass" data-testid="badge">
        Glass
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("backdrop-blur-md");
  });

  it("should apply xs size", () => {
    render(
      <Badge size="xs" data-testid="badge">
        Extra Small
      </Badge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("px-1.5");
    expect(badge).toHaveClass("py-0.5");
    expect(badge).toHaveClass("text-[10px]");
  });
});

describe("CountBadge", () => {
  it("should render count value", () => {
    render(<CountBadge count={5} data-testid="badge" />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should show max+ when count exceeds max", () => {
    render(<CountBadge count={150} max={99} data-testid="badge" />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("should use default max of 99", () => {
    render(<CountBadge count={100} data-testid="badge" />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("should show exact count when equal to max", () => {
    render(<CountBadge count={99} data-testid="badge" />);

    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("should apply error variant by default", () => {
    render(<CountBadge count={5} data-testid="badge" />);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-error-100");
    expect(badge).toHaveClass("text-error-700");
  });

  it("should apply xs size by default", () => {
    render(<CountBadge count={5} data-testid="badge" />);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("px-1.5");
  });

  it("should allow custom variant", () => {
    render(<CountBadge count={5} variant="primary" data-testid="badge" />);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-primary-100");
  });

  it("should allow custom max value", () => {
    render(<CountBadge count={15} max={10} data-testid="badge" />);

    expect(screen.getByText("10+")).toBeInTheDocument();
  });

  it("should show 0 when count is zero", () => {
    render(<CountBadge count={0} data-testid="badge" />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("StatusBadge Additional Statuses", () => {
  it("should render OUT_OF_STOCK status", () => {
    render(<StatusBadge status="OUT_OF_STOCK" data-testid="badge" />);

    expect(screen.getByText("Sin stock")).toBeInTheDocument();
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-error-100");
  });

  it("should render LOW_STOCK status", () => {
    render(<StatusBadge status="LOW_STOCK" data-testid="badge" />);

    expect(screen.getByText("Stock bajo")).toBeInTheDocument();
  });

  it("should render DRAFT status", () => {
    render(<StatusBadge status="DRAFT" data-testid="badge" />);

    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("should render PROCESSING status", () => {
    render(<StatusBadge status="PROCESSING" data-testid="badge" />);

    expect(screen.getByText("Procesando")).toBeInTheDocument();
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-primary-100");
  });

  it("should render SHIPPED status", () => {
    render(<StatusBadge status="SHIPPED" data-testid="badge" />);

    expect(screen.getByText("Enviado")).toBeInTheDocument();
  });

  it("should render DELIVERED status", () => {
    render(<StatusBadge status="DELIVERED" data-testid="badge" />);

    expect(screen.getByText("Entregado")).toBeInTheDocument();
  });

  it("should render REFUNDED status", () => {
    render(<StatusBadge status="REFUNDED" data-testid="badge" />);

    expect(screen.getByText("Reembolsado")).toBeInTheDocument();
  });
});
