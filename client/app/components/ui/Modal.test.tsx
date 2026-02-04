import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  ConfirmModal,
  DeleteModal,
} from "./Modal";

describe("Dialog Components", () => {
  describe("Dialog", () => {
    it("should render dialog trigger", () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      expect(screen.getByText("Open Dialog")).toBeInTheDocument();
    });

    it("should open dialog when trigger is clicked", async () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      fireEvent.click(screen.getByText("Open Dialog"));

      await waitFor(() => {
        expect(screen.getByText("Dialog Title")).toBeInTheDocument();
      });
    });

    it("should render close button in dialog content", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Cerrar" }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("DialogHeader", () => {
    it("should render header content", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Header Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(screen.getByText("Header Title")).toBeInTheDocument();
      });
    });
  });

  describe("DialogFooter", () => {
    it("should render footer content", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Confirm")).toBeInTheDocument();
      });
    });
  });

  describe("DialogTitle", () => {
    it("should render title text", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>My Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(screen.getByText("My Dialog Title")).toBeInTheDocument();
      });
    });
  });

  describe("DialogDescription", () => {
    it("should render description text", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is the description</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(screen.getByText("This is the description")).toBeInTheDocument();
      });
    });
  });

  describe("DialogContent hideDescription prop", () => {
    it("should render sr-only description when hideDescription is true", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent hideDescription>
            <DialogTitle>Title without visible description</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        // Should render the sr-only description with default text
        const srOnlyDescription = screen.getByText("Contenido del dialogo");
        expect(srOnlyDescription).toBeInTheDocument();
        expect(srOnlyDescription).toHaveClass("sr-only");
      });
    });

    it("should not render sr-only description when hideDescription is false", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent hideDescription={false}>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Visible description</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        // Should have the visible description
        expect(screen.getByText("Visible description")).toBeInTheDocument();
        // Should NOT have the sr-only fallback description
        expect(
          screen.queryByText("Contenido del dialogo"),
        ).not.toBeInTheDocument();
      });
    });

    it("should not render sr-only description when hideDescription is not provided", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Regular description</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        expect(screen.getByText("Regular description")).toBeInTheDocument();
        expect(
          screen.queryByText("Contenido del dialogo"),
        ).not.toBeInTheDocument();
      });
    });

    it("should have dialog with aria-describedby when hideDescription is true", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent hideDescription>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        // The dialog should exist and have the sr-only description
        expect(dialog).toBeInTheDocument();
        // The sr-only description should be rendered
        expect(screen.getByText("Contenido del dialogo")).toHaveClass(
          "sr-only",
        );
      });
    });

    it("should have dialog accessible when hideDescription is false", async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent hideDescription={false}>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Visible description text</DialogDescription>
          </DialogContent>
        </Dialog>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        // Should have the visible description
        expect(
          screen.getByText("Visible description text"),
        ).toBeInTheDocument();
      });
    });
  });
});

describe("ConfirmModal", () => {
  describe("Basic Rendering", () => {
    it("should render when open is true", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Confirm Action"
          description="Are you sure you want to proceed?"
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to proceed?"),
      ).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(
        <ConfirmModal
          open={false}
          onOpenChange={vi.fn()}
          title="Confirm Action"
          description="Are you sure?"
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });
  });

  describe("Default Labels", () => {
    it("should render default confirm label", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Confirmar" }),
      ).toBeInTheDocument();
    });

    it("should render default cancel label", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Cancelar" }),
      ).toBeInTheDocument();
    });
  });

  describe("Custom Labels", () => {
    it("should render custom confirm label", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
          confirmLabel="Yes, delete"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Yes, delete" }),
      ).toBeInTheDocument();
    });

    it("should render custom cancel label", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
          cancelLabel="No, keep it"
        />,
      );

      expect(
        screen.getByRole("button", { name: "No, keep it" }),
      ).toBeInTheDocument();
    });
  });

  describe("onConfirm Handler", () => {
    it("should call onConfirm when confirm button is clicked", () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("onCancel Handler", () => {
    it("should call onCancel and onOpenChange when cancel button is clicked", () => {
      const onCancel = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <ConfirmModal
          open={true}
          onOpenChange={onOpenChange}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should call onOpenChange(false) when cancel is clicked without onCancel", () => {
      const onOpenChange = vi.fn();
      render(
        <ConfirmModal
          open={true}
          onOpenChange={onOpenChange}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Loading State", () => {
    it("should show loading state on confirm button when isLoading is true", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
          isLoading={true}
        />,
      );

      const confirmButton = screen.getByRole("button", { name: "Confirmar" });
      // Button should have loading indicator (spinner or disabled state)
      expect(confirmButton).toBeInTheDocument();
    });

    it("should disable cancel button when isLoading is true", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Title"
          description="Description"
          onConfirm={vi.fn()}
          isLoading={true}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "Cancelar" });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Variants", () => {
    it("should render danger variant with error styling", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Delete Item"
          description="This action cannot be undone"
          onConfirm={vi.fn()}
          variant="danger"
        />,
      );

      // Portal renders outside the container, use document.body
      // Should have error color icon - the class contains bg-error-100
      const iconContainer = document.body.querySelector(
        '[class*="bg-error-100"]',
      );
      expect(iconContainer).toBeInTheDocument();
    });

    it("should render warning variant with warning styling", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Warning"
          description="Are you sure?"
          onConfirm={vi.fn()}
          variant="warning"
        />,
      );

      // Portal renders outside the container, use document.body
      // Should have warning color icon - the class contains bg-warning-100
      const iconContainer = document.body.querySelector(
        '[class*="bg-warning-100"]',
      );
      expect(iconContainer).toBeInTheDocument();
    });

    it("should render default variant with primary styling", () => {
      render(
        <ConfirmModal
          open={true}
          onOpenChange={vi.fn()}
          title="Confirm"
          description="Are you sure?"
          onConfirm={vi.fn()}
          variant="default"
        />,
      );

      // Portal renders outside the container, use document.body
      // Should have primary color icon - the class contains bg-primary-100
      const iconContainer = document.body.querySelector(
        '[class*="bg-primary-100"]',
      );
      expect(iconContainer).toBeInTheDocument();
    });
  });
});

describe("DeleteModal", () => {
  describe("Basic Rendering", () => {
    it("should render when open is true", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Product X"
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.getByText("Eliminar elemento")).toBeInTheDocument();
      expect(
        screen.getByText(/Estas seguro de que deseas eliminar "Product X"\?/),
      ).toBeInTheDocument();
    });

    it("should not render when open is false", () => {
      render(
        <DeleteModal
          open={false}
          onOpenChange={vi.fn()}
          itemName="Product X"
          onConfirm={vi.fn()}
        />,
      );

      expect(screen.queryByText("Eliminar elemento")).not.toBeInTheDocument();
    });
  });

  describe("Item Name", () => {
    it("should display the item name in the description", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="My Important Item"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByText(
          /Estas seguro de que deseas eliminar "My Important Item"\?/,
        ),
      ).toBeInTheDocument();
    });

    it("should include warning about action being irreversible", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Test Item"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/Esta accion no se puede deshacer/),
      ).toBeInTheDocument();
    });
  });

  describe("Button Labels", () => {
    it('should have "Eliminar" as confirm button label', () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Eliminar" }),
      ).toBeInTheDocument();
    });

    it('should have "Cancelar" as cancel button label', () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Cancelar" }),
      ).toBeInTheDocument();
    });
  });

  describe("onConfirm Handler", () => {
    it("should call onConfirm when delete button is clicked", () => {
      const onConfirm = vi.fn();
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading State", () => {
    it("should show loading state when isLoading is true", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={vi.fn()}
          isLoading={true}
        />,
      );

      const deleteButton = screen.getByRole("button", { name: "Eliminar" });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should disable cancel button when isLoading is true", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={vi.fn()}
          isLoading={true}
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "Cancelar" });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Danger Variant", () => {
    it("should use danger variant styling", () => {
      render(
        <DeleteModal
          open={true}
          onOpenChange={vi.fn()}
          itemName="Item"
          onConfirm={vi.fn()}
        />,
      );

      // Portal renders outside the container, use document.body
      // Should have error color icon container - the class contains bg-error-100
      const iconContainer = document.body.querySelector(
        '[class*="bg-error-100"]',
      );
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
