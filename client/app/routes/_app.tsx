import type { Route } from "./+types/_app";
import { AppLayout } from "~/components/layout";
import { requireAuth } from "~/lib/auth.server";

// Meta function for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: "StockFlow - Panel de Control" },
    {
      name: "description",
      content: "Gestiona tu inventario de forma inteligente",
    },
  ];
};

// Loader to check authentication
// Redirects unauthenticated users to login page
export function loader({ request }: Route.LoaderArgs) {
  requireAuth(request);
  return null;
}

export default function AppLayoutRoute() {
  return <AppLayout />;
}

// Error boundary for the app layout
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // Log the error for debugging
  console.error("[ErrorBoundary] Caught error:", error);
  if (error instanceof Error) {
    console.error("[ErrorBoundary] Error message:", error.message);
    console.error("[ErrorBoundary] Error stack:", error.stack);
  }

  // Check if it's an auth error (401) - redirect to login instead of showing error
  const isAuthError =
    error instanceof Error &&
    (error.message.includes("401") ||
      error.message.includes("Unauthorized") ||
      error.message.includes("Authentication") ||
      error.message.includes("token") ||
      error.message.includes("Request failed with status code 401"));

  // Redirect to login for auth errors
  if (isAuthError && typeof window !== "undefined") {
    console.log("[ErrorBoundary] Auth error detected, redirecting to login");
    window.location.replace("/login");
    return null;
  }

  // Get error message safely
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center px-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-error-500 mb-4">Error</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Ha ocurrido un error inesperado.
        </p>
        {/* Always show error details for debugging */}
        <div className="mt-4 max-w-xl overflow-auto rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 text-left text-xs text-neutral-800 dark:text-neutral-200">
          <p className="font-bold mb-2">Error: {errorMessage}</p>
          {errorStack && (
            <pre className="whitespace-pre-wrap break-words">{errorStack}</pre>
          )}
        </div>
        <a
          href="/dashboard"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
