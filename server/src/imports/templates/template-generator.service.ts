import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ImportModule } from '../dto/import-file.dto';

/**
 * Column definition for template generation.
 */
interface TemplateColumn {
  header: string;
  description: string;
  required: boolean;
  validValues?: string;
  example1: string;
  example2: string;
}

/**
 * TemplateGeneratorService creates downloadable Excel templates
 * with example data and instructions for each import module.
 */
@Injectable()
export class TemplateGeneratorService {
  private readonly logger = new Logger(TemplateGeneratorService.name);

  /**
   * Generates an Excel template file for the specified module.
   *
   * The workbook contains two sheets:
   * - "Datos": Headers with 2 example rows of realistic Colombian data
   * - "Instrucciones": Column descriptions, required/optional status, and valid enum values
   *
   * @param module - The import module to generate a template for
   * @returns Buffer containing the XLSX file
   */
  generateTemplate(module: ImportModule): Buffer {
    this.logger.log(`Generating import template for module: ${module}`);

    const columns = this.getColumnsForModule(module);
    const workbook = XLSX.utils.book_new();

    // --- Sheet 1: Datos ---
    const dataHeaders = columns.map((col) => col.header);
    const dataRow1 = columns.map((col) => col.example1);
    const dataRow2 = columns.map((col) => col.example2);

    const dataSheet = XLSX.utils.aoa_to_sheet([
      dataHeaders,
      dataRow1,
      dataRow2,
    ]);

    // Auto-size columns based on content
    const colWidths = dataHeaders.map((header, idx) => {
      const maxLen = Math.max(
        header.length,
        (dataRow1[idx] ?? '').length,
        (dataRow2[idx] ?? '').length,
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
    });
    dataSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Datos');

    // --- Sheet 2: Instrucciones ---
    const instructionRows: string[][] = [
      ['Columna', 'Descripcion', 'Obligatorio', 'Valores validos'],
    ];

    for (const col of columns) {
      instructionRows.push([
        col.header,
        col.description,
        col.required ? 'Si' : 'No',
        col.validValues ?? '',
      ]);
    }

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);

    // Auto-size instruction columns
    instructionSheet['!cols'] = [
      { wch: 22 },
      { wch: 55 },
      { wch: 12 },
      { wch: 45 },
    ];

    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instrucciones');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    this.logger.log(`Template generated for ${module}: ${buffer.length} bytes`);

    return buffer;
  }

  /**
   * Returns the column definitions for the specified module.
   */
  private getColumnsForModule(module: ImportModule): TemplateColumn[] {
    switch (module) {
      case ImportModule.PRODUCTS:
        return this.getProductColumns();
      case ImportModule.CUSTOMERS:
        return this.getCustomerColumns();
      case ImportModule.SUPPLIERS:
        return this.getSupplierColumns();
    }
  }

  private getProductColumns(): TemplateColumn[] {
    return [
      {
        header: 'nombre',
        description: 'Nombre del producto (minimo 2 caracteres)',
        required: true,
        example1: 'Audifonos Bluetooth Sony WH-1000XM5',
        example2: 'Cargador USB-C 65W Samsung',
      },
      {
        header: 'precio_costo',
        description: 'Precio de compra/costo (numero >= 0)',
        required: true,
        example1: '450000',
        example2: '85000',
      },
      {
        header: 'precio_venta',
        description: 'Precio de venta al publico (numero >= 0)',
        required: true,
        example1: '650000',
        example2: '129900',
      },
      {
        header: 'sku',
        description:
          'Codigo unico del producto. Se genera automaticamente si no se proporciona.',
        required: false,
        example1: 'AUD-SONY-001',
        example2: 'CARG-SAM-002',
      },
      {
        header: 'descripcion',
        description: 'Descripcion detallada del producto',
        required: false,
        example1:
          'Audifonos inalambricos con cancelacion de ruido, 30h bateria',
        example2: 'Cargador rapido compatible con Galaxy S24 y tablets',
      },
      {
        header: 'categoria_impuesto',
        description: 'Categoria de impuesto para facturacion DIAN',
        required: false,
        validValues: 'GRAVADO_19, GRAVADO_5, EXENTO, EXCLUIDO',
        example1: 'GRAVADO_19',
        example2: 'GRAVADO_19',
      },
      {
        header: 'unidad',
        description:
          'Unidad de medida (UND, KG, LT, MT, etc.). Por defecto: UND',
        required: false,
        example1: 'UND',
        example2: 'UND',
      },
      {
        header: 'inventario',
        description:
          'Cantidad en inventario (numero entero >= 0). Por defecto: 0',
        required: false,
        example1: '50',
        example2: '200',
      },
      {
        header: 'stock_minimo',
        description:
          'Nivel minimo de stock para alertas (numero entero >= 0). Por defecto: 0',
        required: false,
        example1: '10',
        example2: '25',
      },
      {
        header: 'codigo_barras',
        description: 'Codigo de barras EAN/UPC (unico por producto)',
        required: false,
        example1: '7702354008529',
        example2: '8806094729412',
      },
      {
        header: 'marca',
        description: 'Marca o fabricante del producto',
        required: false,
        example1: 'Sony',
        example2: 'Samsung',
      },
    ];
  }

  private getCustomerColumns(): TemplateColumn[] {
    return [
      {
        header: 'nombre',
        description: 'Nombre del cliente (2-100 caracteres)',
        required: true,
        example1: 'Juan Carlos Perez Martinez',
        example2: 'Almacenes El Bodegon S.A.S.',
      },
      {
        header: 'tipo_documento',
        description: 'Tipo de documento de identidad',
        required: true,
        validValues: 'CC, NIT, RUT, PASSPORT, CE, DNI, OTHER',
        example1: 'CC',
        example2: 'NIT',
      },
      {
        header: 'numero_documento',
        description: 'Numero del documento (5-20 caracteres)',
        required: true,
        example1: '1030567890',
        example2: '900456789-3',
      },
      {
        header: 'correo',
        description: 'Correo electronico del cliente',
        required: false,
        example1: 'juancarlos@gmail.com',
        example2: 'ventas@elbodegon.com.co',
      },
      {
        header: 'telefono',
        description: 'Numero de telefono (7-20 caracteres)',
        required: false,
        example1: '+57 300 123 4567',
        example2: '+57 601 234 5678',
      },
      {
        header: 'direccion',
        description: 'Direccion fisica (max 200 caracteres)',
        required: false,
        example1: 'Calle 123 #45-67, Barrio La Candelaria',
        example2: 'Carrera 7 #12-34, Centro Comercial Plaza',
      },
      {
        header: 'ciudad',
        description: 'Ciudad (max 100 caracteres)',
        required: false,
        example1: 'Bogota',
        example2: 'Medellin',
      },
      {
        header: 'notas',
        description: 'Notas adicionales (max 500 caracteres)',
        required: false,
        example1: 'Cliente frecuente, descuento del 10%',
        example2: 'Facturar a nombre de la empresa',
      },
    ];
  }

  private getSupplierColumns(): TemplateColumn[] {
    return [
      {
        header: 'nombre',
        description: 'Nombre del proveedor (2-100 caracteres)',
        required: true,
        example1: 'Distribuidora Nacional S.A.S.',
        example2: 'Importaciones Tech Colombia Ltda.',
      },
      {
        header: 'tipo_documento',
        description: 'Tipo de documento de identidad',
        required: true,
        validValues: 'CC, NIT, RUT, PASSPORT, CE, DNI, OTHER',
        example1: 'NIT',
        example2: 'NIT',
      },
      {
        header: 'numero_documento',
        description: 'Numero del documento (5-20 caracteres)',
        required: true,
        example1: '800123456-7',
        example2: '900789012-1',
      },
      {
        header: 'correo',
        description: 'Correo electronico del proveedor',
        required: false,
        example1: 'ventas@distribuidora-nacional.com',
        example2: 'pedidos@importech.co',
      },
      {
        header: 'telefono',
        description: 'Numero de telefono (7-20 caracteres)',
        required: false,
        example1: '+57 601 345 6789',
        example2: '+57 604 567 8901',
      },
      {
        header: 'direccion',
        description: 'Direccion fisica (max 200 caracteres)',
        required: false,
        example1: 'Zona Industrial Montevideo, Bodega 15',
        example2: 'Carrera 50 #80-12, Zona Franca',
      },
      {
        header: 'ciudad',
        description: 'Ciudad (max 100 caracteres)',
        required: false,
        example1: 'Bogota',
        example2: 'Barranquilla',
      },
      {
        header: 'notas',
        description: 'Notas adicionales (max 500 caracteres)',
        required: false,
        example1: 'Proveedor principal de electronica',
        example2: 'Entrega directa en bodega',
      },
      {
        header: 'terminos_pago',
        description: 'Terminos de pago del proveedor. Por defecto: NET_30',
        required: false,
        validValues: 'IMMEDIATE, NET_15, NET_30, NET_60',
        example1: 'NET_30',
        example2: 'NET_60',
      },
      {
        header: 'nombre_contacto',
        description: 'Nombre de la persona de contacto (max 100 caracteres)',
        required: false,
        example1: 'Carlos Rodriguez',
        example2: 'Maria Fernanda Lopez',
      },
      {
        header: 'telefono_contacto',
        description: 'Telefono de la persona de contacto (max 20 caracteres)',
        required: false,
        example1: '+57 310 987 6543',
        example2: '+57 315 654 3210',
      },
    ];
  }
}
