import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { PageWrapper, PageSection } from "~/components/layout/PageWrapper";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  User,
  LogOut,
  Maximize,
  Keyboard,
} from "lucide-react";
import type { Route } from "./+types/_app.pos";
import { useCurrentSession, useCreateSale } from "~/hooks/usePOS";
import { useIsQueryEnabled } from "~/hooks/useIsQueryEnabled";
import { useProducts } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import {
  POSCart,
  POSProductSearch,
  POSSplitPaymentModal,
  POSTicketModal,
  ProductCatalog,
} from "~/components/pos";
import { useCategories } from "~/hooks/useCategories";
import { formatCurrency } from "~/lib/utils";
import { useDashboardStats } from "~/hooks/useDashboard";
import { useBarcodeScanner } from "~/hooks/useBarcodeScanner";
import { usePOSKeyboard, toggleFullscreen } from "~/hooks/usePOSKeyboard";
import type { CartItem, SalePaymentData, POSSaleWithDetails } from "~/types/pos";
import { PaymentMethodLabels } from "~/types/payment";
import type { Product } from "~/types/product";
import { useAuthStore } from "~/stores/auth.store";
import { toast } from "sonner";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Punto de Venta - StockFlow" },
    { name: "description", content: "Sistema de punto de venta" },
  ];
};

export default function POSPage() {
  const navigate = useNavigate();
  const queryEnabled = useIsQueryEnabled();
  const { data: session, isLoading: isSessionLoading } = useCurrentSession();
  const { data: dashboardStats } = useDashboardStats();
  const tenant = useAuthStore((s) => s.tenant);

  // Get warehouseId from the cash register's assigned warehouse
  const warehouseId = session?.cashRegister?.warehouseId;

  // Fetch products with warehouse-specific stock when warehouseId is available
  const { data: productsData, isLoading: isProductsLoading } = useProducts({
    status: "ACTIVE",
    limit: 500,
    ...(warehouseId && { warehouseId }),
  });
  const createSaleMutation = useCreateSale();
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useCategories();

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Ticket modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [lastSale, setLastSale] = useState<POSSaleWithDetails | null>(null);
  const [lastPayments, setLastPayments] = useState<SalePaymentData[]>([]);

  // Live timer
  const [now, setNow] = useState(Date.now());

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  const products = productsData?.data || [];

  // Get cart quantity for a product (used by ProductCatalog badges)
  const getCartQuantity = useCallback(
    (productId: string) =>
      cartItems.find((i) => i.productId === productId)?.quantity ?? 0,
    [cartItems],
  );

  // Redirect to open session if no active session
  // Wait for queries to be enabled (auth hydrated) before deciding to redirect
  useEffect(() => {
    if (queryEnabled && !isSessionLoading && !session) {
      navigate("/pos/open");
    }
  }, [session, isSessionLoading, navigate, queryEnabled]);

  // Live timer — update every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = subtotal * (globalDiscount / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const tax = cartItems.reduce((sum, item) => sum + item.tax, 0);
    const taxAfterDiscount = tax * (subtotalAfterDiscount / subtotal) || 0;
    return subtotalAfterDiscount + taxAfterDiscount;
  }, [cartItems, globalDiscount]);

  // Add product to cart
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" no tiene stock disponible`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id,
      );

      if (existingIndex >= 0) {
        // Update quantity if product exists
        const existing = prev[existingIndex];
        if (existing.quantity >= product.stock) {
          toast.error(`Stock maximo alcanzado para "${product.name}"`);
          return prev;
        }

        const newQuantity = existing.quantity + 1;
        const subtotal = newQuantity * product.salePrice;
        const tax = subtotal * (product.taxRate / 100);

        return prev.map((item, i) =>
          i === existingIndex
            ? {
                ...item,
                quantity: newQuantity,
                subtotal,
                tax,
                total: subtotal + tax,
              }
            : item,
        );
      }

      // Add new item
      const subtotal = product.salePrice;
      const tax = subtotal * (product.taxRate / 100);

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: product.salePrice,
          taxRate: product.taxRate,
          discountPercent: 0,
          subtotal,
          tax,
          total: subtotal + tax,
          maxStock: product.stock,
        },
      ];
    });

    toast.success(`"${product.name}" agregado al carrito`);
  }, []);

  // Update cart item quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        const subtotal = quantity * item.unitPrice;
        const discountAmount = subtotal * (item.discountPercent / 100);
        const subtotalAfterDiscount = subtotal - discountAmount;
        const tax = subtotalAfterDiscount * (item.taxRate / 100);

        return {
          ...item,
          quantity,
          subtotal: subtotalAfterDiscount,
          tax,
          total: subtotalAfterDiscount + tax,
        };
      }),
    );
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    setGlobalDiscount(0);
    setCustomerId(undefined);
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        addToCart(product);
      } else {
        toast.error(`Producto con codigo "${barcode}" no encontrado`);
      }
    },
    [products, addToCart],
  );

  // Barcode scanner hook
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !showPaymentModal,
  });

  // Keyboard shortcuts
  usePOSKeyboard({
    onSearch: () => searchInputRef.current?.focus(),
    onPay: () => cartItems.length > 0 && setShowPaymentModal(true),
    onFullscreen: toggleFullscreen,
    onCancel: () => setShowPaymentModal(false),
    enabled: true,
  });

  // Process sale
  const handleCheckout = useCallback(
    async (payments: SalePaymentData[]) => {
      try {
        const sale = await createSaleMutation.mutateAsync({
          customerId,
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxRate: item.taxRate,
          })),
          payments,
          discountPercent: globalDiscount,
        });

        // Save sale data for the ticket modal
        setLastSale(sale);
        setLastPayments(payments);
        setShowPaymentModal(false);
        clearCart();
        setShowTicketModal(true);
      } catch (error: unknown) {
        setShowPaymentModal(false);
        const axiosError = error as { response?: { data?: { message?: string } } };
        const message =
          axiosError?.response?.data?.message || "Error al procesar la venta";
        toast.error(message);
      }
    },
    [cartItems, customerId, globalDiscount, createSaleMutation, clearCart],
  );

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  const sessionDuration = session.openedAt
    ? Math.floor(
        (now - new Date(session.openedAt).getTime()) / 1000 / 60,
      )
    : 0;
  const hours = Math.floor(sessionDuration / 60);
  const minutes = sessionDuration % 60;

  return (
    <PageWrapper className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Session Status Header */}
      <PageSection>
        <Card className="bg-linear-to-r from-primary-600 via-primary-500 to-primary-600 text-white">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-display tracking-tight">
                    Punto de Venta
                  </h1>
                  <p className="text-primary-100/80 text-xs">
                    Caja: {session.cashRegister?.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Sales indicator */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/60">
                    Ventas
                  </p>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-sm font-bold tabular-nums">
                      {formatCurrency(dashboardStats?.todaySales ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Duration indicator */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/60">
                    Tiempo
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-sm font-bold tabular-nums">
                      {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                    </span>
                  </div>
                </div>

                {/* User indicator */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/60">
                    Cajero
                  </p>
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-sm font-bold">
                      {session.user?.firstName || "Usuario"}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-lg"
                    onClick={toggleFullscreen}
                    title="Pantalla completa (F11)"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                  <Link to="/pos/close">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-lg"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </PageSection>

      {/* Main POS Interface */}
      <PageSection
        className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0"
      >
        {/* Product Search & Catalog */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Search Bar */}
          <POSProductSearch
            products={products}
            isLoading={isProductsLoading}
            onSelectProduct={addToCart}
            onSearchChange={setSearchQuery}
            inputRef={searchInputRef}
          />

          {/* Command Bar */}
          <div className="flex items-center justify-between rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60 px-4 py-2">
            {/* Keyboard shortcuts */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
              <Keyboard className="h-3.5 w-3.5" />
              <kbd className="inline-flex items-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shadow-[0_1px_0_0] shadow-neutral-200/80 dark:shadow-neutral-900/80">
                F2
              </kbd>
              <span>Buscar</span>
              <span className="text-neutral-200 dark:text-neutral-700">
                &middot;
              </span>
              <kbd className="inline-flex items-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shadow-[0_1px_0_0] shadow-neutral-200/80 dark:shadow-neutral-900/80">
                F4
              </kbd>
              <span>Cobrar</span>
              <span className="text-neutral-200 dark:text-neutral-700">
                &middot;
              </span>
              <kbd className="inline-flex items-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 font-mono text-[11px] font-medium text-neutral-500 dark:text-neutral-400 shadow-[0_1px_0_0] shadow-neutral-200/80 dark:shadow-neutral-900/80">
                F11
              </kbd>
              <span>Pantalla completa</span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <Link to="/pos/sales">
                <Button variant="ghost" size="sm">
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  Ventas
                </Button>
              </Link>
              <Link to={`/pos/sessions/${session.id}`}>
                <Button variant="ghost" size="sm">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Reporte X
                </Button>
              </Link>
            </div>
          </div>

          {/* Product Catalog */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ProductCatalog
              products={products}
              categories={categories}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onSelectCategory={setSelectedCategory}
              onAddToCart={addToCart}
              getCartQuantity={getCartQuantity}
              isLoadingProducts={isProductsLoading}
              isLoadingCategories={isCategoriesLoading}
            />
          </div>
        </div>

        {/* Cart Panel */}
        <div className="min-h-0 h-full">
          <POSCart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            onCheckout={() => setShowPaymentModal(true)}
            globalDiscount={globalDiscount}
            onGlobalDiscountChange={setGlobalDiscount}
            isProcessing={createSaleMutation.isPending}
          />
        </div>
      </PageSection>

      {/* Payment Modal */}
      <POSSplitPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleCheckout}
        total={cartTotal}
        isProcessing={createSaleMutation.isPending}
      />

      {/* Ticket Modal — shown after successful sale */}
      {lastSale?.invoice && (
        <POSTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          businessName={tenant?.name || "Mi Negocio"}
          invoiceNumber={lastSale.invoice.invoiceNumber}
          date={lastSale.createdAt || new Date().toISOString()}
          cashierName={session.user?.firstName}
          cashRegisterName={session.cashRegister?.name}
          customerName={lastSale.invoice.customer?.name}
          customerDocument={lastSale.invoice.customer?.documentNumber}
          items={
            lastSale.invoice.items?.map((item) => ({
              name: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total ?? item.subtotal,
              discount: item.discount,
            })) ?? []
          }
          subtotal={lastSale.subtotal}
          discountAmount={lastSale.discount}
          taxAmount={lastSale.tax}
          total={lastSale.total}
          payments={lastSale.payments.map((p) => ({
            method: p.method,
            methodLabel:
              PaymentMethodLabels[
                p.method as keyof typeof PaymentMethodLabels
              ] || p.method,
            amount: p.amount,
          }))}
          change={Math.max(
            0,
            lastPayments.reduce((sum, p) => sum + p.amount, 0) -
              lastSale.total,
          )}
          footerMessage="¡Gracias por su compra!"
        />
      )}
    </PageWrapper>
  );
}
