import { Injectable } from '@nestjs/common';
import { ImportValidator } from './import-validator.interface';

const VALID_DOCUMENT_TYPES = [
  'CC',
  'NIT',
  'RUT',
  'PASSPORT',
  'CE',
  'DNI',
  'OTHER',
];

/**
 * CustomerImportValidator handles validation and mapping of customer import rows.
 *
 * Required fields: nombre, tipo_documento, numero_documento
 * Optional fields: correo, telefono, direccion, ciudad, notas
 */
@Injectable()
export class CustomerImportValidator implements ImportValidator {
  getRequiredColumns(): string[] {
    return ['nombre', 'tipo_documento', 'numero_documento'];
  }

  getOptionalColumns(): string[] {
    return ['correo', 'telefono', 'direccion', 'ciudad', 'notas'];
  }

  getHeaderAliases(): Record<string, string[]> {
    return {
      nombre: ['name', 'cliente', 'nombre_cliente', 'customer_name'],
      tipo_documento: ['document_type', 'tipo_doc', 'doc_type'],
      numero_documento: [
        'document_number',
        'numero_doc',
        'doc_number',
        'documento',
        'nit',
        'cedula',
      ],
      correo: ['email', 'e-mail', 'correo_electronico', 'mail'],
      telefono: ['phone', 'tel', 'celular', 'mobile', 'phone_number'],
      direccion: ['address', 'dir', 'domicilio'],
      ciudad: ['city', 'municipio', 'localidad'],
      notas: ['notes', 'observaciones', 'comentarios', 'comments'],
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
    } else if (nombre.length > 100) {
      errors.push(
        `Fila ${rowIndex}: El nombre no puede exceder 100 caracteres`,
      );
    } else {
      data.name = nombre;
    }

    // --- Required: tipo_documento -> documentType ---
    const tipoDoc = row['tipo_documento']?.trim().toUpperCase();
    if (!tipoDoc) {
      errors.push(`Fila ${rowIndex}: El tipo de documento es obligatorio`);
    } else if (!VALID_DOCUMENT_TYPES.includes(tipoDoc)) {
      errors.push(
        `Fila ${rowIndex}: El tipo de documento debe ser CC, NIT, RUT, PASSPORT, CE, DNI u OTHER`,
      );
    } else {
      data.documentType = tipoDoc;
    }

    // --- Required: numero_documento -> documentNumber ---
    const numDoc = row['numero_documento']?.trim();
    if (!numDoc || numDoc.length < 5) {
      errors.push(
        `Fila ${rowIndex}: El numero de documento es obligatorio y debe tener al menos 5 caracteres`,
      );
    } else if (numDoc.length > 20) {
      errors.push(
        `Fila ${rowIndex}: El numero de documento no puede exceder 20 caracteres`,
      );
    } else {
      data.documentNumber = numDoc;
    }

    // --- Optional: correo -> email ---
    const correo = row['correo']?.trim();
    if (correo) {
      if (!this.isValidEmail(correo)) {
        errors.push(`Fila ${rowIndex}: El correo electronico no es valido`);
      } else {
        data.email = correo;
      }
    }

    // --- Optional: telefono -> phone ---
    const telefono = row['telefono']?.trim();
    if (telefono) {
      if (telefono.length < 7) {
        errors.push(
          `Fila ${rowIndex}: El telefono debe tener al menos 7 caracteres`,
        );
      } else if (telefono.length > 20) {
        errors.push(
          `Fila ${rowIndex}: El telefono no puede exceder 20 caracteres`,
        );
      } else {
        data.phone = telefono;
      }
    }

    // --- Optional: direccion -> address ---
    const direccion = row['direccion']?.trim();
    if (direccion) {
      if (direccion.length > 200) {
        errors.push(
          `Fila ${rowIndex}: La direccion no puede exceder 200 caracteres`,
        );
      } else {
        data.address = direccion;
      }
    }

    // --- Optional: ciudad -> city ---
    const ciudad = row['ciudad']?.trim();
    if (ciudad) {
      if (ciudad.length > 100) {
        errors.push(
          `Fila ${rowIndex}: La ciudad no puede exceder 100 caracteres`,
        );
      } else {
        data.city = ciudad;
      }
    }

    // --- Optional: notas -> notes ---
    const notas = row['notas']?.trim();
    if (notas) {
      if (notas.length > 500) {
        errors.push(
          `Fila ${rowIndex}: Las notas no pueden exceder 500 caracteres`,
        );
      } else {
        data.notes = notas;
      }
    }

    return { data, errors };
  }

  /**
   * Basic email validation using a simple regex.
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
