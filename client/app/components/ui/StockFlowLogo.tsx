import { cn } from "~/lib/utils";

/**
 * StockFlow brand logo — Offset Cubes (Motion)
 * Two desfased isometric cubes representing stock (cube) + flow (motion/offset).
 *
 * Usage:
 *   <StockFlowLogo size="md" />                    — icon only
 *   <StockFlowLogo size="md" showText />           — icon + wordmark
 *   <StockFlowLogo size="sm" variant="white" />    — white version for dark/gradient backgrounds
 */

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
type LogoVariant = "default" | "white" | "mono";

interface StockFlowLogoProps {
  size?: LogoSize;
  showText?: boolean;
  variant?: LogoVariant;
  className?: string;
}

const sizeConfig: Record<LogoSize, { icon: number; container: string; text: string; gap: string; radius: string }> = {
  xs: { icon: 20, container: "h-6 w-6", text: "text-sm", gap: "gap-1.5", radius: "rounded-md" },
  sm: { icon: 24, container: "h-8 w-8", text: "text-base", gap: "gap-2", radius: "rounded-lg" },
  md: { icon: 28, container: "h-9 w-9", text: "text-xl", gap: "gap-2.5", radius: "rounded-xl" },
  lg: { icon: 36, container: "h-12 w-12", text: "text-2xl", gap: "gap-3", radius: "rounded-xl" },
  xl: { icon: 48, container: "h-16 w-16", text: "text-3xl", gap: "gap-3.5", radius: "rounded-2xl" },
};

function LogoIcon({ size = 28, variant = "default" }: { size?: number; variant?: LogoVariant }) {
  // Colors based on variant
  const topFill = variant === "white" ? "rgba(255,255,255,0.9)" : "white";
  const topStroke = variant === "white" ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.4)";
  const bottomFill = variant === "white" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.55)";
  const bottomStroke = variant === "white" ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.25)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top cube — full opacity, positioned upper-left */}
      <path
        d="M22 24 L40 16 L58 24 L58 34 L40 42 L22 34 Z"
        fill={topFill}
        opacity="0.9"
      />
      <path
        d="M22 24 L40 32 L58 24"
        stroke={topStroke}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M40 32 L40 42"
        stroke={topStroke}
        strokeWidth="1.5"
      />
      {/* Bottom cube — offset to bottom-right, semi-transparent = motion */}
      <path
        d="M26 40 L44 32 L62 40 L62 50 L44 58 L26 50 Z"
        fill={bottomFill}
      />
      <path
        d="M26 40 L44 48 L62 40"
        stroke={bottomStroke}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M44 48 L44 58"
        stroke={bottomStroke}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function StockFlowLogo({
  size = "md",
  showText = false,
  variant = "default",
  className,
}: StockFlowLogoProps) {
  const config = sizeConfig[size];

  const iconWrapper = cn(
    "flex items-center justify-center shrink-0",
    config.container,
    config.radius,
    variant === "white"
      ? "bg-white/20 backdrop-blur-sm"
      : "bg-gradient-to-br from-primary-500 to-accent-600 shadow-md shadow-primary-500/20",
    variant === "mono" && "bg-neutral-900 dark:bg-white",
  );

  if (!showText) {
    return (
      <div className={cn(iconWrapper, className)}>
        <LogoIcon size={config.icon} variant={variant} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", config.gap, className)}>
      <div className={iconWrapper}>
        <LogoIcon size={config.icon} variant={variant} />
      </div>
      <span
        className={cn(
          "font-bold tracking-tight",
          config.text,
          variant === "white"
            ? "text-white"
            : "text-neutral-900 dark:text-white",
        )}
      >
        Stock
        <span
          className={cn(
            variant === "white"
              ? "text-white/70"
              : "text-primary-400",
          )}
        >
          Flow
        </span>
      </span>
    </div>
  );
}

/**
 * Raw SVG logo for use in non-React contexts (emails, favicon, etc.)
 * Returns the SVG markup as a string.
 */
export function getLogoSvgString(size = 80): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 24 L40 16 L58 24 L58 34 L40 42 L22 34 Z" fill="white" opacity="0.9"/>
    <path d="M22 24 L40 32 L58 24" stroke="rgba(99,102,241,0.4)" stroke-width="1.5" fill="none"/>
    <path d="M40 32 L40 42" stroke="rgba(99,102,241,0.4)" stroke-width="1.5"/>
    <path d="M26 40 L44 32 L62 40 L62 50 L44 58 L26 50 Z" fill="rgba(255,255,255,0.55)"/>
    <path d="M26 40 L44 48 L62 40" stroke="rgba(99,102,241,0.25)" stroke-width="1.5" fill="none"/>
    <path d="M44 48 L44 58" stroke="rgba(99,102,241,0.25)" stroke-width="1.5"/>
  </svg>`;
}
