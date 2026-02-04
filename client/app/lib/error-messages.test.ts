import { describe, it, expect } from "vitest";
import { getErrorMessage, createErrorHandler } from "./error-messages";

describe("error-messages", () => {
  describe("getErrorMessage", () => {
    describe("authentication errors", () => {
      it("should return correct message for duplicate email", () => {
        const message = getErrorMessage("User with this email already exists");
        expect(message).toContain("Ya existe una cuenta");
        expect(message).toContain("correo electronico");
      });

      it("should return correct message for invalid credentials", () => {
        const message = getErrorMessage("Invalid email or password");
        expect(message).toContain("correo o la contrasena son incorrectos");
      });

      it("should return correct message for invalid credentials variant", () => {
        const message = getErrorMessage("Invalid credentials");
        expect(message).toContain("correo o la contrasena son incorrectos");
      });

      it("should return correct message for suspended account", () => {
        const message = getErrorMessage("Your account has been suspended");
        expect(message).toContain("suspendida");
        expect(message).toContain("administrador");
      });

      it("should return correct message for inactive account", () => {
        const message = getErrorMessage("Your account is inactive");
        expect(message).toContain("inactiva");
        expect(message).toContain("administrador");
      });

      it("should return correct message for pending account (Spanish)", () => {
        const message = getErrorMessage(
          "Tu cuenta esta pendiente de aprobación",
        );
        expect(message).toContain("pendiente de aprobacion");
        expect(message).toContain("administrador");
      });

      it("should return correct message for pending account (English)", () => {
        const message = getErrorMessage("Your account is pending approval");
        expect(message).toContain("pendiente de aprobacion");
        expect(message).toContain("administrador");
      });

      it("should return correct message for unverified email (Spanish)", () => {
        const message = getErrorMessage("Verifica tu correo electrónico");
        expect(message).toContain("verifica tu correo electronico");
        expect(message).toContain("bandeja de entrada");
      });

      it("should return correct message for unverified email (English)", () => {
        const message = getErrorMessage("Email not verified");
        expect(message).toContain("verifica tu correo electronico");
      });

      it("should return correct message for invalid verification token", () => {
        const message = getErrorMessage("Invalid verification token");
        expect(message).toContain("enlace de verificacion no es valido");
      });

      it("should return correct message for expired verification token", () => {
        const message = getErrorMessage("Verification token expired");
        expect(message).toContain("enlace de verificacion ha expirado");
      });

      it("should return correct message for already verified email", () => {
        const message = getErrorMessage("Email has already been verified");
        expect(message).toContain("correo ya fue verificado");
      });

      it("should return correct message for rate limiting", () => {
        const message = getErrorMessage("Too many requests");
        expect(message).toContain("demasiados intentos");
      });

      it("should return correct message for rate limit variant", () => {
        const message = getErrorMessage("Rate limit exceeded");
        expect(message).toContain("demasiados intentos");
      });
    });

    describe("invitation errors", () => {
      it("should return correct message for expired invitation", () => {
        const message = getErrorMessage("Invitation has expired");
        expect(message).toContain("invitacion ha expirado");
      });

      it("should return correct message for invalid invitation", () => {
        const message = getErrorMessage("Invitation is not valid");
        expect(message).toContain("invitacion no es valida");
      });

      it("should return correct message for used invitation", () => {
        const message = getErrorMessage("This invitation was already used");
        expect(message).toContain("invitacion ya fue utilizada");
      });
    });

    describe("organization errors", () => {
      it("should return correct message for suspended organization", () => {
        const message = getErrorMessage("Your organization has been suspended");
        expect(message).toContain("organizacion ha sido suspendida");
      });

      it("should return correct message for inactive organization", () => {
        const message = getErrorMessage("Your organization is inactive");
        expect(message).toContain("organizacion esta inactiva");
      });
    });

    describe("generic errors", () => {
      it("should return correct message for not found", () => {
        const message = getErrorMessage("Resource not found");
        expect(message).toContain("No se encontro");
      });

      it("should return correct message for unauthorized", () => {
        const message = getErrorMessage("Unauthorized access");
        expect(message).toContain("No tienes permiso");
        expect(message).toContain("Inicia sesion");
      });

      it("should return correct message for forbidden", () => {
        const message = getErrorMessage("Forbidden");
        expect(message).toContain("No tienes permiso");
      });

      it("should return correct message for network error", () => {
        const message = getErrorMessage("Network error occurred");
        expect(message).toContain("conexion");
      });

      it("should return correct message for timeout", () => {
        const message = getErrorMessage("Request timeout");
        expect(message).toContain("tardo demasiado");
      });

      it("should return correct message for server error", () => {
        const message = getErrorMessage("Server error");
        expect(message).toContain("error en el servidor");
      });

      it("should return correct message for internal server error", () => {
        const message = getErrorMessage("Internal server error");
        expect(message).toContain("error");
        expect(message).toContain("Intenta de nuevo");
      });
    });

    describe("input types", () => {
      it("should handle string errors", () => {
        const message = getErrorMessage("Some error message");
        expect(typeof message).toBe("string");
      });

      it("should handle Error objects", () => {
        const error = new Error("User with this email already exists");
        const message = getErrorMessage(error);
        expect(message).toContain("Ya existe una cuenta");
      });

      it("should handle objects with message property", () => {
        const error = { message: "Invalid credentials" };
        const message = getErrorMessage(error);
        expect(message).toContain("correo o la contrasena son incorrectos");
      });

      it("should handle objects with non-string message", () => {
        const error = { message: 123 };
        const message = getErrorMessage(error);
        expect(typeof message).toBe("string");
      });

      it("should return default message for null", () => {
        const message = getErrorMessage(null);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should return default message for undefined", () => {
        const message = getErrorMessage(undefined);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should return default message for empty object", () => {
        const message = getErrorMessage({});
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should return default message for number", () => {
        const message = getErrorMessage(404);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });
    });

    describe("custom default message", () => {
      it("should use custom default message when no Spanish indicators present", () => {
        const customMessage = "Error personalizado";
        // Message without Spanish indicators returns default
        const message = getErrorMessage(
          "Something went wrong xyz",
          customMessage,
        );
        expect(message).toBe(customMessage);
      });

      it("should use default message when no Spanish indicators present", () => {
        // Message without Spanish indicators returns default
        const message = getErrorMessage("Something went wrong xyz");
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should return original message if it has Spanish indicators and no technical terms", () => {
        // This message has Spanish word "error" but no technical indicators
        const message = getErrorMessage("unknown error");
        // "error" is a Spanish indicator, so it returns as-is
        expect(message).toBe("unknown error");
      });
    });

    describe("user-friendly message detection", () => {
      it("should return Spanish messages that appear user-friendly", () => {
        const spanishMessage = "El correo es inválido";
        const message = getErrorMessage(spanishMessage);
        expect(message).toBe(spanishMessage);
      });

      it("should return Spanish message with accents", () => {
        const spanishMessage = "La contraseña es incorrecta";
        const message = getErrorMessage(spanishMessage);
        expect(message).toBe(spanishMessage);
      });

      it("should not return technical messages even with Spanish words", () => {
        const technicalMessage = "Exception occurred: null pointer exception";
        const message = getErrorMessage(technicalMessage);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should not return messages with technical indicators", () => {
        const technicalMessage = "Request failed with status 500";
        const message = getErrorMessage(technicalMessage);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should not return messages with http indicators", () => {
        const technicalMessage = "HTTP 404 error intenta de nuevo";
        const message = getErrorMessage(technicalMessage);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });

      it("should not return messages with api indicators", () => {
        const technicalMessage = "API error en el correo";
        const message = getErrorMessage(technicalMessage);
        expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
      });
    });

    describe("regex pattern matching", () => {
      it("should match patterns case-insensitively", () => {
        const message1 = getErrorMessage("USER WITH THIS EMAIL ALREADY EXISTS");
        const message2 = getErrorMessage("user with this email already exists");
        expect(message1).toBe(message2);
      });

      it("should match partial patterns", () => {
        const message = getErrorMessage(
          "Error: Account has been suspended by admin",
        );
        expect(message).toContain("suspendida");
      });
    });

    describe("string pattern matching", () => {
      it("should match string patterns case-insensitively", () => {
        // Note: The current implementation uses regex patterns primarily
        // This tests the general behavior
        const message = getErrorMessage("NETWORK ERROR");
        expect(message).toContain("conexion");
      });
    });
  });

  describe("createErrorHandler", () => {
    it("should create a function that handles errors", () => {
      const handler = createErrorHandler();
      expect(typeof handler).toBe("function");
    });

    it("should return correct message when called with error", () => {
      const handler = createErrorHandler();
      const message = handler("Invalid credentials");
      expect(message).toContain("correo o la contrasena son incorrectos");
    });

    it("should use custom default message when no Spanish indicators", () => {
      const customMessage = "Error en el formulario";
      const handler = createErrorHandler(customMessage);
      // Use a message without Spanish indicators
      const message = handler("Something went wrong");
      expect(message).toBe(customMessage);
    });

    it("should handle Error objects", () => {
      const handler = createErrorHandler();
      const error = new Error("User with this email already exists");
      const message = handler(error);
      expect(message).toContain("Ya existe una cuenta");
    });

    it("should handle null errors with default message", () => {
      const handler = createErrorHandler("Mi mensaje por defecto");
      const message = handler(null);
      expect(message).toBe("Mi mensaje por defecto");
    });

    it("should handle undefined errors", () => {
      const handler = createErrorHandler();
      const message = handler(undefined);
      expect(message).toBe("Ocurrio un error inesperado. Intenta de nuevo.");
    });
  });
});
