import { Injectable } from '@nestjs/common';
import { ImportValidator } from './import-validator.interface';

const VALID_TAX_CATEGORIES = [
  'GRAVADO_19',
  'GRAVADO_5',
  'EXENTO',
  'EXCLUIDO',
];

/**
 * ProductImportValidator handles validation and mapping of product import rows.
 *
 * Required fields: nombre, precio_costo, precio_venta
 * Optional fields: sku, descripcion, categoria_impuesto, unidad, inventario,
 *                  stock_minimo, codigo_barras, marca
 */
@Injectable()
export class ProductImportValidator implements ImportValidator {
  getRequiredColumns(): string[] {
    return ['nombre', 'precio_costo', 'precio_venta'];
  }

  getOptionalColumns(): string[] {
    return [
      'sku',
      'descripcion',
      'categoria_impuesto',
      'unidad',
      'inventario',
      'stock_minimo',
      'codigo_barras',
      'marca',
    ];
  }

  getHeaderAliases(): Record<string, string[]> {
    return {
      nombre: ['name', 'producto', 'nombre_producto', 'product_name'],
      precio_costo: ['cost_price', 'costo', 'precio_compra', 'cost'],
      precio_venta: ['sale_price', 'venta', 'precio', 'price'],
      sku: ['codigo', 'code', 'referencia', 'ref'],
      descripcion: ['description', 'detalle', 'detail'],
      categoria_impuesto: [
        'tax_category',
        'impuesto',
        'tax',
        'iva',
        'tipo_impuesto',
      ],
      unidad: ['unit', 'medida', 'unit_of_measure', 'uom'],
      inventario: ['stock', 'cantidad', 'quantity', 'inventory'],
      stock_minimo: ['min_stock', 'minimo', 'minimum_stock'],
      codigo_barras: ['barcode', 'ean', 'upc', 'codigo_barra'],
      marca: ['brand', 'fabricante', 'manufacturer'],
    };
  }

  validateRow(
    row: Record<string, string>,
    rowIndex: number,
  ): { data: Record<string, unknown>; errors: string[] } {
    const errors: string[] = [];
    const data: Record<string, unknown> = {};

    // --- Required: nombre -> name ---
    const nombre = row['nombre']?.trim();
    if (!nombre || nombre.length < 2) {
      errors.push(
        `Fila ${rowIndex}: El nombre es obligatorio y debe tener al menos 2 caracteres`,
      );
    } else {
      data.name = nombre;
    }

    // --- Required: precio_costo -> costPrice ---
    const costoParsed = this.parseNumeric(row['precio_costo']);
    if (costoParsed === null || costoParsed < 0) {
      errors.push(
        `Fila ${rowIndex}: El precio de costo es obligatorio y debe ser un numero mayor o igual a 0`,
      );
    } else {
      data.costPrice = costoParsed;
    }

    // --- Required: precio_venta -> salePrice ---
    const ventaParsed = this.parseNumeric(row['precio_venta']);
    if (ventaParsed === null || ventaParsed < 0) {
      errors.push(
        `Fila ${rowIndex}: El precio de venta es obligatorio y debe ser un numero mayor o igual a 0`,
      );
    } else {
      data.salePrice = ventaParsed;
    }

    // --- Optional: sku ---
    const sku = row['sku']?.trim();
    if (sku) {
      data.sku = sku;
    }

    // --- Optional: descripcion -> description ---
    const descripcion = row['descripcion']?.trim();
    if (descripcion) {
      data.description = descripcion;
    }

    // --- Optional: categoria_impuesto -> taxCategory ---
    const taxCat = row['categoria_impuesto']?.trim().toUpperCase();
    if (taxCat) {
      if (!VALID_TAX_CATEGORIES.includes(taxCat)) {
        errors.push(
          `Fila ${rowIndex}: La categoria de impuesto debe ser GRAVADO_19, GRAVADO_5, EXENTO o EXCLUIDO`,
        );
      } else {
        data.taxCategory = taxCat;
      }
    }

    // --- Optional: unidad -> unit ---
    const unidad = row['unidad']?.trim();
    if (unidad) {
      data.unit = unidad;
    }

    // --- Optional: inventario -> stock ---
    const inventarioRaw = row['inventario']?.trim();
    if (inventarioRaw) {
      const inventario = this.parseInteger(inventarioRaw);
      if (inventario === null || inventario < 0) {
        errors.push(
          `Fila ${rowIndex}: El inventario debe ser un numero entero mayor o igual a 0`,
        );
      } else {
        data.stock = inventario;
      }
    }

    // --- Optional: stock_minimo -> minStock ---
    const minStockRaw = row['stock_minimo']?.trim();
    if (minStockRaw) {
      const minStock = this.parseInteger(minStockRaw);
      if (minStock === null || minStock < 0) {
        errors.push(
          `Fila ${rowIndex}: El stock minimo debe ser un numero entero mayor o igual a 0`,
        );
      } else {
        data.minStock = minStock;
      }
    }

    // --- Optional: codigo_barras -> barcode ---
    const barcode = row['codigo_barras']?.trim();
    if (barcode) {
      data.barcode = barcode;
    }

    // --- Optional: marca -> brand ---
    const marca = row['marca']?.trim();
    if (marca) {
      data.brand = marca;
    }

    return { data, errors };
  }

  /**
   * Parses a string into a numeric value, handling comma as decimal separator.
   */
  private parseNumeric(value: string | undefined): number | null {
    if (!value || value.trim() === '') return null;
    const normalized = value.trim().replace(/,/g, '.');
    const num = Number(normalized);
    return isNaN(num) ? null : num;
  }

  /**
   * Parses a string into an integer value.
   */
  private parseInteger(value: string): number | null {
    const normalized = value.trim().replace(/,/g, '.');
    const num = Number(normalized);
    if (isNaN(num)) return null;
    const int = Math.floor(num);
    return int;
  }
}
