// Wompi Widget Checkout types
export interface WompiWidgetConfig {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  signatureIntegrity: string;
  redirectUrl: string;
  customerData?: {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    phoneNumberPrefix?: string;
  };
}

export interface WompiWidgetResult {
  id: string; // transaction id
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  reference: string;
}

// Declare the global WidgetCheckout constructor
declare global {
  interface Window {
    WidgetCheckout?: new (config: {
      currency: string;
      amountInCents: number;
      reference: string;
      publicKey: string;
      signatureIntegrity: string;
      redirectUrl: string;
      customerData?: WompiWidgetConfig["customerData"];
    }) => {
      open: (
        callback: (result: { transaction: WompiWidgetResult }) => void,
      ) => void;
    };
  }
}

const WOMPI_WIDGET_URL = "https://checkout.wompi.co/widget.js";

let widgetLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Wompi checkout widget script if not already loaded.
 */
export function loadWompiWidget(): Promise<void> {
  if (widgetLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WOMPI_WIDGET_URL;
    script.async = true;
    script.onload = () => {
      widgetLoaded = true;
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Wompi widget script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Opens the Wompi checkout widget programmatically.
 * Returns a promise that resolves with the transaction result,
 * or rejects if the user closes the widget without completing payment.
 *
 * Watches for the widget backdrop/modal to be removed from the DOM
 * (indicating the user closed it) so the promise doesn't hang forever.
 */
export async function openWompiCheckout(
  config: WompiWidgetConfig,
): Promise<WompiWidgetResult> {
  await loadWompiWidget();

  if (!window.WidgetCheckout) {
    throw new Error("Wompi WidgetCheckout not available after loading script");
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const widget = new window.WidgetCheckout!({
      currency: config.currency,
      amountInCents: config.amountInCents,
      reference: config.reference,
      publicKey: config.publicKey,
      signatureIntegrity: config.signatureIntegrity,
      redirectUrl: config.redirectUrl,
      customerData: config.customerData,
    });

    widget.open((result) => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(result.transaction);
      }
    });

    // Cleanup helper to remove widget elements and clear timers
    function cleanup() {
      clearInterval(closeCheckInterval);
      clearTimeout(iframeTimeout);
      // Remove Wompi widget elements from the DOM
      document
        .querySelectorAll(".waybox-backdrop, .waybox-modal")
        .forEach((el) => el.remove());
    }

    // Watch for the widget being closed without completing payment.
    // The Wompi widget adds a .waybox-backdrop element; when the user
    // closes the modal it gets removed from the DOM.
    const closeCheckInterval = setInterval(() => {
      if (settled) {
        clearInterval(closeCheckInterval);
        return;
      }
      const backdrop = document.querySelector(".waybox-backdrop");
      if (!backdrop) {
        settled = true;
        cleanup();
        reject(new Error("Pago cancelado"));
      }
    }, 500);

    // Safety timeout: if the widget iframe doesn't render content
    // within 10 seconds (e.g. blocked by WAF on localhost), clean up
    // and reject so the spinner doesn't hang forever.
    const iframeTimeout = setTimeout(() => {
      if (settled) return;
      const iframe = document.querySelector<HTMLIFrameElement>(
        ".waybox-modal iframe, .waybox-backdrop iframe",
      );
      // If there's no iframe at all, or the iframe has no visible height,
      // the widget failed to render.
      if (!iframe || iframe.offsetHeight === 0) {
        settled = true;
        cleanup();
        reject(
          new Error(
            "El widget de pago no pudo cargarse. Intenta de nuevo más tarde.",
          ),
        );
      }
    }, 10_000);
  });
}
