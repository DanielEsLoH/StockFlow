import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./Table";

describe("Table Components", () => {
  describe("Table", () => {
    it("should render a table element", () => {
      render(
        <Table data-testid="table">
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const table = screen.getByTestId("table");
      expect(table.tagName).toBe("TABLE");
    });

    it("should apply default classes", () => {
      render(
        <Table data-testid="table">
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const table = screen.getByTestId("table");
      expect(table).toHaveClass("w-full");
      expect(table).toHaveClass("caption-bottom");
      expect(table).toHaveClass("text-sm");
    });

    it("should allow custom className", () => {
      render(
        <Table data-testid="table" className="custom-class">
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const table = screen.getByTestId("table");
      expect(table).toHaveClass("custom-class");
    });

    it("should wrap table in overflow container", () => {
      render(
        <Table data-testid="table">
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const table = screen.getByTestId("table");
      const wrapper = table.parentElement;
      expect(wrapper).toHaveClass("overflow-auto");
    });
  });

  describe("TableHeader", () => {
    it("should render a thead element", () => {
      render(
        <table>
          <TableHeader data-testid="thead">
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>,
      );

      const thead = screen.getByTestId("thead");
      expect(thead.tagName).toBe("THEAD");
    });

    it("should apply border styles to child rows", () => {
      render(
        <table>
          <TableHeader data-testid="thead">
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>,
      );

      const thead = screen.getByTestId("thead");
      expect(thead).toHaveClass("[&_tr]:border-b");
    });

    it("should allow custom className", () => {
      render(
        <table>
          <TableHeader data-testid="thead" className="custom-header">
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>,
      );

      const thead = screen.getByTestId("thead");
      expect(thead).toHaveClass("custom-header");
    });
  });

  describe("TableBody", () => {
    it("should render a tbody element", () => {
      render(
        <table>
          <TableBody data-testid="tbody">
            <tr>
              <td>Content</td>
            </tr>
          </TableBody>
        </table>,
      );

      const tbody = screen.getByTestId("tbody");
      expect(tbody.tagName).toBe("TBODY");
    });

    it("should remove border from last row", () => {
      render(
        <table>
          <TableBody data-testid="tbody">
            <tr>
              <td>Content</td>
            </tr>
          </TableBody>
        </table>,
      );

      const tbody = screen.getByTestId("tbody");
      expect(tbody).toHaveClass("[&_tr:last-child]:border-0");
    });

    it("should allow custom className", () => {
      render(
        <table>
          <TableBody data-testid="tbody" className="custom-body">
            <tr>
              <td>Content</td>
            </tr>
          </TableBody>
        </table>,
      );

      const tbody = screen.getByTestId("tbody");
      expect(tbody).toHaveClass("custom-body");
    });
  });

  describe("TableFooter", () => {
    it("should render a tfoot element", () => {
      render(
        <table>
          <TableFooter data-testid="tfoot">
            <tr>
              <td>Footer</td>
            </tr>
          </TableFooter>
        </table>,
      );

      const tfoot = screen.getByTestId("tfoot");
      expect(tfoot.tagName).toBe("TFOOT");
    });

    it("should apply footer styles", () => {
      render(
        <table>
          <TableFooter data-testid="tfoot">
            <tr>
              <td>Footer</td>
            </tr>
          </TableFooter>
        </table>,
      );

      const tfoot = screen.getByTestId("tfoot");
      expect(tfoot).toHaveClass("border-t");
      expect(tfoot).toHaveClass("font-medium");
    });
  });

  describe("TableRow", () => {
    it("should render a tr element", () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>,
      );

      const row = screen.getByTestId("row");
      expect(row.tagName).toBe("TR");
    });

    it("should apply hover and border styles", () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>,
      );

      const row = screen.getByTestId("row");
      expect(row).toHaveClass("border-b");
      expect(row).toHaveClass("transition-colors");
    });

    it("should allow custom className", () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid="row" className="selected-row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>,
      );

      const row = screen.getByTestId("row");
      expect(row).toHaveClass("selected-row");
    });
  });

  describe("TableHead", () => {
    it("should render a th element", () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="th">Header</TableHead>
            </tr>
          </thead>
        </table>,
      );

      const th = screen.getByTestId("th");
      expect(th.tagName).toBe("TH");
    });

    it("should have proper header styles", () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead data-testid="th">Header</TableHead>
            </tr>
          </thead>
        </table>,
      );

      const th = screen.getByTestId("th");
      expect(th).toHaveClass("h-12");
      expect(th).toHaveClass("px-4");
      expect(th).toHaveClass("text-left");
      expect(th).toHaveClass("font-medium");
    });

    it("should render header content", () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Product Name</TableHead>
            </tr>
          </thead>
        </table>,
      );

      expect(screen.getByText("Product Name")).toBeInTheDocument();
    });
  });

  describe("TableCell", () => {
    it("should render a td element", () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="td">Cell Content</TableCell>
            </tr>
          </tbody>
        </table>,
      );

      const td = screen.getByTestId("td");
      expect(td.tagName).toBe("TD");
    });

    it("should have proper cell styles", () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="td">Cell Content</TableCell>
            </tr>
          </tbody>
        </table>,
      );

      const td = screen.getByTestId("td");
      expect(td).toHaveClass("p-4");
      expect(td).toHaveClass("align-middle");
    });

    it("should render cell content", () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Test Value</TableCell>
            </tr>
          </tbody>
        </table>,
      );

      expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("should allow custom className", () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell data-testid="td" className="text-right">
                $100
              </TableCell>
            </tr>
          </tbody>
        </table>,
      );

      const td = screen.getByTestId("td");
      expect(td).toHaveClass("text-right");
    });
  });

  describe("TableCaption", () => {
    it("should render a caption element", () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Table Caption</TableCaption>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const caption = screen.getByTestId("caption");
      expect(caption.tagName).toBe("CAPTION");
    });

    it("should have proper caption styles", () => {
      render(
        <Table>
          <TableCaption data-testid="caption">Table Caption</TableCaption>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      const caption = screen.getByTestId("caption");
      expect(caption).toHaveClass("mt-4");
      expect(caption).toHaveClass("text-sm");
    });

    it("should render caption content", () => {
      render(
        <Table>
          <TableCaption>A list of products</TableCaption>
          <tbody>
            <tr>
              <td>Content</td>
            </tr>
          </tbody>
        </Table>,
      );

      expect(screen.getByText("A list of products")).toBeInTheDocument();
    });
  });

  describe("Complete Table", () => {
    it("should render a complete table with all components", () => {
      render(
        <Table>
          <TableCaption>Products List</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>iPhone</TableCell>
              <TableCell>$999</TableCell>
              <TableCell>50</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>MacBook</TableCell>
              <TableCell>$1999</TableCell>
              <TableCell>25</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell>75</TableCell>
            </TableRow>
          </TableFooter>
        </Table>,
      );

      expect(screen.getByText("Products List")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Price")).toBeInTheDocument();
      expect(screen.getByText("Stock")).toBeInTheDocument();
      expect(screen.getByText("iPhone")).toBeInTheDocument();
      expect(screen.getByText("MacBook")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("should have proper accessibility structure", () => {
      render(
        <Table aria-label="Products table">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>iPhone</TableCell>
              <TableCell>$999</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute("aria-label", "Products table");

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders).toHaveLength(2);
    });
  });
});
