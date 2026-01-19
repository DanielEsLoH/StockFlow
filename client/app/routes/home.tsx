import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { motion } from "framer-motion";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "StockFlow - Inventory & Billing System" },
    {
      name: "description",
      content: "Multi-tenant SaaS inventory and billing system",
    },
  ];
}

export default function Home() {
  // Track if component has mounted (client-side)
  // This prevents SSR from rendering with opacity: 0
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={isMounted ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={isMounted ? { scale: 0.8 } : false}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-500/30">
            <svg
              className="h-12 w-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
        </motion.div>

        <h1 className="mb-4 font-display text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Stock<span className="text-gradient">Flow</span>
        </h1>

        <p className="mb-8 max-w-md text-lg text-neutral-600 dark:text-neutral-400">
          Multi-tenant SaaS inventory and billing system.
          <br />
          Built with React Router 7 + TypeScript + Tailwind CSS
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-8 py-3 font-medium text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600"
          >
            Get Started
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-8 py-3 font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            Dashboard
          </motion.a>
        </div>
      </motion.div>

      <motion.div
        initial={isMounted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-8 text-sm text-neutral-500 dark:text-neutral-500"
      >
        Phase 1: Foundations Setup Complete
      </motion.div>
    </div>
  );
}
