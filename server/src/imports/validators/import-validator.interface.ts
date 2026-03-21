/**
 * Interface that all import validators must implement.
 *
 * Each module (products, customers, suppliers) has its own validator
 * that defines the expected columns, aliases, and row-level validation logic.
 */
export interface ImportValidator {
  /**
   * Returns the list of required column names (in Spanish, normalized).
   */
  getRequiredColumns(): string[];

  /**
   * Returns the list of optional column names (in Spanish, normalized).
   */
  getOptionalColumns(): string[];

  /**
   * Returns a mapping of canonical column names to their accepted aliases.
   * This allows users to use English or alternative column names.
   *
   * @example
   * { nombre: ['name', 'producto'], precio_costo: ['cost_price', 'costo'] }
   */
  getHeaderAliases(): Record<string, string[]>;

  /**
   * Validates a single row of data and maps it to database field names.
   *
   * @param row - The raw row data with normalized header keys
   * @param rowIndex - The 1-based row index (for error messages)
   * @returns An object containing the mapped data and any validation errors
   */
  validateRow(
    row: Record<string, string>,
    rowIndex: number,
  ): { data: Record<string, unknown>; errors: string[] };
}
