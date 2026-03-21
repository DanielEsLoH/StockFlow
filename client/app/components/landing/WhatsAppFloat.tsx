import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "~/lib/utils";

const WHATSAPP_URL =
  "https://wa.me/573108563748?text=Hola%2C%20me%20interesa%20conocer%20más%20sobre%20StockFlow";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show after scrolling past hero
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Show tooltip after 4s if not dismissed
  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = setTimeout(() => setTooltip(true), 4000);
    return () => clearTimeout(timer);
  }, [visible, dismissed]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 flex items-end gap-3"
        >
          {/* Tooltip */}
          <AnimatePresence>
            {tooltip && !dismissed && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2.5",
                  "bg-white shadow-lg shadow-neutral-900/10 border border-neutral-200/80",
                  "dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-black/20",
                )}
              >
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                  ¿Necesitas ayuda?
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissed(true);
                    setTooltip(false);
                  }}
                  className="flex-shrink-0 rounded-full p-0.5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Arrow */}
                <div
                  className={cn(
                    "absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45",
                    "bg-white border-r border-t border-neutral-200/80",
                    "dark:bg-neutral-800 dark:border-neutral-700",
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Button */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contáctanos por WhatsApp"
            className="group relative"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />

            {/* Main button */}
            <span
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full",
                "bg-[#25D366] text-white",
                "shadow-lg shadow-[#25D366]/30",
                "transition-all duration-200",
                "hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40",
                "active:scale-95",
              )}
            >
              <WhatsAppIcon className="h-7 w-7" />
            </span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
