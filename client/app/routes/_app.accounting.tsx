import { redirect } from "react-router";
import type { Route } from "./+types/_app.accounting";

export function loader({}: Route.LoaderArgs) {
  throw redirect("/accounting/accounts");
}

export default function AccountingIndex() {
  return null;
}
