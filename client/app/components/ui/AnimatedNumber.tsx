import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  formatFn = (n) => Math.round(n).toLocaleString("es-CO"),
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inViewRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(inViewRef, { once: true, margin: "-50px" });
  const [isMounted, setIsMounted] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isInView || hasAnimated.current || !ref.current) return;
    hasAnimated.current = true;

    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = formatFn(latest);
      },
    });

    return () => controls.stop();
  }, [isMounted, isInView, value, duration, formatFn]);

  return (
    <span ref={inViewRef} className={className}>
      <span ref={ref}>{formatFn(isMounted ? 0 : value)}</span>
    </span>
  );
}
