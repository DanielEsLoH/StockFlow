import { useEffect, useCallback } from "react";

const CRISP_WEBSITE_ID = "b9ae0023-b5bb-4c0b-a6d0-fb032783b82e";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

let crispLoaded = false;

/**
 * Initializes Crisp chat SDK once and provides helpers to open/close it.
 * The default Crisp floating button is hidden — we control it via the help button.
 */
export function useCrisp() {
  useEffect(() => {
    if (crispLoaded || typeof window === "undefined") return;
    crispLoaded = true;

    // Configure before loading
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    // Hide the default floating button
    window.$crisp.push(["safe:true"]);
    window.$crisp.push(["do", "chat:hide"]);

    // Load script
    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Ensure chatbox button stays hidden after load
      window.$crisp.push(["do", "chat:hide"]);
    };
  }, []);

  const openChat = useCallback(() => {
    if (typeof window !== "undefined" && window.$crisp) {
      window.$crisp.push(["do", "chat:show"]);
      window.$crisp.push(["do", "chat:open"]);
    }
  }, []);

  const closeChat = useCallback(() => {
    if (typeof window !== "undefined" && window.$crisp) {
      window.$crisp.push(["do", "chat:close"]);
      window.$crisp.push(["do", "chat:hide"]);
    }
  }, []);

  return { openChat, closeChat };
}
