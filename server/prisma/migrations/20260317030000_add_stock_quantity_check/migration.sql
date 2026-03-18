-- Add CHECK constraints to prevent negative stock quantities
ALTER TABLE "warehouse_stocks" ADD CONSTRAINT "warehouse_stocks_quantity_check" CHECK ("quantity" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_check" CHECK ("stock" >= 0);
