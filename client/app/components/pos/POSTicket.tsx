import { forwardRef } from "react";
import { formatCurrency } from "~/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface POSTicketItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

export interface POSTicketPayment {
  method: string;
  methodLabel: string;
  amount: number;
}

export interface POSTicketProps {
  // Business info
  businessName: string;
  businessNit?: string;
  businessAddress?: string;
  businessPhone?: string;

  // Resolution info
  resolutionNumber?: string;
  resolutionPrefix?: string;
  resolutionRangeFrom?: number;
  resolutionRangeTo?: number;
  resolutionDate?: string;

  // Invoice info
  invoiceNumber: string;
  date: string;
  cashierName?: string;
  cashRegisterName?: string;

  // Customer info
  customerName?: string;
  customerDocument?: string;
  customerDocumentType?: string;
  customerPhone?: string;
  customerAddress?: string;

  // Items
  items: POSTicketItem[];

  // Totals
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  taxAmount: number;
  total: number;

  // Payments
  payments: POSTicketPayment[];
  change?: number;

  // DIAN (optional)
  dianCufe?: string;

  // Footer
  footerMessage?: string;
}

// ============================================================================
// HELPER: Truncate text to fit 42 chars per line
// ============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function formatTicketDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function formatTicketCurrency(amount: number): string {
  // Compact format for tickets
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return formatCurrency(amount);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POSTicket = forwardRef<HTMLDivElement, POSTicketProps>(
  function POSTicket(props, ref) {
    const {
      businessName,
      businessNit,
      businessAddress,
      businessPhone,
      resolutionNumber,
      resolutionPrefix,
      resolutionRangeFrom,
      resolutionRangeTo,
      resolutionDate,
      invoiceNumber,
      date,
      cashierName,
      cashRegisterName,
      customerName,
      customerDocument,
      customerDocumentType,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      discountAmount,
      discountPercent,
      taxAmount,
      total,
      payments,
      change,
      dianCufe,
      footerMessage = "¡Gracias por su compra!",
    } = props;

    return (
      <div
        ref={ref}
        className="pos-ticket bg-white text-black font-mono text-[8pt] leading-tight w-[80mm] mx-auto p-2"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          width: "80mm",
          maxWidth: "80mm",
        }}
      >
        {/* ================================================================ */}
        {/* HEADER - Business Info */}
        {/* ================================================================ */}
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <div className="text-sm font-bold uppercase tracking-wide">
            {businessName}
          </div>
          {businessNit && <div className="text-[7pt]">NIT: {businessNit}</div>}
          {businessAddress && (
            <div className="text-[7pt]">
              {truncateText(businessAddress, 40)}
            </div>
          )}
          {businessPhone && (
            <div className="text-[7pt]">Tel: {businessPhone}</div>
          )}
          {resolutionNumber && (
            <div className="text-[6pt] mt-1">
              Res. DIAN No. {resolutionNumber}
              {resolutionDate && ` del ${formatTicketDate(resolutionDate).split(",")[0]}`}
              {resolutionPrefix && `, Pref. ${resolutionPrefix}`}
              {resolutionRangeFrom != null &&
                resolutionRangeTo != null &&
                `, del ${resolutionRangeFrom} al ${resolutionRangeTo}`}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* INVOICE INFO */}
        {/* ================================================================ */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="font-bold">FACTURA DE VENTA</div>
          <div className="flex justify-between">
            <span>No:</span>
            <span className="font-bold">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatTicketDate(date)}</span>
          </div>
          {cashierName && (
            <div className="flex justify-between">
              <span>Cajero:</span>
              <span>{truncateText(cashierName, 20)}</span>
            </div>
          )}
          {cashRegisterName && (
            <div className="flex justify-between">
              <span>Caja:</span>
              <span>{cashRegisterName}</span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* CUSTOMER INFO */}
        {/* ================================================================ */}
        {customerName && (
          <div className="border-b border-dashed border-black pb-2 mb-2">
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{truncateText(customerName, 22)}</span>
            </div>
            {customerDocument && (
              <div className="flex justify-between">
                <span>{customerDocumentType || "Doc"}:</span>
                <span>{customerDocument}</span>
              </div>
            )}
            {customerPhone && (
              <div className="flex justify-between">
                <span>Tel:</span>
                <span>{customerPhone}</span>
              </div>
            )}
            {customerAddress && (
              <div className="text-[7pt]">
                {truncateText(customerAddress, 40)}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ITEMS TABLE */}
        {/* ================================================================ */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          {/* Header */}
          <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
            <span className="flex-1">Producto</span>
            <span className="w-8 text-center">Cnt</span>
            <span className="w-16 text-right">Total</span>
          </div>

          {/* Items */}
          {items.map((item, index) => (
            <div key={index} className="mb-1">
              <div className="flex justify-between">
                <span className="flex-1 truncate pr-1">
                  {truncateText(item.name, 22)}
                </span>
                <span className="w-8 text-center">{item.quantity}</span>
                <span className="w-16 text-right">
                  {formatTicketCurrency(item.total)}
                </span>
              </div>
              {/* Show unit price for quantity > 1 */}
              {item.quantity > 1 && (
                <div className="text-[7pt] text-gray-600 pl-2">
                  {item.quantity} x {formatTicketCurrency(item.unitPrice)}
                </div>
              )}
              {/* Show discount if any */}
              {item.discount && item.discount > 0 && (
                <div className="text-[7pt] text-gray-600 pl-2">
                  Desc: -{item.discount}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* TOTALS */}
        {/* ================================================================ */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span>
                Descuento{discountPercent ? ` (${discountPercent}%)` : ""}:
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>IVA (19%):</span>
            <span>+{formatCurrency(taxAmount)}</span>
          </div>

          {/* Total destacado */}
          <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PAYMENTS */}
        {/* ================================================================ */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="font-bold mb-1">Forma de pago:</div>
          {payments.map((payment, index) => (
            <div key={index} className="flex justify-between pl-2">
              <span>{payment.methodLabel}:</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
          {change !== undefined && change > 0 && (
            <div className="flex justify-between pl-2 font-bold mt-1">
              <span>Cambio:</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* DIAN CUFE (if electronic invoice) */}
        {/* ================================================================ */}
        {dianCufe && (
          <div className="border-b border-dashed border-black pb-2 mb-2 text-center">
            <div className="text-[6pt] break-all">CUFE: {dianCufe}</div>
          </div>
        )}

        {/* ================================================================ */}
        {/* FOOTER */}
        {/* ================================================================ */}
        <div className="text-center pt-2">
          <div className="text-[9pt] font-bold">{footerMessage}</div>
          <div className="text-[7pt] mt-1">Vuelva pronto</div>
        </div>

        {/* ================================================================ */}
        {/* PRINT STYLES (inline for portability) */}
        {/* ================================================================ */}
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }

            body {
              margin: 0 !important;
              padding: 0 !important;
            }

            body * {
              visibility: hidden;
            }

            .pos-ticket,
            .pos-ticket * {
              visibility: visible;
            }

            .pos-ticket {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm !important;
              max-width: 80mm !important;
              font-size: 8pt !important;
              line-height: 1.2 !important;
              padding: 2mm !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
            }

            .pos-ticket .border-dashed {
              border-style: dashed !important;
              border-color: black !important;
            }
          }
        `}</style>
      </div>
    );
  },
);
