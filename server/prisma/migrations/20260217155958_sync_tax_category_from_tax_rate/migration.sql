-- Sync tax_category based on existing tax_rate values
-- Products with tax_rate=0 that were defaulted to GRAVADO_19 should be EXCLUIDO
-- Products with tax_rate=5 that were defaulted to GRAVADO_19 should be GRAVADO_5
-- Products with tax_rate=19 are already correct (GRAVADO_19)

UPDATE products SET tax_category = 'EXCLUIDO' WHERE tax_rate = 0 AND tax_category = 'GRAVADO_19';
UPDATE products SET tax_category = 'GRAVADO_5' WHERE tax_rate = 5 AND tax_category = 'GRAVADO_19';

-- Also sync tax_rate from tax_category for any future consistency
-- (new products created via the API already derive tax_rate from tax_category)
UPDATE products SET tax_rate = 19 WHERE tax_category = 'GRAVADO_19' AND tax_rate != 19;
UPDATE products SET tax_rate = 5 WHERE tax_category = 'GRAVADO_5' AND tax_rate != 5;
UPDATE products SET tax_rate = 0 WHERE tax_category IN ('EXENTO', 'EXCLUIDO') AND tax_rate != 0;

-- Sync invoice_items too
UPDATE invoice_items SET tax_category = 'EXCLUIDO' WHERE tax_rate = 0 AND tax_category = 'GRAVADO_19';
UPDATE invoice_items SET tax_category = 'GRAVADO_5' WHERE tax_rate = 5 AND tax_category = 'GRAVADO_19';
