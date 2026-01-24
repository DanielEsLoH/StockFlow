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
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-error-500 mb-4">Error</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Ha ocurrido un error inesperado.
        </p>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 text-left text-xs text-neutral-800 dark:text-neutral-200">
            {error.message}
          </pre>
        )}
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
