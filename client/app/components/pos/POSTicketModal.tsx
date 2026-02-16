import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Check } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { POSTicket, type POSTicketProps } from "./POSTicket";

interface POSTicketModalProps extends POSTicketProps {
  isOpen: boolean;
  onClose: () => void;
  onPrintComplete?: () => void;
}

export function POSTicketModal({
  isOpen,
  onClose,
  onPrintComplete,
  ...ticketProps
}: POSTicketModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=320,height=600");

    if (printWindow && ticketRef.current) {
      // Get the ticket HTML
      const ticketHTML = ticketRef.current.outerHTML;

      // Write the print document — minimal CSS since POSTicket uses inline styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${ticketProps.invoiceNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: 80mm;
              max-width: 80mm;
              background: white;
              color: black;
            }
            @media print {
              body { width: 80mm !important; }
            }
          </style>
        </head>
        <body>
          ${ticketHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `);

      printWindow.document.close();

      // Call completion callback
      if (onPrintComplete) {
        setTimeout(onPrintComplete, 500);
      }
    }
  };

  const handleClose = () => {
    onClose();
    if (onPrintComplete) {
      onPrintComplete();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
          >
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
                    <Check className="h-5 w-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Venta completada
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {ticketProps.invoiceNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Ticket Preview */}
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 max-h-[60vh] overflow-y-auto">
                <div
                  className="bg-white shadow-lg mx-auto"
                  style={{ width: "fit-content" }}
                >
                  <POSTicket ref={ticketRef} {...ticketProps} />
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cerrar
                </Button>
                <Button className="flex-1" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Ticket
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
