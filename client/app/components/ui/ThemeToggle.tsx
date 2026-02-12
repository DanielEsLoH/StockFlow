import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "~/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show the opposite icon: moon when light (click to go dark), sun when dark (click to go light)
  const icon =
    theme === "light" ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    );
  const label = theme === "light" ? "Modo oscuro" : "Modo claro";

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
      title={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={isMounted ? { opacity: 0, rotate: -90, scale: 0.5 } : false}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
