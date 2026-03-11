import { PrismaClient } from '@prisma/client';
import { SeedContext, ProductRecord, CategoryRecord } from './types';
import { generateEAN13, productImageUrl } from './helpers';

// ============================================================================
// CATEGORY + PRODUCT DATA
// ============================================================================

interface CategoryInput {
  name: string;
  description: string;
  color: string;
}

interface DemoProductInput {
  sku: string;
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  maxStock: number;
  brand: string;
  categoryName: string;
}

interface TenantProductInput {
  sku: string;
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  maxStock: number;
  brand: string;
  catKey: string;
}

// ── Tienda Demo Categories (15) ──
const demoCategoriesData: CategoryInput[] = [
  { name: 'Electrónica', description: 'Televisores, consolas, cámaras y gadgets', color: '#3b82f6' },
  { name: 'Computadores y Laptops', description: 'Portátiles, PCs de escritorio y monitores', color: '#6366f1' },
  { name: 'Celulares y Tablets', description: 'Smartphones, tablets y accesorios móviles', color: '#8b5cf6' },
  { name: 'Audio y Video', description: 'Audífonos, parlantes, barras de sonido', color: '#a855f7' },
  { name: 'Ropa Hombre', description: 'Camisas, pantalones, chaquetas masculinas', color: '#10b981' },
  { name: 'Ropa Mujer', description: 'Vestidos, blusas, pantalones femeninos', color: '#14b8a6' },
  { name: 'Calzado', description: 'Tenis, zapatos formales, botas', color: '#06b6d4' },
  { name: 'Accesorios de Moda', description: 'Relojes, gafas, bolsos, billeteras', color: '#0ea5e9' },
  { name: 'Alimentos y Bebidas', description: 'Productos alimenticios y bebidas', color: '#f59e0b' },
  { name: 'Hogar y Decoración', description: 'Lámparas, sábanas, cortinas, decoración', color: '#f97316' },
  { name: 'Muebles', description: 'Sillas, escritorios, sofás, camas', color: '#ef4444' },
  { name: 'Deportes y Fitness', description: 'Equipamiento deportivo y fitness', color: '#dc2626' },
  { name: 'Juguetes', description: 'Juguetes, juegos de mesa, LEGO', color: '#ec4899' },
  { name: 'Papelería y Oficina', description: 'Artículos de oficina y papelería', color: '#64748b' },
  { name: 'Ferretería y Herramientas', description: 'Herramientas y materiales de construcción', color: '#78716c' },
];

// ── Distribuidora Nacional Categories (6) ──
const dnCategoriesData: CategoryInput[] = [
  { name: 'Aseo y Limpieza', description: 'Productos de aseo hogar e industrial', color: '#10b981' },
  { name: 'Alimentos al Mayor', description: 'Granos, aceites y abarrotes por bulto', color: '#f59e0b' },
  { name: 'Bebidas al Mayor', description: 'Gaseosas, jugos y agua por caja', color: '#3b82f6' },
  { name: 'Cuidado Personal', description: 'Shampoo, jabón, cremas al mayor', color: '#ec4899' },
  { name: 'Desechables', description: 'Vasos, platos, bolsas por paquete', color: '#78716c' },
  { name: 'Hogar Mayorista', description: 'Ollas, sartenes, utensilios al mayor', color: '#f97316' },
];

// ── Nuevo Negocio Categories (3) ──
const nnCategoriesData: CategoryInput[] = [
  { name: 'Camisetas y Tops', description: 'Camisetas, polos y tops casuales', color: '#3b82f6' },
  { name: 'Pantalones y Jeans', description: 'Jeans, joggers y pantalones casuales', color: '#10b981' },
  { name: 'Accesorios Urbanos', description: 'Gorras, gafas, correas y calzado', color: '#f59e0b' },
];

// ── Papelería Central Categories (8) ──
const pcCategoriesData: CategoryInput[] = [
  { name: 'Cuadernos', description: 'Cuadernos escolares y profesionales', color: '#3b82f6' },
  { name: 'Escritura', description: 'Lápices, esferos, marcadores', color: '#6366f1' },
  { name: 'Papel y Cartulinas', description: 'Resmas, cartulinas, papel especial', color: '#f59e0b' },
  { name: 'Arte y Manualidades', description: 'Pinturas, pinceles, pegamentos', color: '#ec4899' },
  { name: 'Organización', description: 'Carpetas, archivadores, folders', color: '#10b981' },
  { name: 'Tecnología Escolar', description: 'Calculadoras, USB, audífonos', color: '#8b5cf6' },
  { name: 'Mochilas y Morrales', description: 'Maletas escolares y universitarias', color: '#ef4444' },
  { name: 'Oficina', description: 'Grapadoras, perforadoras, suministros', color: '#64748b' },
];

// ── Tienda Demo Products (85) ──
const demoProductsData: DemoProductInput[] = [
  // Electrónica (6)
  { sku: 'ELEC-001', name: 'Televisor Samsung 55" 4K UHD', description: 'Smart TV Samsung 55 pulgadas 4K UHD con HDR', costPrice: 1800000, salePrice: 2500000, taxRate: 19, stock: 12, minStock: 5, maxStock: 30, brand: 'Samsung', categoryName: 'Electrónica' },
  { sku: 'ELEC-002', name: 'Consola PlayStation 5', description: 'Consola PS5 edición estándar con disco', costPrice: 2200000, salePrice: 2800000, taxRate: 19, stock: 8, minStock: 3, maxStock: 20, brand: 'Sony', categoryName: 'Electrónica' },
  { sku: 'ELEC-003', name: 'Consola Nintendo Switch OLED', description: 'Nintendo Switch modelo OLED pantalla 7"', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 15, minStock: 5, maxStock: 25, brand: 'Nintendo', categoryName: 'Electrónica' },
  { sku: 'ELEC-004', name: 'Cámara Canon EOS Rebel T7', description: 'Cámara DSLR Canon con lente 18-55mm', costPrice: 2400000, salePrice: 3200000, taxRate: 19, stock: 4, minStock: 2, maxStock: 10, brand: 'Canon', categoryName: 'Electrónica' },
  { sku: 'ELEC-005', name: 'Drone DJI Mini 3 Pro', description: 'Drone compacto con cámara 4K y gimbal', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 3, minStock: 2, maxStock: 8, brand: 'DJI', categoryName: 'Electrónica' },
  { sku: 'ELEC-006', name: 'Apple Watch Series 9', description: 'Smartwatch Apple 45mm GPS + Cellular', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 0, minStock: 5, maxStock: 15, brand: 'Apple', categoryName: 'Electrónica' },
  // Computadores y Laptops (6)
  { sku: 'COMP-001', name: 'Laptop Dell Inspiron 15', description: 'Intel Core i5, 8GB RAM, 512GB SSD', costPrice: 1600000, salePrice: 2100000, taxRate: 19, stock: 18, minStock: 5, maxStock: 30, brand: 'Dell', categoryName: 'Computadores y Laptops' },
  { sku: 'COMP-002', name: 'Laptop HP Pavilion 15', description: 'AMD Ryzen 5, 16GB RAM, 512GB SSD', costPrice: 1500000, salePrice: 1900000, taxRate: 19, stock: 14, minStock: 5, maxStock: 25, brand: 'HP', categoryName: 'Computadores y Laptops' },
  { sku: 'COMP-003', name: 'MacBook Air M2', description: 'Apple M2, 8GB RAM, 256GB SSD, 13.6"', costPrice: 4200000, salePrice: 5500000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Apple', categoryName: 'Computadores y Laptops' },
  { sku: 'COMP-004', name: 'PC Gamer RTX 4070', description: 'Intel i7, RTX 4070, 32GB RAM, 1TB NVMe', costPrice: 3200000, salePrice: 4200000, taxRate: 19, stock: 5, minStock: 2, maxStock: 8, brand: 'Custom', categoryName: 'Computadores y Laptops' },
  { sku: 'COMP-005', name: 'Monitor Samsung 27" Curvo', description: 'Monitor LED 27" Full HD 75Hz', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 22, minStock: 8, maxStock: 40, brand: 'Samsung', categoryName: 'Computadores y Laptops' },
  { sku: 'COMP-006', name: 'Monitor LG UltraWide 34"', description: 'Monitor IPS 34" WQHD 21:9', costPrice: 1100000, salePrice: 1400000, taxRate: 19, stock: 2, minStock: 3, maxStock: 10, brand: 'LG', categoryName: 'Computadores y Laptops' },
  // Celulares y Tablets (6)
  { sku: 'CEL-001', name: 'iPhone 15 Pro 256GB', description: 'Apple iPhone 15 Pro Titanio Natural', costPrice: 3800000, salePrice: 4500000, taxRate: 19, stock: 10, minStock: 5, maxStock: 20, brand: 'Apple', categoryName: 'Celulares y Tablets' },
  { sku: 'CEL-002', name: 'Samsung Galaxy S24 Ultra', description: 'Samsung S24 Ultra 256GB 5G', costPrice: 3200000, salePrice: 3800000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
  { sku: 'CEL-003', name: 'Xiaomi Redmi Note 13 Pro', description: 'Redmi Note 13 Pro 256GB 5G', costPrice: 700000, salePrice: 900000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Xiaomi', categoryName: 'Celulares y Tablets' },
  { sku: 'CEL-004', name: 'iPad Air 5ta Gen', description: 'iPad Air 10.9" 64GB WiFi', costPrice: 2000000, salePrice: 2500000, taxRate: 19, stock: 0, minStock: 4, maxStock: 12, brand: 'Apple', categoryName: 'Celulares y Tablets' },
  { sku: 'CEL-005', name: 'Samsung Galaxy Tab S9', description: 'Galaxy Tab S9 11" 128GB WiFi', costPrice: 1800000, salePrice: 2200000, taxRate: 19, stock: 7, minStock: 3, maxStock: 15, brand: 'Samsung', categoryName: 'Celulares y Tablets' },
  { sku: 'CEL-006', name: 'Tablet Lenovo Tab M10 Plus', description: 'Tab M10 Plus 10.6" 64GB', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 30, minStock: 10, maxStock: 50, brand: 'Lenovo', categoryName: 'Celulares y Tablets' },
  // Audio y Video (5)
  { sku: 'AUD-001', name: 'Audífonos Sony WH-1000XM5', description: 'Audífonos inalámbricos con ANC', costPrice: 1200000, salePrice: 1500000, taxRate: 19, stock: 12, minStock: 5, maxStock: 25, brand: 'Sony', categoryName: 'Audio y Video' },
  { sku: 'AUD-002', name: 'AirPods Pro 2da Gen', description: 'Apple AirPods Pro con estuche MagSafe', costPrice: 850000, salePrice: 1100000, taxRate: 19, stock: 15, minStock: 8, maxStock: 30, brand: 'Apple', categoryName: 'Audio y Video' },
  { sku: 'AUD-003', name: 'Parlante JBL Flip 6', description: 'Parlante Bluetooth portátil resistente al agua', costPrice: 350000, salePrice: 450000, taxRate: 19, stock: 20, minStock: 10, maxStock: 40, brand: 'JBL', categoryName: 'Audio y Video' },
  { sku: 'AUD-004', name: 'Barra de Sonido Samsung HW-B550', description: 'Soundbar 2.1 con subwoofer inalámbrico', costPrice: 600000, salePrice: 800000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Samsung', categoryName: 'Audio y Video' },
  { sku: 'AUD-005', name: 'Micrófono Blue Yeti USB', description: 'Micrófono condensador USB para streaming', costPrice: 420000, salePrice: 550000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Blue', categoryName: 'Audio y Video' },
  // Ropa Hombre (6)
  { sku: 'RH-001', name: 'Camiseta Polo Lacoste', description: 'Polo clásico algodón piqué', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Lacoste', categoryName: 'Ropa Hombre' },
  { sku: 'RH-002', name: 'Camisa Formal Arturo Calle', description: 'Camisa manga larga algodón', costPrice: 95000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 12, maxStock: 60, brand: 'Arturo Calle', categoryName: 'Ropa Hombre' },
  { sku: 'RH-003', name: 'Jean Levi\'s 501 Original', description: 'Jean clásico corte recto', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 28, minStock: 10, maxStock: 50, brand: 'Levi\'s', categoryName: 'Ropa Hombre' },
  { sku: 'RH-004', name: 'Chaqueta The North Face', description: 'Chaqueta impermeable ThermoBall', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'The North Face', categoryName: 'Ropa Hombre' },
  { sku: 'RH-005', name: 'Bermuda Tommy Hilfiger', description: 'Bermuda chino algodón', costPrice: 150000, salePrice: 220000, taxRate: 19, stock: 22, minStock: 8, maxStock: 40, brand: 'Tommy Hilfiger', categoryName: 'Ropa Hombre' },
  { sku: 'RH-006', name: 'Sudadera Adidas Originals', description: 'Sudadera con capucha algodón', costPrice: 120000, salePrice: 180000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Adidas', categoryName: 'Ropa Hombre' },
  // Ropa Mujer (6)
  { sku: 'RM-001', name: 'Vestido Zara Casual', description: 'Vestido midi estampado floral', costPrice: 160000, salePrice: 250000, taxRate: 19, stock: 18, minStock: 8, maxStock: 35, brand: 'Zara', categoryName: 'Ropa Mujer' },
  { sku: 'RM-002', name: 'Blusa Studio F Elegante', description: 'Blusa manga larga satinada', costPrice: 75000, salePrice: 120000, taxRate: 19, stock: 30, minStock: 12, maxStock: 50, brand: 'Studio F', categoryName: 'Ropa Mujer' },
  { sku: 'RM-003', name: 'Jean Mom Fit', description: 'Jean tiro alto corte mom', costPrice: 110000, salePrice: 180000, taxRate: 19, stock: 24, minStock: 10, maxStock: 45, brand: 'Pull&Bear', categoryName: 'Ropa Mujer' },
  { sku: 'RM-004', name: 'Chaqueta de Cuero Sintético', description: 'Chaqueta biker cuero sintético', costPrice: 250000, salePrice: 380000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Bershka', categoryName: 'Ropa Mujer' },
  { sku: 'RM-005', name: 'Falda Midi Plisada', description: 'Falda midi plisada elegante', costPrice: 90000, salePrice: 150000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Mango', categoryName: 'Ropa Mujer' },
  { sku: 'RM-006', name: 'Conjunto Deportivo Nike', description: 'Conjunto leggings + top deportivo', costPrice: 220000, salePrice: 320000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Nike', categoryName: 'Ropa Mujer' },
  // Calzado (5)
  { sku: 'CAL-001', name: 'Tenis Nike Air Max 90', description: 'Tenis clásicos Air Max 90', costPrice: 320000, salePrice: 450000, taxRate: 19, stock: 16, minStock: 8, maxStock: 30, brand: 'Nike', categoryName: 'Calzado' },
  { sku: 'CAL-002', name: 'Zapatos Formales Bosi', description: 'Zapatos Oxford cuero genuino', costPrice: 180000, salePrice: 280000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Bosi', categoryName: 'Calzado' },
  { sku: 'CAL-003', name: 'Botas Timberland Premium', description: 'Botas 6-inch premium waterproof', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Timberland', categoryName: 'Calzado' },
  { sku: 'CAL-004', name: 'Sandalias Crocs Classic', description: 'Crocs Classic Clog unisex', costPrice: 100000, salePrice: 150000, taxRate: 19, stock: 35, minStock: 15, maxStock: 60, brand: 'Crocs', categoryName: 'Calzado' },
  { sku: 'CAL-005', name: 'Tenis Adidas Ultraboost', description: 'Tenis running Ultraboost 23', costPrice: 280000, salePrice: 380000, taxRate: 19, stock: 14, minStock: 6, maxStock: 25, brand: 'Adidas', categoryName: 'Calzado' },
  // Accesorios de Moda (5)
  { sku: 'ACC-001', name: 'Reloj Casio G-Shock', description: 'Reloj digital resistente golpes y agua', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Casio', categoryName: 'Accesorios de Moda' },
  { sku: 'ACC-002', name: 'Gafas Ray-Ban Aviator', description: 'Gafas de sol Aviator Classic', costPrice: 350000, salePrice: 480000, taxRate: 19, stock: 10, minStock: 5, maxStock: 20, brand: 'Ray-Ban', categoryName: 'Accesorios de Moda' },
  { sku: 'ACC-003', name: 'Bolso Coach Crossbody', description: 'Bolso bandolera cuero genuino', costPrice: 480000, salePrice: 650000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Coach', categoryName: 'Accesorios de Moda' },
  { sku: 'ACC-004', name: 'Cinturón Cuero Italiano', description: 'Cinturón cuero italiano hebilla clásica', costPrice: 55000, salePrice: 85000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Vélez', categoryName: 'Accesorios de Moda' },
  { sku: 'ACC-005', name: 'Billetera Tommy Hilfiger', description: 'Billetera cuero con portamonedas', costPrice: 80000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, maxStock: 40, brand: 'Tommy Hilfiger', categoryName: 'Accesorios de Moda' },
  // Alimentos y Bebidas (8)
  { sku: 'ALI-001', name: 'Café Juan Valdez 500g', description: 'Café molido premium origen Huila', costPrice: 25000, salePrice: 35000, taxRate: 5, stock: 80, minStock: 30, maxStock: 150, brand: 'Juan Valdez', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-002', name: 'Chocolate Corona 500g', description: 'Chocolate tradicional en pastillas', costPrice: 5500, salePrice: 8500, taxRate: 0, stock: 120, minStock: 50, maxStock: 200, brand: 'Corona', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-003', name: 'Aceite Girasol Premier 3L', description: 'Aceite de girasol premium', costPrice: 22000, salePrice: 28000, taxRate: 0, stock: 60, minStock: 25, maxStock: 100, brand: 'Premier', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-004', name: 'Arroz Diana 5kg', description: 'Arroz blanco premium', costPrice: 18000, salePrice: 22000, taxRate: 0, stock: 100, minStock: 40, maxStock: 180, brand: 'Diana', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-005', name: 'Leche Alpina Entera 6-pack', description: 'Leche entera UHT 1L x 6', costPrice: 14000, salePrice: 18500, taxRate: 0, stock: 45, minStock: 20, maxStock: 80, brand: 'Alpina', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-006', name: 'Galletas Oreo Pack Familiar', description: 'Galletas Oreo 6 paquetes', costPrice: 8500, salePrice: 12000, taxRate: 0, stock: 70, minStock: 30, maxStock: 120, brand: 'Oreo', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-007', name: 'Gaseosa Coca-Cola 2.5L', description: 'Coca-Cola Original 2.5 litros', costPrice: 5500, salePrice: 7500, taxRate: 0, stock: 90, minStock: 40, maxStock: 150, brand: 'Coca-Cola', categoryName: 'Alimentos y Bebidas' },
  { sku: 'ALI-008', name: 'Agua Cristal 6-pack', description: 'Agua Cristal 600ml x 6', costPrice: 6500, salePrice: 9000, taxRate: 0, stock: 85, minStock: 35, maxStock: 140, brand: 'Cristal', categoryName: 'Alimentos y Bebidas' },
  // Hogar y Decoración (6)
  { sku: 'HOG-001', name: 'Lámpara LED Escritorio Philips', description: 'Lámpara LED regulable con USB', costPrice: 55000, salePrice: 75000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Philips', categoryName: 'Hogar y Decoración' },
  { sku: 'HOG-002', name: 'Set Sábanas 300 Hilos Queen', description: 'Juego sábanas algodón egipcio', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
  { sku: 'HOG-003', name: 'Cortinas Blackout 2 Paneles', description: 'Cortinas blackout térmicas', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 22, minStock: 10, maxStock: 40, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },
  { sku: 'HOG-004', name: 'Alfombra Decorativa 160x230', description: 'Alfombra moderna pelo corto', costPrice: 180000, salePrice: 250000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Kalpana', categoryName: 'Hogar y Decoración' },
  { sku: 'HOG-005', name: 'Set Toallas 6 Piezas', description: 'Toallas algodón 600gsm', costPrice: 65000, salePrice: 95000, taxRate: 19, stock: 30, minStock: 12, maxStock: 50, brand: 'Cannon', categoryName: 'Hogar y Decoración' },
  { sku: 'HOG-006', name: 'Espejo Decorativo Redondo', description: 'Espejo pared marco dorado 60cm', costPrice: 95000, salePrice: 145000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Home Collection', categoryName: 'Hogar y Decoración' },
  // Muebles (5)
  { sku: 'MUE-001', name: 'Silla Oficina Ergonómica', description: 'Silla ergonómica malla con lumbar', costPrice: 380000, salePrice: 520000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Rimax', categoryName: 'Muebles' },
  { sku: 'MUE-002', name: 'Escritorio en L Gaming', description: 'Escritorio esquinero con porta PC', costPrice: 500000, salePrice: 680000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'Maderkit', categoryName: 'Muebles' },
  { sku: 'MUE-003', name: 'Sofá 3 Puestos Moderno', description: 'Sofá tela gris estructura madera', costPrice: 1400000, salePrice: 1800000, taxRate: 19, stock: 4, minStock: 2, maxStock: 8, brand: 'Jamar', categoryName: 'Muebles' },
  { sku: 'MUE-004', name: 'Mesa de Centro Moderna', description: 'Mesa centro vidrio templado', costPrice: 250000, salePrice: 350000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Tugó', categoryName: 'Muebles' },
  { sku: 'MUE-005', name: 'Cama Queen con Base', description: 'Base cama queen + cabecero tapizado', costPrice: 900000, salePrice: 1200000, taxRate: 19, stock: 3, minStock: 2, maxStock: 6, brand: 'Spring', categoryName: 'Muebles' },
  // Deportes y Fitness (6)
  { sku: 'DEP-001', name: 'Balón Fútbol Adidas Pro', description: 'Balón oficial FIFA Quality Pro', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 25, minStock: 10, maxStock: 45, brand: 'Adidas', categoryName: 'Deportes y Fitness' },
  { sku: 'DEP-002', name: 'Raqueta Tenis Wilson Pro', description: 'Raqueta profesional grafito', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Wilson', categoryName: 'Deportes y Fitness' },
  { sku: 'DEP-003', name: 'Set Mancuernas 20kg', description: 'Par mancuernas ajustables 1-10kg', costPrice: 130000, salePrice: 180000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Everlast', categoryName: 'Deportes y Fitness' },
  { sku: 'DEP-004', name: 'Colchoneta Yoga TPE', description: 'Mat yoga antideslizante 6mm', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 35, minStock: 15, maxStock: 60, brand: 'Manduka', categoryName: 'Deportes y Fitness' },
  { sku: 'DEP-005', name: 'Bicicleta Spinning Pro', description: 'Bicicleta estática spinning', costPrice: 650000, salePrice: 850000, taxRate: 19, stock: 4, minStock: 2, maxStock: 8, brand: 'Athletic', categoryName: 'Deportes y Fitness' },
  { sku: 'DEP-006', name: 'Set Bandas Elásticas 5pz', description: 'Kit bandas resistencia niveles', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Theraband', categoryName: 'Deportes y Fitness' },
  // Juguetes (5)
  { sku: 'JUG-001', name: 'LEGO Star Wars Millennium', description: 'Set LEGO 1353 piezas Halcón Milenario', costPrice: 280000, salePrice: 350000, taxRate: 19, stock: 6, minStock: 3, maxStock: 12, brand: 'LEGO', categoryName: 'Juguetes' },
  { sku: 'JUG-002', name: 'Barbie Dreamhouse', description: 'Casa de muñecas Barbie 3 pisos', costPrice: 140000, salePrice: 180000, taxRate: 19, stock: 8, minStock: 4, maxStock: 15, brand: 'Mattel', categoryName: 'Juguetes' },
  { sku: 'JUG-003', name: 'Hot Wheels Pista Épica', description: 'Pista Hot Wheels con looping', costPrice: 90000, salePrice: 120000, taxRate: 19, stock: 12, minStock: 5, maxStock: 20, brand: 'Hot Wheels', categoryName: 'Juguetes' },
  { sku: 'JUG-004', name: 'Rompecabezas 1000 Piezas', description: 'Puzzle paisaje 1000 piezas', costPrice: 32000, salePrice: 45000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Ravensburger', categoryName: 'Juguetes' },
  { sku: 'JUG-005', name: 'Monopoly Edición Colombia', description: 'Juego de mesa Monopoly Colombia', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 15, minStock: 6, maxStock: 25, brand: 'Hasbro', categoryName: 'Juguetes' },
  // Papelería y Oficina (5)
  { sku: 'PAP-001', name: 'Resma Papel Carta 500h', description: 'Papel bond 75g carta 500 hojas', costPrice: 14000, salePrice: 18000, taxRate: 19, stock: 80, minStock: 30, maxStock: 150, brand: 'Reprograf', categoryName: 'Papelería y Oficina' },
  { sku: 'PAP-002', name: 'Cuaderno Argollado 100h', description: 'Cuaderno profesional argollado', costPrice: 6000, salePrice: 8500, taxRate: 19, stock: 100, minStock: 40, maxStock: 180, brand: 'Norma', categoryName: 'Papelería y Oficina' },
  { sku: 'PAP-003', name: 'Set Marcadores 12 Colores', description: 'Marcadores permanentes Sharpie', costPrice: 18000, salePrice: 25000, taxRate: 19, stock: 45, minStock: 20, maxStock: 80, brand: 'Sharpie', categoryName: 'Papelería y Oficina' },
  { sku: 'PAP-004', name: 'Grapadora Industrial', description: 'Grapadora capacidad 100 hojas', costPrice: 25000, salePrice: 35000, taxRate: 19, stock: 20, minStock: 8, maxStock: 35, brand: 'Bostitch', categoryName: 'Papelería y Oficina' },
  { sku: 'PAP-005', name: 'Organizador Escritorio 5pz', description: 'Set organizador acrílico oficina', costPrice: 30000, salePrice: 42000, taxRate: 19, stock: 25, minStock: 10, maxStock: 40, brand: 'Artesco', categoryName: 'Papelería y Oficina' },
  // Ferretería y Herramientas (5)
  { sku: 'FER-001', name: 'Taladro Percutor Bosch 700W', description: 'Taladro percutor reversible', costPrice: 240000, salePrice: 320000, taxRate: 19, stock: 10, minStock: 5, maxStock: 18, brand: 'Bosch', categoryName: 'Ferretería y Herramientas' },
  { sku: 'FER-002', name: 'Set Destornilladores 20pz', description: 'Juego destornilladores precisión', costPrice: 65000, salePrice: 85000, taxRate: 19, stock: 18, minStock: 8, maxStock: 30, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
  { sku: 'FER-003', name: 'Cinta Métrica 8m Stanley', description: 'Flexómetro profesional 8 metros', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 40, minStock: 15, maxStock: 70, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
  { sku: 'FER-004', name: 'Martillo Carpintero Stanley', description: 'Martillo uña fibra vidrio 16oz', costPrice: 35000, salePrice: 45000, taxRate: 19, stock: 22, minStock: 10, maxStock: 40, brand: 'Stanley', categoryName: 'Ferretería y Herramientas' },
  { sku: 'FER-005', name: 'Caja Herramientas 100pz', description: 'Maletín herramientas completo', costPrice: 200000, salePrice: 280000, taxRate: 19, stock: 7, minStock: 3, maxStock: 12, brand: 'Black+Decker', categoryName: 'Ferretería y Herramientas' },
];

// ── Distribuidora Nacional Products (30) ──
const dnProductsData: TenantProductInput[] = [
  { sku: 'DN-001', name: 'Jabón Líquido Fabuloso 5L', description: 'Limpiador multiusos lavanda', costPrice: 15000, salePrice: 22000, taxRate: 19, stock: 200, minStock: 50, maxStock: 400, brand: 'Fabuloso', catKey: 'Aseo y Limpieza' },
  { sku: 'DN-002', name: 'Detergente Fab 3kg', description: 'Detergente polvo floral', costPrice: 18000, salePrice: 26000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Fab', catKey: 'Aseo y Limpieza' },
  { sku: 'DN-003', name: 'Desinfectante Clorox 3.8L', description: 'Desinfectante multiusos', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 250, minStock: 80, maxStock: 450, brand: 'Clorox', catKey: 'Aseo y Limpieza' },
  { sku: 'DN-004', name: 'Limpiavidrios Windex 1L x6', description: 'Pack limpiador vidrios', costPrice: 24000, salePrice: 35000, taxRate: 19, stock: 120, minStock: 40, maxStock: 220, brand: 'Windex', catKey: 'Aseo y Limpieza' },
  { sku: 'DN-005', name: 'Papel Higiénico x48 rollos', description: 'Paquete papel higiénico doble hoja', costPrice: 32000, salePrice: 45000, taxRate: 0, stock: 300, minStock: 100, maxStock: 500, brand: 'Familia', catKey: 'Aseo y Limpieza' },
  { sku: 'DN-006', name: 'Arroz Diana 25kg Bulto', description: 'Arroz blanco premium al mayor', costPrice: 65000, salePrice: 85000, taxRate: 0, stock: 150, minStock: 40, maxStock: 300, brand: 'Diana', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-007', name: 'Azúcar Manuelita 25kg', description: 'Azúcar blanca refinada bulto', costPrice: 55000, salePrice: 72000, taxRate: 0, stock: 130, minStock: 35, maxStock: 260, brand: 'Manuelita', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-008', name: 'Sal Refisal 25kg', description: 'Sal refinada yodada bulto', costPrice: 20000, salePrice: 30000, taxRate: 0, stock: 180, minStock: 50, maxStock: 350, brand: 'Refisal', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-009', name: 'Aceite Girasol 20L Bidón', description: 'Aceite cocina bidón industrial', costPrice: 80000, salePrice: 110000, taxRate: 5, stock: 80, minStock: 20, maxStock: 160, brand: 'Girasoli', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-010', name: 'Harina Trigo 25kg', description: 'Harina de trigo panificación', costPrice: 48000, salePrice: 65000, taxRate: 0, stock: 100, minStock: 30, maxStock: 200, brand: 'Harinera del Valle', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-011', name: 'Lentejas 10kg', description: 'Lentejas secas grano grueso', costPrice: 35000, salePrice: 48000, taxRate: 0, stock: 90, minStock: 25, maxStock: 180, brand: 'La Muñeca', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-012', name: 'Atún Van Camps x24', description: 'Caja atún en aceite latas', costPrice: 72000, salePrice: 95000, taxRate: 5, stock: 60, minStock: 20, maxStock: 120, brand: 'Van Camps', catKey: 'Alimentos al Mayor' },
  { sku: 'DN-013', name: 'Cerveza Águila x24', description: 'Caja cerveza Águila 330ml', costPrice: 42000, salePrice: 58000, taxRate: 19, stock: 200, minStock: 70, maxStock: 400, brand: 'Bavaria', catKey: 'Bebidas al Mayor' },
  { sku: 'DN-014', name: 'Gaseosa Postobón 1.5L x12', description: 'Pack gaseosas surtidas', costPrice: 28000, salePrice: 38000, taxRate: 19, stock: 300, minStock: 100, maxStock: 500, brand: 'Postobón', catKey: 'Bebidas al Mayor' },
  { sku: 'DN-015', name: 'Agua Cristal 600ml x24', description: 'Caja agua personal', costPrice: 18000, salePrice: 26000, taxRate: 0, stock: 250, minStock: 80, maxStock: 450, brand: 'Cristal', catKey: 'Bebidas al Mayor' },
  { sku: 'DN-016', name: 'Jugo Hit 1L x12', description: 'Caja jugos surtidos', costPrice: 24000, salePrice: 34000, taxRate: 19, stock: 160, minStock: 50, maxStock: 300, brand: 'Hit', catKey: 'Bebidas al Mayor' },
  { sku: 'DN-017', name: 'Coca-Cola 2.5L x8', description: 'Pack familiar gaseosa', costPrice: 32000, salePrice: 44000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Coca-Cola', catKey: 'Bebidas al Mayor' },
  { sku: 'DN-018', name: 'Shampoo Sedal 1L x12', description: 'Caja shampoo cuidado capilar', costPrice: 48000, salePrice: 68000, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Sedal', catKey: 'Cuidado Personal' },
  { sku: 'DN-019', name: 'Jabón Dove x24', description: 'Caja jabón tocador cremoso', costPrice: 55000, salePrice: 75000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Dove', catKey: 'Cuidado Personal' },
  { sku: 'DN-020', name: 'Crema Dental Colgate x24', description: 'Caja crema dental triple acción', costPrice: 36000, salePrice: 50000, taxRate: 19, stock: 140, minStock: 45, maxStock: 280, brand: 'Colgate', catKey: 'Cuidado Personal' },
  { sku: 'DN-021', name: 'Desodorante Rexona x12', description: 'Caja desodorante aerosol', costPrice: 42000, salePrice: 58000, taxRate: 19, stock: 110, minStock: 35, maxStock: 220, brand: 'Rexona', catKey: 'Cuidado Personal' },
  { sku: 'DN-022', name: 'Pañales Huggies x100', description: 'Paquete pañales etapa 3', costPrice: 65000, salePrice: 88000, taxRate: 0, stock: 75, minStock: 25, maxStock: 150, brand: 'Huggies', catKey: 'Cuidado Personal' },
  { sku: 'DN-023', name: 'Vasos Desechables x1000', description: 'Vasos 7oz poliestireno', costPrice: 22000, salePrice: 32000, taxRate: 19, stock: 200, minStock: 60, maxStock: 400, brand: 'Darnel', catKey: 'Desechables' },
  { sku: 'DN-024', name: 'Platos Desechables x500', description: 'Platos 9" icopor', costPrice: 18000, salePrice: 26000, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Darnel', catKey: 'Desechables' },
  { sku: 'DN-025', name: 'Bolsas Basura x100', description: 'Bolsas negras industriales', costPrice: 15000, salePrice: 22000, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Reyplast', catKey: 'Desechables' },
  { sku: 'DN-026', name: 'Servilletas x1000', description: 'Servilletas dobladas blancas', costPrice: 12000, salePrice: 18000, taxRate: 0, stock: 220, minStock: 70, maxStock: 400, brand: 'Familia', catKey: 'Desechables' },
  { sku: 'DN-027', name: 'Olla Imusa Set x5', description: 'Set ollas aluminio con tapas', costPrice: 85000, salePrice: 120000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Imusa', catKey: 'Hogar Mayorista' },
  { sku: 'DN-028', name: 'Sartén Antiadherente x6', description: 'Pack sartenes 20-24-28cm', costPrice: 65000, salePrice: 90000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Imusa', catKey: 'Hogar Mayorista' },
  { sku: 'DN-029', name: 'Resma Papel x10', description: 'Pack 10 resmas carta 75g', costPrice: 120000, salePrice: 165000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Reprograf', catKey: 'Hogar Mayorista' },
  { sku: 'DN-030', name: 'Escoba + Trapero Set x12', description: 'Pack escobas y trapeadores', costPrice: 48000, salePrice: 68000, taxRate: 19, stock: 50, minStock: 18, maxStock: 100, brand: 'Fuller', catKey: 'Hogar Mayorista' },
];

// ── Nuevo Negocio Products (12) ──
const nnProductsData: TenantProductInput[] = [
  { sku: 'NN-001', name: 'Camiseta Básica Algodón', description: 'Camiseta unisex 100% algodón', costPrice: 18000, salePrice: 35000, taxRate: 19, stock: 50, minStock: 15, maxStock: 100, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
  { sku: 'NN-002', name: 'Camiseta Estampada Vintage', description: 'Camiseta con diseño retro', costPrice: 22000, salePrice: 42000, taxRate: 19, stock: 35, minStock: 10, maxStock: 70, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
  { sku: 'NN-003', name: 'Polo Casual Slim', description: 'Polo manga corta ajustado', costPrice: 28000, salePrice: 52000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
  { sku: 'NN-004', name: 'Crop Top Deportivo', description: 'Top corto para mujer', costPrice: 15000, salePrice: 32000, taxRate: 19, stock: 25, minStock: 8, maxStock: 50, brand: 'Urban Style', catKey: 'Camisetas y Tops' },
  { sku: 'NN-005', name: 'Jean Skinny Negro', description: 'Jean ajustado negro stretch', costPrice: 35000, salePrice: 65000, taxRate: 19, stock: 40, minStock: 12, maxStock: 80, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
  { sku: 'NN-006', name: 'Jean Mom Fit Clásico', description: 'Jean tiro alto corte mom', costPrice: 38000, salePrice: 68000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
  { sku: 'NN-007', name: 'Jogger Cargo Unisex', description: 'Pantalón jogger con bolsillos cargo', costPrice: 32000, salePrice: 58000, taxRate: 19, stock: 25, minStock: 8, maxStock: 50, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
  { sku: 'NN-008', name: 'Sudadera Oversize', description: 'Sudadera con capucha oversize', costPrice: 35000, salePrice: 62000, taxRate: 19, stock: 20, minStock: 8, maxStock: 40, brand: 'Urban Style', catKey: 'Pantalones y Jeans' },
  { sku: 'NN-009', name: 'Gorra Snapback', description: 'Gorra plana ajustable', costPrice: 12000, salePrice: 28000, taxRate: 19, stock: 45, minStock: 15, maxStock: 90, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
  { sku: 'NN-010', name: 'Gafas Sol Espejo', description: 'Gafas de sol lente espejo', costPrice: 8000, salePrice: 22000, taxRate: 19, stock: 35, minStock: 10, maxStock: 70, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
  { sku: 'NN-011', name: 'Correa Lona Militar', description: 'Cinturón lona estilo militar', costPrice: 8000, salePrice: 18000, taxRate: 19, stock: 40, minStock: 12, maxStock: 80, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
  { sku: 'NN-012', name: 'Tenis Urbanos Blancos', description: 'Zapatillas blancas casuales', costPrice: 45000, salePrice: 85000, taxRate: 19, stock: 20, minStock: 8, maxStock: 40, brand: 'Urban Style', catKey: 'Accesorios Urbanos' },
];

// ── Papelería Central Products (40) ──
const pcProductsData: TenantProductInput[] = [
  // Cuadernos (5)
  { sku: 'PC-001', name: 'Cuaderno Argollado 100h Norma', description: 'Cuaderno profesional cuadriculado', costPrice: 5500, salePrice: 8500, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Norma', catKey: 'Cuadernos' },
  { sku: 'PC-002', name: 'Cuaderno Cosido 100h Norma', description: 'Cuaderno cosido rayado', costPrice: 3500, salePrice: 5500, taxRate: 19, stock: 200, minStock: 70, maxStock: 400, brand: 'Norma', catKey: 'Cuadernos' },
  { sku: 'PC-003', name: 'Cuaderno Argollado 80h Scribe', description: 'Cuaderno escolar básico', costPrice: 4000, salePrice: 6500, taxRate: 19, stock: 180, minStock: 60, maxStock: 350, brand: 'Scribe', catKey: 'Cuadernos' },
  { sku: 'PC-004', name: 'Cuaderno de Dibujo A4', description: 'Block dibujo sin líneas 40h', costPrice: 3000, salePrice: 5000, taxRate: 19, stock: 120, minStock: 40, maxStock: 250, brand: 'Norma', catKey: 'Cuadernos' },
  { sku: 'PC-005', name: 'Agenda Ejecutiva 2025', description: 'Agenda profesional diaria', costPrice: 15000, salePrice: 28000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Norma', catKey: 'Cuadernos' },
  // Escritura (5)
  { sku: 'PC-006', name: 'Lápiz Mongol #2 x12', description: 'Caja lápices grafito', costPrice: 4500, salePrice: 7000, taxRate: 19, stock: 200, minStock: 80, maxStock: 400, brand: 'Faber-Castell', catKey: 'Escritura' },
  { sku: 'PC-007', name: 'Esfero BIC Cristal x12', description: 'Caja esferos punto medio', costPrice: 7000, salePrice: 11000, taxRate: 19, stock: 250, minStock: 100, maxStock: 500, brand: 'BIC', catKey: 'Escritura' },
  { sku: 'PC-008', name: 'Marcador Permanente Sharpie x4', description: 'Pack marcadores negro', costPrice: 12000, salePrice: 18000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Sharpie', catKey: 'Escritura' },
  { sku: 'PC-009', name: 'Colores Prismacolor x24', description: 'Caja colores profesionales', costPrice: 25000, salePrice: 42000, taxRate: 19, stock: 45, minStock: 15, maxStock: 90, brand: 'Prismacolor', catKey: 'Escritura' },
  { sku: 'PC-010', name: 'Resaltador Stabilo x6', description: 'Pack resaltadores pastel', costPrice: 15000, salePrice: 24000, taxRate: 19, stock: 60, minStock: 20, maxStock: 120, brand: 'Stabilo', catKey: 'Escritura' },
  // Papel y Cartulinas (5)
  { sku: 'PC-011', name: 'Resma Papel Carta 500h', description: 'Papel bond 75g blanco', costPrice: 13000, salePrice: 18000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Reprograf', catKey: 'Papel y Cartulinas' },
  { sku: 'PC-012', name: 'Resma Papel Oficio 500h', description: 'Papel bond 75g oficio', costPrice: 15000, salePrice: 20000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Reprograf', catKey: 'Papel y Cartulinas' },
  { sku: 'PC-013', name: 'Cartulina Colores x10', description: 'Pliego cartulina surtida', costPrice: 5000, salePrice: 8000, taxRate: 19, stock: 150, minStock: 50, maxStock: 300, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
  { sku: 'PC-014', name: 'Papel Iris x50', description: 'Paquete papel iris colores', costPrice: 4000, salePrice: 6500, taxRate: 19, stock: 120, minStock: 40, maxStock: 240, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
  { sku: 'PC-015', name: 'Papel Contact x5m', description: 'Rollo papel adhesivo transparente', costPrice: 3500, salePrice: 6000, taxRate: 19, stock: 80, minStock: 25, maxStock: 160, brand: 'Propalcote', catKey: 'Papel y Cartulinas' },
  // Arte y Manualidades (5)
  { sku: 'PC-016', name: 'Pinturas Acrílicas x12', description: 'Set pinturas acrílicas colores', costPrice: 18000, salePrice: 30000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Mariposa', catKey: 'Arte y Manualidades' },
  { sku: 'PC-017', name: 'Set Pinceles x10', description: 'Pinceles pelo sintético', costPrice: 12000, salePrice: 20000, taxRate: 19, stock: 50, minStock: 18, maxStock: 100, brand: 'Mariposa', catKey: 'Arte y Manualidades' },
  { sku: 'PC-018', name: 'Silicona Líquida 250ml', description: 'Pegamento silicona escolar', costPrice: 3500, salePrice: 6000, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Pegastic', catKey: 'Arte y Manualidades' },
  { sku: 'PC-019', name: 'Plastilina x12 Barras', description: 'Set plastilina colores', costPrice: 4000, salePrice: 7000, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Pelikan', catKey: 'Arte y Manualidades' },
  { sku: 'PC-020', name: 'Foamy Colores x10', description: 'Láminas foamy surtidas', costPrice: 6000, salePrice: 10000, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Propalcote', catKey: 'Arte y Manualidades' },
  // Organización (5)
  { sku: 'PC-021', name: 'Carpeta Legajadora AZ', description: 'Carpeta archivo carta', costPrice: 5000, salePrice: 8500, taxRate: 19, stock: 120, minStock: 40, maxStock: 240, brand: 'Norma', catKey: 'Organización' },
  { sku: 'PC-022', name: 'Folder Manila x25', description: 'Pack folders carta', costPrice: 6000, salePrice: 9500, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Norma', catKey: 'Organización' },
  { sku: 'PC-023', name: 'Sobre Manila x25', description: 'Pack sobres carta', costPrice: 4500, salePrice: 7500, taxRate: 19, stock: 90, minStock: 30, maxStock: 180, brand: 'Norma', catKey: 'Organización' },
  { sku: 'PC-024', name: 'Archivador de Palanca', description: 'Archivador AZ ancho', costPrice: 8000, salePrice: 13000, taxRate: 19, stock: 70, minStock: 25, maxStock: 140, brand: 'Norma', catKey: 'Organización' },
  { sku: 'PC-025', name: 'Separadores x5 Colores', description: 'Separadores plásticos para carpeta', costPrice: 2500, salePrice: 4500, taxRate: 19, stock: 110, minStock: 40, maxStock: 220, brand: 'Norma', catKey: 'Organización' },
  // Tecnología Escolar (5)
  { sku: 'PC-026', name: 'Calculadora Casio FX-82', description: 'Calculadora científica', costPrice: 35000, salePrice: 55000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Casio', catKey: 'Tecnología Escolar' },
  { sku: 'PC-027', name: 'USB Kingston 32GB', description: 'Memoria USB 3.0', costPrice: 12000, salePrice: 20000, taxRate: 19, stock: 50, minStock: 20, maxStock: 100, brand: 'Kingston', catKey: 'Tecnología Escolar' },
  { sku: 'PC-028', name: 'Audífonos Escolares', description: 'Audífonos con micrófono básicos', costPrice: 8000, salePrice: 15000, taxRate: 19, stock: 40, minStock: 15, maxStock: 80, brand: 'Genius', catKey: 'Tecnología Escolar' },
  { sku: 'PC-029', name: 'Mouse Inalámbrico', description: 'Mouse óptico inalámbrico', costPrice: 15000, salePrice: 25000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Logitech', catKey: 'Tecnología Escolar' },
  { sku: 'PC-030', name: 'Teclado USB Básico', description: 'Teclado español USB', costPrice: 18000, salePrice: 28000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Genius', catKey: 'Tecnología Escolar' },
  // Mochilas y Morrales (5)
  { sku: 'PC-031', name: 'Morral Escolar Totto', description: 'Morral escolar estampado', costPrice: 65000, salePrice: 110000, taxRate: 19, stock: 25, minStock: 10, maxStock: 50, brand: 'Totto', catKey: 'Mochilas y Morrales' },
  { sku: 'PC-032', name: 'Morral Universitario Totto', description: 'Morral laptop 15" acolchado', costPrice: 85000, salePrice: 140000, taxRate: 19, stock: 18, minStock: 8, maxStock: 35, brand: 'Totto', catKey: 'Mochilas y Morrales' },
  { sku: 'PC-033', name: 'Lonchera Térmica Infantil', description: 'Lonchera con aislante térmico', costPrice: 25000, salePrice: 42000, taxRate: 19, stock: 30, minStock: 12, maxStock: 60, brand: 'Totto', catKey: 'Mochilas y Morrales' },
  { sku: 'PC-034', name: 'Cartuchera Doble Cierre', description: 'Cartuchera escolar grande', costPrice: 12000, salePrice: 22000, taxRate: 19, stock: 45, minStock: 18, maxStock: 90, brand: 'Totto', catKey: 'Mochilas y Morrales' },
  { sku: 'PC-035', name: 'Maleta con Ruedas Infantil', description: 'Maleta rodante para niños', costPrice: 75000, salePrice: 125000, taxRate: 19, stock: 12, minStock: 5, maxStock: 25, brand: 'Totto', catKey: 'Mochilas y Morrales' },
  // Oficina (5)
  { sku: 'PC-036', name: 'Grapadora Estándar', description: 'Grapadora oficina 25 hojas', costPrice: 8000, salePrice: 14000, taxRate: 19, stock: 35, minStock: 12, maxStock: 70, brand: 'Bostitch', catKey: 'Oficina' },
  { sku: 'PC-037', name: 'Perforadora 2 Huecos', description: 'Perforadora estándar metal', costPrice: 10000, salePrice: 16000, taxRate: 19, stock: 30, minStock: 10, maxStock: 60, brand: 'Bostitch', catKey: 'Oficina' },
  { sku: 'PC-038', name: 'Cinta Pegante x6', description: 'Pack cintas transparentes', costPrice: 5000, salePrice: 8500, taxRate: 19, stock: 80, minStock: 30, maxStock: 160, brand: 'Scotch', catKey: 'Oficina' },
  { sku: 'PC-039', name: 'Post-it 3x3 x5 Colores', description: 'Pack notas adhesivas', costPrice: 8000, salePrice: 13000, taxRate: 19, stock: 60, minStock: 22, maxStock: 120, brand: '3M', catKey: 'Oficina' },
  { sku: 'PC-040', name: 'Clips x100 + Ganchos x50', description: 'Kit sujetadores oficina', costPrice: 3000, salePrice: 5500, taxRate: 19, stock: 100, minStock: 35, maxStock: 200, brand: 'Artesco', catKey: 'Oficina' },
];

// ============================================================================
// SEEDER FUNCTION
// ============================================================================

export async function seedCatalog(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📁 Seeding categories & products...');

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORIES
  // ──────────────────────────────────────────────────────────────────────────

  // ── Tienda Demo Categories (15) ──
  console.log('  → Demo categories...');
  for (const cat of demoCategoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: ctx.tenants.demo.id, ...cat },
    });
    ctx.categories.demo[cat.name] = { id: created.id, name: created.name };
  }

  // ── Distribuidora Nacional Categories (6) ──
  console.log('  → Distribuidora categories...');
  for (const cat of dnCategoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: ctx.tenants.distribuidora.id, ...cat },
    });
    ctx.categories.distribuidora[cat.name] = { id: created.id, name: created.name };
  }

  // ── Nuevo Negocio Categories (3) ──
  console.log('  → Nuevo Negocio categories...');
  for (const cat of nnCategoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: ctx.tenants.nuevo.id, ...cat },
    });
    ctx.categories.nuevo[cat.name] = { id: created.id, name: created.name };
  }

  // ── Papelería Central Categories (8) ──
  console.log('  → Papelería Central categories...');
  for (const cat of pcCategoriesData) {
    const created = await prisma.category.create({
      data: { tenantId: ctx.tenants.papeleria.id, ...cat },
    });
    ctx.categories.papeleria[cat.name] = { id: created.id, name: created.name };
  }

  console.log('   ✅ 32 Categories created (15 + 6 + 3 + 8)');

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTS
  // ──────────────────────────────────────────────────────────────────────────

  // ── Tienda Demo Products (85) ──
  console.log('  → Demo products...');
  for (let i = 0; i < demoProductsData.length; i++) {
    const p = demoProductsData[i];
    const category = ctx.categories.demo[p.categoryName];
    const status = p.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
    const created = await prisma.product.create({
      data: {
        tenantId: ctx.tenants.demo.id,
        categoryId: category.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        stock: p.stock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        brand: p.brand,
        unit: 'UND',
        status,
        barcode: generateEAN13('770', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    ctx.products.demo.push({
      id: created.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      taxRate: p.taxRate,
      categoryId: category.id,
    });
  }
  console.log(`   ✅ ${ctx.products.demo.length} Tienda Demo Products created`);

  // ── Distribuidora Nacional Products (30) ──
  console.log('  → Distribuidora products...');
  for (let i = 0; i < dnProductsData.length; i++) {
    const p = dnProductsData[i];
    const categoryId = ctx.categories.distribuidora[p.catKey].id;
    const created = await prisma.product.create({
      data: {
        tenantId: ctx.tenants.distribuidora.id,
        categoryId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        stock: p.stock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        brand: p.brand,
        unit: 'UND',
        status: 'ACTIVE',
        barcode: generateEAN13('771', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    ctx.products.distribuidora.push({
      id: created.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      taxRate: p.taxRate,
      categoryId,
    });
  }
  console.log(`   ✅ ${ctx.products.distribuidora.length} Distribuidora Nacional Products created`);

  // ── Nuevo Negocio Products (12) ──
  console.log('  → Nuevo Negocio products...');
  for (let i = 0; i < nnProductsData.length; i++) {
    const p = nnProductsData[i];
    const categoryId = ctx.categories.nuevo[p.catKey].id;
    const created = await prisma.product.create({
      data: {
        tenantId: ctx.tenants.nuevo.id,
        categoryId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        stock: p.stock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        brand: p.brand,
        unit: 'UND',
        status: 'ACTIVE',
        barcode: generateEAN13('772', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    ctx.products.nuevo.push({
      id: created.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      taxRate: p.taxRate,
      categoryId,
    });
  }
  console.log(`   ✅ ${ctx.products.nuevo.length} Nuevo Negocio Products created`);

  // ── Papelería Central Products (40) ──
  console.log('  → Papelería Central products...');
  for (let i = 0; i < pcProductsData.length; i++) {
    const p = pcProductsData[i];
    const categoryId = ctx.categories.papeleria[p.catKey].id;
    const created = await prisma.product.create({
      data: {
        tenantId: ctx.tenants.papeleria.id,
        categoryId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        stock: p.stock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        brand: p.brand,
        unit: 'UND',
        status: 'ACTIVE',
        barcode: generateEAN13('773', i + 1),
        imageUrl: productImageUrl(p.sku),
      },
    });
    ctx.products.papeleria.push({
      id: created.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      taxRate: p.taxRate,
      categoryId,
    });
  }
  console.log(`   ✅ ${ctx.products.papeleria.length} Papelería Central Products created`);

  const total = ctx.products.demo.length + ctx.products.distribuidora.length +
    ctx.products.nuevo.length + ctx.products.papeleria.length;
  console.log(`   📊 Total products: ${total}`);
}
