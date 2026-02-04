import { redirect } from "react-router";
import type { Route } from "./+types/_app.pos.sales.$id";

// Redirect /pos/sales/:id to /invoices/:id
// This is part of the unified navigation where all invoice details
// are shown at /invoices/:id regardless of source (manual or POS)
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/invoices/${params.id}`);
}

export default function POSSaleDetailRedirect() {
  // This should never render due to the loader redirect
  return null;
}
