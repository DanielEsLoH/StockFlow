import { forwardRef, useMemo } from "react";
import { formatCurrency } from "~/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type PaperWidth = 58 | 80;

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
  // Paper size
  paperWidth?: PaperWidth;

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
// PAPER SIZE CONFIGS
// ============================================================================

interface PaperConfig {
  cssWidth: string;
  pageSize: string;
  padding: string;
  fontSize: string;
  headerSize: string;
  subSize: string;
  detailSize: string;
  totalSize: string;
  resolutionSize: string;
  cufeSize: string;
  sepLength: number;
  maxTruncate: number;
}

export const PAPER_CONFIGS: Record<PaperWidth, PaperConfig> = {
  58: {
    cssWidth: "48mm",
    pageSize: "58mm",
    padding: "2mm",
    fontSize: "9pt",
    headerSize: "10pt",
    subSize: "8pt",
    detailSize: "8pt",
    totalSize: "10pt",
    resolutionSize: "7pt",
    cufeSize: "7pt",
    sepLength: 28,
    maxTruncate: 24,
  },
  80: {
    cssWidth: "80mm",
    pageSize: "80mm",
    padding: "3mm",
    fontSize: "11pt",
    headerSize: "12pt",
    subSize: "10pt",
    detailSize: "10pt",
    totalSize: "12pt",
    resolutionSize: "8pt",
    cufeSize: "8pt",
    sepLength: 36,
    maxTruncate: 36,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function charLine(length: number, char = "-"): string {
  return char.repeat(length);
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
// DYNAMIC STYLES
// ============================================================================

function getStyles(cfg: PaperConfig): Record<string, React.CSSProperties> {
  return {
    container: {
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: cfg.fontSize,
      lineHeight: "1.4",
      width: cfg.cssWidth,
      maxWidth: cfg.cssWidth,
      padding: cfg.padding,
      margin: "0 auto",
      backgroundColor: "#fff",
      color: "#000",
      overflow: "hidden",
    },
    header: {
      fontSize: cfg.headerSize,
      fontWeight: "bold",
      textTransform: "uppercase",
      textAlign: "center",
      letterSpacing: "0.05em",
    },
    subHeader: {
      fontSize: cfg.subSize,
      textAlign: "center",
    },
    resolution: {
      fontSize: cfg.resolutionSize,
      textAlign: "center",
      marginTop: "1mm",
      wordBreak: "break-word" as const,
    },
    separator: {
      fontSize: cfg.fontSize,
      textAlign: "center",
      margin: "1.5mm 0",
      letterSpacing: "-0.05em",
      overflow: "hidden",
      whiteSpace: "nowrap" as const,
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: cfg.fontSize,
    },
    rowLabel: {
      flexShrink: 0,
    },
    rowValue: {
      textAlign: "right" as const,
      flexShrink: 0,
    },
    detailLine: {
      fontSize: cfg.detailSize,
      paddingLeft: "2mm",
    },
    sectionTitle: {
      fontSize: cfg.fontSize,
      fontWeight: "bold",
    },
    itemHeader: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: cfg.fontSize,
      fontWeight: "bold",
    },
    itemRow: {
      display: "flex",
      fontSize: cfg.fontSize,
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
      fontSize: cfg.totalSize,
      fontWeight: "bold",
    },
    footer: {
      fontSize: cfg.fontSize,
      fontWeight: "bold",
      textAlign: "center",
    },
    finePrint: {
      fontSize: cfg.detailSize,
      textAlign: "center",
    },
    cufe: {
      fontSize: cfg.cufeSize,
      textAlign: "center",
      wordBreak: "break-all",
    },
  };
}

// ============================================================================
// ROW COMPONENT — flex row with label + value (replaces padLine)
// ============================================================================

function Row({
  label,
  value,
  style,
  styles,
}: {
  label: string;
  value: string;
  style?: React.CSSProperties;
  styles: Record<string, React.CSSProperties>;
}) {
  return (
    <div style={{ ...styles.row, ...style }}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POSTicket = forwardRef<HTMLDivElement, POSTicketProps>(
  function POSTicket(props, ref) {
    const {
      paperWidth = 80,
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

    const cfg = PAPER_CONFIGS[paperWidth];
    const S = useMemo(() => getStyles(cfg), [cfg]);
    const sep = cfg.sepLength;
    const maxTrunc = cfg.maxTruncate;

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

        <div style={S.separator}>{charLine(sep)}</div>

        {/* ============================================================== */}
        {/* INVOICE INFO                                                   */}
        {/* ============================================================== */}
        <div style={S.sectionTitle}>FACTURA DE VENTA</div>
        <Row styles={S} label="No:" value={invoiceNumber} />
        <Row styles={S} label="Fecha:" value={formatTicketDate(date)} />
        {cashierName && (
          <Row styles={S} label="Cajero:" value={truncateText(cashierName, maxTrunc)} />
        )}
        {cashRegisterName && (
          <Row styles={S} label="Caja:" value={cashRegisterName} />
        )}

        <div style={S.separator}>{charLine(sep)}</div>

        {/* ============================================================== */}
        {/* CUSTOMER INFO                                                  */}
        {/* ============================================================== */}
        {customerName && (
          <>
            <Row styles={S} label="Cliente:" value={truncateText(customerName, maxTrunc)} />
            {customerDocument && (
              <Row
                styles={S}
                label={`${customerDocumentType || "Doc"}:`}
                value={customerDocument}
              />
            )}
            {customerPhone && (
              <Row styles={S} label="Tel:" value={customerPhone} />
            )}
            {customerAddress && (
              <div style={S.detailLine}>
                {truncateText(customerAddress, maxTrunc)}
              </div>
            )}

            <div style={S.separator}>{charLine(sep)}</div>
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
        <div style={S.separator}>{charLine(sep)}</div>

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

        <div style={S.separator}>{charLine(sep)}</div>

        {/* ============================================================== */}
        {/* TOTALS                                                         */}
        {/* ============================================================== */}
        <Row styles={S} label="Subtotal:" value={formatCurrency(subtotal)} />

        {discountAmount > 0 && (
          <Row
            styles={S}
            label={`Descuento${discountPercent ? ` (${discountPercent}%)` : ""}:`}
            value={`-${formatCurrency(discountAmount)}`}
          />
        )}

        <Row styles={S} label="IVA (19%):" value={`+${formatCurrency(taxAmount)}`} />

        <div style={S.separator}>{charLine(sep, "=")}</div>
        <div style={S.totalRow}>
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div style={S.separator}>{charLine(sep, "=")}</div>

        {/* ============================================================== */}
        {/* PAYMENTS                                                       */}
        {/* ============================================================== */}
        <div style={S.sectionTitle}>Forma de pago:</div>
        {payments.map((payment, index) => (
          <Row
            styles={S}
            key={index}
            label={`  ${payment.methodLabel}:`}
            value={formatCurrency(payment.amount)}
          />
        ))}
        {change !== undefined && change > 0 && (
          <Row
            styles={S}
            label="  Cambio:"
            value={formatCurrency(change)}
            style={{ fontWeight: "bold" }}
          />
        )}

        <div style={S.separator}>{charLine(sep)}</div>

        {/* ============================================================== */}
        {/* DIAN CUFE (if electronic invoice)                              */}
        {/* ============================================================== */}
        {dianCufe && (
          <>
            <div style={S.cufe}>CUFE: {dianCufe}</div>
            <div style={S.separator}>{charLine(sep)}</div>
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
              size: ${cfg.pageSize} auto;
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
              width: ${cfg.cssWidth} !important;
              max-width: ${cfg.cssWidth} !important;
              padding: ${cfg.padding} !important;
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
