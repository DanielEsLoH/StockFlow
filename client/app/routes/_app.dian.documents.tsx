import { redirect } from 'react-router';

// Redirect /dian/documents to /invoices
// DIAN information is now integrated into the invoice detail pages.
// Users can see DIAN status, CUFE, and download XML from invoice details.
export function loader() {
  return redirect('/invoices');
}

export default function DianDocumentsRedirect() {
  // This should never render due to the loader redirect
  return null;
}
