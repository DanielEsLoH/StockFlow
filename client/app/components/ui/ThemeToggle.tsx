import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "~/hooks/useTheme";
import type { Theme } from "~/lib/theme";

const icons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-5 w-5" />,
  dark: <Moon className="h-5 w-5" />,
  system: <Monitor className="h-5 w-5" />,
};

const labels: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System",
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Track if component has mounted to avoid SSR hydration issues with animations
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl
                 bg-neutral-100 text-neutral-600 transition-colors
                 hover:bg-neutral-200 hover:text-neutral-900
                 dark:bg-neutral-800 dark:text-neutral-400
                 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
      title={labels[theme]}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={isMounted ? { opacity: 0, rotate: -90, scale: 0.5 } : false}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {icons[theme]}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
