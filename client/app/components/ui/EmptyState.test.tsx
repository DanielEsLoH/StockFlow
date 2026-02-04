import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState, InlineEmptyState } from "./EmptyState";
import { ShoppingCart } from "lucide-react";

describe("EmptyState", () => {
  describe("Default Type", () => {
    it("should render default empty state", () => {
      render(<EmptyState />);

      expect(screen.getByText("Sin datos")).toBeInTheDocument();
      expect(
        screen.getByText("No hay informacion disponible en este momento."),
      ).toBeInTheDocument();
    });

    it("should render default icon", () => {
      const { container } = render(<EmptyState />);

      // Should have an icon (SVG element)
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Products Type", () => {
    it("should render products empty state", () => {
      render(<EmptyState type="products" />);

      expect(screen.getByText("No hay productos")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Comienza agregando tu primer producto al inventario.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Search Type", () => {
    it("should render search empty state", () => {
      render(<EmptyState type="search" />);

      expect(screen.getByText("Sin resultados")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No encontramos productos que coincidan con tu busqueda. Intenta con otros terminos.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Error Type", () => {
    it("should render error empty state", () => {
      render(<EmptyState type="error" />);

      expect(screen.getByText("Error al cargar")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Hubo un problema al cargar los datos. Por favor, intenta de nuevo.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Custom Title", () => {
    it("should render custom title", () => {
      render(<EmptyState title="Custom Title" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should override default title", () => {
      render(<EmptyState type="products" title="No Products Found" />);

      expect(screen.getByText("No Products Found")).toBeInTheDocument();
      expect(screen.queryByText("No hay productos")).not.toBeInTheDocument();
    });
  });

  describe("Custom Description", () => {
    it("should render custom description", () => {
      render(<EmptyState description="Custom description text" />);

      expect(screen.getByText("Custom description text")).toBeInTheDocument();
    });

    it("should override default description", () => {
      render(
        <EmptyState
          type="products"
          description="Add your first product to get started"
        />,
      );

      expect(
        screen.getByText("Add your first product to get started"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          "Comienza agregando tu primer producto al inventario.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("Custom Icon", () => {
    it("should render custom icon", () => {
      render(<EmptyState icon={<ShoppingCart data-testid="custom-icon" />} />);

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("should override default icon", () => {
      const { container } = render(
        <EmptyState
          type="products"
          icon={<ShoppingCart data-testid="custom-icon" />}
        />,
      );

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      // Should only have one icon
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(1);
    });
  });

  describe("Action Button", () => {
    it("should render action button when provided", () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          action={{
            label: "Add Product",
            onClick,
          }}
        />,
      );

      expect(
        screen.getByRole("button", { name: /Add Product/i }),
      ).toBeInTheDocument();
    });

    it("should call onClick when action button is clicked", () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          action={{
            label: "Add Product",
            onClick,
          }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Add Product/i }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should render default Plus icon in action button", () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          action={{
            label: "Add Product",
            onClick,
          }}
        />,
      );

      const button = screen.getByRole("button", { name: /Add Product/i });
      const buttonSvg = button.querySelector("svg");
      expect(buttonSvg).toBeInTheDocument();
    });

    it("should render custom icon in action button", () => {
      const onClick = vi.fn();
      render(
        <EmptyState
          action={{
            label: "View Cart",
            onClick,
            icon: <ShoppingCart data-testid="action-icon" />,
          }}
        />,
      );

      expect(screen.getByTestId("action-icon")).toBeInTheDocument();
    });

    it("should not render action button when not provided", () => {
      render(<EmptyState />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      const { container } = render(
        <EmptyState className="custom-empty-state" />,
      );

      expect(container.firstChild).toHaveClass("custom-empty-state");
    });

    it("should merge with default classes", () => {
      const { container } = render(<EmptyState className="mt-10" />);

      expect(container.firstChild).toHaveClass("mt-10");
      expect(container.firstChild).toHaveClass("flex");
      expect(container.firstChild).toHaveClass("flex-col");
    });
  });

  describe("Layout", () => {
    it("should have centered content", () => {
      const { container } = render(<EmptyState />);

      expect(container.firstChild).toHaveClass("items-center");
      expect(container.firstChild).toHaveClass("justify-center");
      expect(container.firstChild).toHaveClass("text-center");
    });

    it("should have proper spacing", () => {
      const { container } = render(<EmptyState />);

      expect(container.firstChild).toHaveClass("py-16");
    });
  });
});

describe("InlineEmptyState", () => {
  describe("Default Message", () => {
    it("should render default message", () => {
      render(<InlineEmptyState />);

      expect(screen.getByText("No hay datos disponibles")).toBeInTheDocument();
    });
  });

  describe("Custom Message", () => {
    it("should render custom message", () => {
      render(<InlineEmptyState message="No items to display" />);

      expect(screen.getByText("No items to display")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have centered layout", () => {
      const { container } = render(<InlineEmptyState />);

      expect(container.firstChild).toHaveClass("flex");
      expect(container.firstChild).toHaveClass("items-center");
      expect(container.firstChild).toHaveClass("justify-center");
    });

    it("should have vertical padding", () => {
      const { container } = render(<InlineEmptyState />);

      expect(container.firstChild).toHaveClass("py-8");
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      const { container } = render(
        <InlineEmptyState className="custom-inline" />,
      );

      expect(container.firstChild).toHaveClass("custom-inline");
    });

    it("should merge with default classes", () => {
      const { container } = render(<InlineEmptyState className="border-t" />);

      expect(container.firstChild).toHaveClass("border-t");
      expect(container.firstChild).toHaveClass("flex");
    });
  });

  describe("Text Styling", () => {
    it("should have muted text color", () => {
      const { container } = render(<InlineEmptyState />);

      expect(container.firstChild).toHaveClass("text-neutral-500");
    });

    it("should have small text size", () => {
      const { container } = render(<InlineEmptyState />);

      expect(container.firstChild).toHaveClass("text-sm");
    });
  });
});
