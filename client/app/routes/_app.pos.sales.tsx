import { redirect } from "react-router";
import type { Route } from "./+types/_app.pos.sales";

// Redirect /pos/sales to /invoices?source=POS
// This is part of the unified navigation where all invoices
// (both manual and POS) are shown in the /invoices route with filters
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.searchParams);
  params.set("source", "POS");
  return redirect(`/invoices?${params.toString()}`);
}

export default function POSSalesRedirect() {
  // This should never render due to the loader redirect
  return null;
}
