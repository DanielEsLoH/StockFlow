export { ProductsModule } from './products.module';
export { ProductsService } from './products.service';
export type {
  ProductResponse,
  PaginatedProductsResponse,
} from './products.service';
export {
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  StockAdjustmentType,
  FilterProductsDto,
} from './dto';