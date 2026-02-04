import { redirect } from "react-router";
import type { Route } from "./+types/_app.dian.documents.$id";

// Redirect /dian/documents/:id to /invoices
// DIAN document details are now shown on the invoice detail page.
// Note: The invoice ID and DIAN document ID may differ, so we redirect to the invoices list.
export function loader() {
  return redirect("/invoices");
}

export default function DianDocumentDetailRedirect() {
  // This should never render due to the loader redirect
  return null;
}
