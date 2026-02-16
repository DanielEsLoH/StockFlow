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
// HELPERS
// ============================================================================

const SEP_LENGTH = 36;

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function charLine(char = "-"): string {
  return char.repeat(SEP_LENGTH);
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

// ============================================================================
// INLINE STYLES (no Tailwind — works identically in preview and print)
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "11pt",
    lineHeight: "1.4",
    width: "80mm",
    maxWidth: "80mm",
    padding: "3mm",
    margin: "0 auto",
    backgroundColor: "#fff",
    color: "#000",
    overflow: "hidden",
  },
  header: {
    fontSize: "12pt",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: "0.05em",
  },
  subHeader: {
    fontSize: "10pt",
    textAlign: "center",
  },
  resolution: {
    fontSize: "8pt",
    textAlign: "center",
    marginTop: "1mm",
    wordBreak: "break-word" as const,
  },
  separator: {
    fontSize: "11pt",
    textAlign: "center",
    margin: "1.5mm 0",
    letterSpacing: "-0.05em",
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
  },
  // Flex row for label:value pairs — replaces padLine + whiteSpace:pre
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11pt",
  },
  rowLabel: {
    flexShrink: 0,
  },
  rowValue: {
    textAlign: "right" as const,
    flexShrink: 0,
  },
  detailLine: {
    fontSize: "10pt",
    paddingLeft: "2mm",
  },
  sectionTitle: {
    fontSize: "11pt",
    fontWeight: "bold",
  },
  // Items table header
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11pt",
    fontWeight: "bold",
  },
  // Items row: product name (flexible) + qty (fixed) + total (fixed)
  itemRow: {
    display: "flex",
    fontSize: "11pt",
  },
  itemName: {
    flex: "1 1 0%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    paddingRight: "2mm",
  },
  itemQty: {
    width: "3ch",
    textAlign: "right" as const,
    flexShrink: 0,
    paddingRight: "3mm",
  },
  itemTotal: {
    textAlign: "right" as const,
    flexShrink: 0,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12pt",
    fontWeight: "bold",
  },
  footer: {
    fontSize: "11pt",
    fontWeight: "bold",
    textAlign: "center",
  },
  finePrint: {
    fontSize: "10pt",
    textAlign: "center",
  },
  cufe: {
    fontSize: "8pt",
    textAlign: "center",
    wordBreak: "break-all",
  },
};

// ============================================================================
// ROW COMPONENT — flex row with label + value (replaces padLine)
// ============================================================================

function Row({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...S.row, ...style }}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
    </div>
  );
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
      footerMessage = "Gracias por su compra!",
    } = props;

    // Build resolution text
    const resolutionText = resolutionNumber
      ? [
          `Res. DIAN No. ${resolutionNumber}`,
          resolutionDate &&
            `del ${formatTicketDate(resolutionDate).split(",")[0]}`,
          resolutionPrefix && `Pref. ${resolutionPrefix}`,
          resolutionRangeFrom != null &&
            resolutionRangeTo != null &&
            `del ${resolutionRangeFrom} al ${resolutionRangeTo}`,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

    return (
      <div ref={ref} className="pos-ticket" style={S.container}>
        {/* ============================================================== */}
        {/* HEADER - Business Info                                         */}
        {/* ============================================================== */}
        <div style={S.header}>{businessName}</div>
        {businessNit && <div style={S.subHeader}>NIT: {businessNit}</div>}
        {businessAddress && (
          <div style={S.subHeader}>{businessAddress}</div>
        )}
        {businessPhone && (
          <div style={S.subHeader}>Tel: {businessPhone}</div>
        )}
        {resolutionText && <div style={S.resolution}>{resolutionText}</div>}

        <div style={S.separator}>{charLine()}</div>

        {/* ============================================================== */}
        {/* INVOICE INFO                                                   */}
        {/* ============================================================== */}
        <div style={S.sectionTitle}>FACTURA DE VENTA</div>
        <Row label="No:" value={invoiceNumber} />
        <Row label="Fecha:" value={formatTicketDate(date)} />
        {cashierName && (
          <Row label="Cajero:" value={truncateText(cashierName, 20)} />
        )}
        {cashRegisterName && (
          <Row label="Caja:" value={cashRegisterName} />
        )}

        <div style={S.separator}>{charLine()}</div>

        {/* ============================================================== */}
        {/* CUSTOMER INFO                                                  */}
        {/* ============================================================== */}
        {customerName && (
          <>
            <Row label="Cliente:" value={truncateText(customerName, 20)} />
            {customerDocument && (
              <Row
                label={`${customerDocumentType || "Doc"}:`}
                value={customerDocument}
              />
            )}
            {customerPhone && (
              <Row label="Tel:" value={customerPhone} />
            )}
            {customerAddress && (
              <div style={S.detailLine}>
                {truncateText(customerAddress, 36)}
              </div>
            )}

            <div style={S.separator}>{charLine()}</div>
          </>
        )}

        {/* ============================================================== */}
        {/* ITEMS TABLE                                                    */}
        {/* ============================================================== */}
        <div style={S.itemHeader}>
          <span style={{ flex: "1 1 0%" }}>Producto</span>
          <span style={{ width: "3ch", textAlign: "right", flexShrink: 0, paddingRight: "3mm" }}>Cnt</span>
          <span style={{ textAlign: "right", flexShrink: 0 }}>Total</span>
        </div>
        <div style={S.separator}>{charLine()}</div>

        {items.map((item, index) => (
          <div key={index}>
            {/* Main item row */}
            <div style={S.itemRow}>
              <span style={S.itemName}>{item.name}</span>
              <span style={S.itemQty}>{item.quantity}</span>
              <span style={S.itemTotal}>{formatCurrency(item.total)}</span>
            </div>
            {/* Unit price detail for qty > 1 */}
            {item.quantity > 1 && (
              <div style={S.detailLine}>
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </div>
            )}
            {/* Discount detail */}
            {item.discount != null && item.discount > 0 && (
              <div style={S.detailLine}>Desc: -{item.discount}%</div>
            )}
          </div>
        ))}

        <div style={S.separator}>{charLine()}</div>

        {/* ============================================================== */}
        {/* TOTALS                                                         */}
        {/* ============================================================== */}
        <Row label="Subtotal:" value={formatCurrency(subtotal)} />

        {discountAmount > 0 && (
          <Row
            label={`Descuento${discountPercent ? ` (${discountPercent}%)` : ""}:`}
            value={`-${formatCurrency(discountAmount)}`}
          />
        )}

        <Row label="IVA (19%):" value={`+${formatCurrency(taxAmount)}`} />

        <div style={S.separator}>{charLine("=")}</div>
        <div style={S.totalRow}>
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div style={S.separator}>{charLine("=")}</div>

        {/* ============================================================== */}
        {/* PAYMENTS                                                       */}
        {/* ============================================================== */}
        <div style={S.sectionTitle}>Forma de pago:</div>
        {payments.map((payment, index) => (
          <Row
            key={index}
            label={`  ${payment.methodLabel}:`}
            value={formatCurrency(payment.amount)}
          />
        ))}
        {change !== undefined && change > 0 && (
          <Row
            label="  Cambio:"
            value={formatCurrency(change)}
            style={{ fontWeight: "bold" }}
          />
        )}

        <div style={S.separator}>{charLine()}</div>

        {/* ============================================================== */}
        {/* DIAN CUFE (if electronic invoice)                              */}
        {/* ============================================================== */}
        {dianCufe && (
          <>
            <div style={S.cufe}>CUFE: {dianCufe}</div>
            <div style={S.separator}>{charLine()}</div>
          </>
        )}

        {/* ============================================================== */}
        {/* FOOTER                                                         */}
        {/* ============================================================== */}
        <div style={{ ...S.footer, marginTop: "2mm" }}>{footerMessage}</div>
        <div style={S.finePrint}>Vuelva pronto</div>

        {/* ============================================================== */}
        {/* PRINT STYLES                                                   */}
        {/* ============================================================== */}
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
              padding: 3mm !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>
      </div>
    );
  },
);
