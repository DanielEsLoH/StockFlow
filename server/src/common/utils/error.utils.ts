/**
 * Utility functions for safe error handling.
 * These utilities help extract error messages from unknown error types
 * in a type-safe manner, avoiding unsafe member access on 'any' values.
 */

/**
 * Extracts a safe error message from an unknown error value.
 * Handles Error instances, strings, and other types gracefully.
 *
 * @param error - The error value (unknown type from catch blocks)
 * @returns A string representation of the error
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error: unknown) {
 *   logger.warn(`Operation failed: ${getErrorMessage(error)}`);
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Extracts the full error string including name and message.
 * Useful for logging where you want the complete error representation.
 *
 * @param error - The error value (unknown type from catch blocks)
 * @returns A string representation of the error with type information
 */
export function getErrorString(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return getErrorMessage(error);
}
