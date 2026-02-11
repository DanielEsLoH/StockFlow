/**
 * Maps API error messages to user-friendly Spanish messages
 * This helps translate technical error messages to clear, actionable messages for users
 */

type ErrorMapping = {
  pattern: RegExp | string;
  message: string;
};

const errorMappings: ErrorMapping[] = [
  // Authentication errors
  {
    pattern: /user with this email already exists/i,
    message:
      "Ya existe una cuenta con este correo electronico. Intenta iniciar sesion o usa otro correo.",
  },
  {
    pattern: /invalid email or password/i,
    message:
      "El correo o la contrasena son incorrectos. Por favor verifica tus datos.",
  },
  {
    pattern: /invalid credentials/i,
    message:
      "El correo o la contrasena son incorrectos. Por favor verifica tus datos.",
  },
  {
    pattern: /account.*suspended/i,
    message:
      "Tu cuenta ha sido suspendida. Contacta al administrador para mas informacion.",
  },
  {
    pattern: /account.*inactive/i,
    message:
      "Tu cuenta esta inactiva. Contacta al administrador para reactivarla.",
  },
  {
    pattern: /cuenta.*pendiente.*aprobaci[oó]n/i,
    message:
      "Tu cuenta esta pendiente de aprobacion por un administrador. Te notificaremos por correo cuando sea aprobada.",
  },
  {
    pattern: /account.*pending/i,
    message:
      "Tu cuenta esta pendiente de aprobacion por un administrador. Te notificaremos por correo cuando sea aprobada.",
  },
  {
    pattern: /verifica tu correo electr[oó]nico/i,
    message:
      "Por favor verifica tu correo electronico antes de iniciar sesion. Revisa tu bandeja de entrada.",
  },
  {
    pattern: /email.*not.*verified/i,
    message:
      "Por favor verifica tu correo electronico antes de iniciar sesion. Revisa tu bandeja de entrada.",
  },
  {
    pattern: /invalid.*verification.*token/i,
    message:
      "El enlace de verificacion no es valido o ya fue utilizado. Solicita uno nuevo.",
  },
  {
    pattern: /verification.*token.*expired/i,
    message: "El enlace de verificacion ha expirado. Solicita uno nuevo.",
  },
  {
    pattern: /already.*been.*verified/i,
    message: "Tu correo ya fue verificado. Puedes iniciar sesion.",
  },
  {
    pattern: /too many requests/i,
    message:
      "Has realizado demasiados intentos. Espera unos minutos antes de intentar de nuevo.",
  },
  {
    pattern: /rate limit/i,
    message:
      "Has realizado demasiados intentos. Espera unos minutos antes de intentar de nuevo.",
  },

  // Invitation errors
  {
    pattern: /invitation.*expired/i,
    message:
      "Esta invitacion ha expirado. Solicita una nueva invitacion al administrador.",
  },
  {
    pattern: /invitation.*not.*valid/i,
    message: "Esta invitacion no es valida o ya fue utilizada.",
  },
  {
    pattern: /invitation.*already.*used/i,
    message: "Esta invitacion ya fue utilizada.",
  },

  // Organization/Tenant errors
  {
    pattern: /organization.*suspended/i,
    message:
      "Tu organizacion ha sido suspendida. Contacta a soporte para mas informacion.",
  },
  {
    pattern: /organization.*inactive/i,
    message:
      "Tu organizacion esta inactiva. Contacta a soporte para reactivarla.",
  },

  // Generic errors
  {
    pattern: /not found/i,
    message: "No se encontro el recurso solicitado.",
  },
  {
    pattern: /unauthorized/i,
    message:
      "No tienes permiso para realizar esta accion. Inicia sesion nuevamente.",
  },
  {
    pattern: /forbidden/i,
    message: "No tienes permiso para realizar esta accion.",
  },
  {
    pattern: /network error/i,
    message:
      "Error de conexion. Verifica tu conexion a internet e intenta de nuevo.",
  },
  {
    pattern: /timeout/i,
    message: "La solicitud tardo demasiado. Intenta de nuevo.",
  },
  {
    pattern: /server error/i,
    message: "Ocurrio un error en el servidor. Intenta de nuevo mas tarde.",
  },
  {
    pattern: /internal server error/i,
    message: "Ocurrio un error inesperado. Intenta de nuevo mas tarde.",
  },
];

/**
 * Converts an API error message to a user-friendly Spanish message
 * @param error - The error object or message string
 * @param defaultMessage - Default message to show if no mapping is found
 * @returns A user-friendly error message in Spanish
 */
export function getErrorMessage(
  error: Error | string | unknown,
  defaultMessage = "Ocurrio un error inesperado. Intenta de nuevo.",
): string {
  // Get the error message string
  let errorMessage: string;

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    // Handle AxiosError — extract server message from response.data
    const axiosData = (error as any).response?.data;
    if (axiosData?.message) {
      errorMessage =
        typeof axiosData.message === "string"
          ? axiosData.message
          : Array.isArray(axiosData.message)
            ? axiosData.message[0]
            : error.message;
    } else {
      errorMessage = error.message;
    }
  } else if (error && typeof error === "object" && "message" in error) {
    errorMessage = String((error as { message: unknown }).message);
  } else {
    return defaultMessage;
  }

  // Try to find a matching error mapping
  for (const mapping of errorMappings) {
    if (typeof mapping.pattern === "string") {
      if (errorMessage.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return mapping.message;
      }
    } else if (mapping.pattern.test(errorMessage)) {
      return mapping.message;
    }
  }

  // If no mapping found, return the original message if it looks user-friendly,
  // otherwise return the default message
  if (isUserFriendlyMessage(errorMessage)) {
    return errorMessage;
  }

  return defaultMessage;
}

/**
 * Checks if a message appears to be user-friendly (in Spanish and not technical)
 */
function isUserFriendlyMessage(message: string): boolean {
  // Check if message is in Spanish (contains Spanish-specific characters or common words)
  const spanishIndicators =
    /[áéíóúñ¿¡]|correo|usuario|contrasena|cuenta|error|intenta/i;

  // Check if message contains technical terms that indicate it's not user-friendly
  const technicalIndicators =
    /exception|error code|status|http|api|null|undefined|failed to|request failed/i;

  return spanishIndicators.test(message) && !technicalIndicators.test(message);
}

/**
 * Creates an error handler function for use in catch blocks
 * @param defaultMessage - Default message to show if no mapping is found
 * @returns A function that extracts and maps error messages
 */
export function createErrorHandler(defaultMessage?: string) {
  return (error: unknown): string => getErrorMessage(error, defaultMessage);
}
