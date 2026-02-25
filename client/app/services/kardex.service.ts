import { api } from "~/lib/api";
import type { KardexReport } from "~/types/kardex";

interface KardexParams {
  productId: string;
  warehouseId?: string;
  fromDate?: string;
  toDate?: string;
}

export const kardexService = {
  getKardex: (
    productId: string,
    warehouseId?: string,
    fromDate?: string,
    toDate?: string,
  ) =>
    api
      .get<KardexReport>("/reports/kardex", {
        params: { productId, warehouseId, fromDate, toDate },
      })
      .then((r) => r.data),
};
