import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import type { Route } from './+types/root';
import { queryClient } from '~/lib/query-client';
import { ToastProvider } from '~/components/ui/Toast';
import { AuthInitializer } from '~/components/auth';
import './styles/tailwind.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@200..800&family=JetBrains+Mono:wght@100..800&display=swap',
  },
  { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.json' },
];

// Theme initialization script to prevent flash
const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme') || 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  })();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthInitializer>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // Log the error for debugging
  console.error("[Root ErrorBoundary] Caught error:", error);
  if (error instanceof Error) {
    console.error("[Root ErrorBoundary] Error message:", error.message);
    console.error("[Root ErrorBoundary] Error stack:", error.stack);
  }
  if (isRouteErrorResponse(error)) {
    console.error("[Root ErrorBoundary] Route error status:", error.status);
  }

  // Check if it's an auth error - redirect to login instead of showing error
  const isAuthError =
    (error instanceof Error &&
      (error.message.includes("401") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("Authentication") ||
        error.message.includes("No refresh token") ||
        error.message.includes("Request failed with status code 401"))) ||
    (isRouteErrorResponse(error) && error.status === 401);

  // Redirect to login for auth errors (client-side only)
  if (isAuthError && typeof window !== "undefined") {
    console.log("[Root ErrorBoundary] Auth error detected, redirecting to login");
    // Clear any stale auth data
    try {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("auth-storage");
    } catch {
      // Ignore storage errors
    }
    window.location.replace("/login");
    return null;
  }

  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-error-500">{message}</h1>
        <p className="mb-6 text-neutral-600 dark:text-neutral-400">{details}</p>
        {stack && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-4 text-left text-xs dark:bg-neutral-800">
            <code>{stack}</code>
          </pre>
        )}
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-500 px-6 py-3 text-white transition-colors hover:bg-primary-600"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}