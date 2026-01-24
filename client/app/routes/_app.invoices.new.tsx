import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  ShoppingCart,
  Package,
} from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/_app.invoices.new";
import { cn, formatCurrency } from "~/lib/utils";
import { getTodayDate, getDateFromNow } from "~/lib/pos-utils";
import { useCreateInvoice } from "~/hooks/useInvoices";
import { useCustomers } from "~/hooks/useCustomers";
import { useProducts } from "~/hooks/useProducts";
import { useCategories } from "~/hooks/useCategories";
import { useWarehouses } from "~/hooks/useWarehouses";
import { usePOSCart } from "~/hooks/usePOSCart";
import { Button } from "~/components/ui/Button";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { toast } from "~/components/ui/Toast";
import {
  ProductCatalog,
  CartPanel,
  QuickSearch,
  CustomerSelect,
  WarehouseSelect,
} from "~/components/pos";
import type { InvoiceStatus } from "~/types/invoice";

// Meta for SEO - used by React Router
export const meta: Route.MetaFunction = () => {
  return [
    { title: "Punto de Venta - StockFlow" },
    {
      name: "description",
      content: "Sistema de punto de venta para facturacion rapida",
    },
  ];
};

// Mobile tab type
type MobileTab = "products" | "cart";

export default function POSPage() {
  // SSR-safe state for client-only features
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("products");

  // Data queries
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    limit: 100,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    limit: 200,
  });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories();
  const { data: warehousesData, isLoading: isLoadingWarehouses } =
    useWarehouses();
  const createInvoice = useCreateInvoice();

  // POS Cart hook
  const {
    cart,
    totals,
    selectedCustomerId,
    selectedWarehouseId,
    searchQuery,
    selectedCategory,
    isProcessing,
    notes,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    setCustomer,
    setWarehouse,
    setSearchQuery,
    setSelectedCategory,
    setProcessing,
    setNotes,
    resetState,
    getCartQuantity,
    canCheckout,
  } = usePOSCart();

  // Set mounted state for SSR safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(
    (status: "PENDING" | "PAID") => {
      if (!canCheckout) {
        if (!selectedCustomerId) {
          toast.error("Selecciona un cliente para continuar");
        } else if (cart.length === 0) {
          toast.error("Agrega productos al carrito");
        }
        return;
      }

      setProcessing(true);

      createInvoice.mutate(
        {
          customerId: selectedCustomerId!,
          status: status as InvoiceStatus,
          issueDate: getTodayDate(),
          dueDate: getDateFromNow(30),
          notes: notes || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            description: item.product.description || item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
          })),
        },
        {
          onSuccess: () => {
            resetState();
            // Navigation is handled by the mutation hook
          },
          onError: () => {
            setProcessing(false);
          },
        },
      );
    },
    [
      canCheckout,
      selectedCustomerId,
      cart,
      notes,
      createInvoice,
      setProcessing,
      resetState,
    ],
  );

  // Handle clear cart with confirmation
  const handleClearCart = useCallback(() => {
    clearCart();
    toast.info("Carrito limpiado");
  }, [clearCart]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "F4":
          e.preventDefault();
          handleCheckout("PAID");
          break;
        case "F8":
          e.preventDefault();
          handleCheckout("PENDING");
          break;
        case "F9":
          e.preventDefault();
          if (cart.length > 0) {
            handleClearCart();
          }
          break;
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (searchQuery) {
            setSearchQuery("");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCheckout,
    handleClearCart,
    toggleFullscreen,
    cart.length,
    searchQuery,
    setSearchQuery,
  ]);

  // Get data arrays
  const customers = customersData?.data ?? [];
  const categories = categoriesData ?? [];
  const warehouses = warehousesData ?? [];

  // Filter products by warehouse stock (if warehouse is selected)
  const availableProducts = useMemo(() => {
    const products = productsData?.data ?? [];
    if (!selectedWarehouseId) return products;
    // For now, return all products - in production, filter by warehouse stock
    return products;
  }, [productsData?.data, selectedWarehouseId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full max-w-full min-w-0 flex-col overflow-x-hidden lg:h-[calc(100vh-2rem)]">
      {/* Header */}
      <header className="shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {/* Row 1: Back + Search + Actions */}
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/invoices">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                Punto de Venta
              </h1>
            </div>
          </div>

          {/* Center: Search */}
          <div className="min-w-0 flex-1 max-w-xl">
            <QuickSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar... (F2)"
            />
          </div>

          {/* Right: Desktop selectors + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop: Warehouse Select */}
            <div className="hidden lg:block">
              <WarehouseSelect
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                onSelectWarehouse={setWarehouse}
                isLoading={isLoadingWarehouses}
              />
            </div>

            {/* Desktop: Customer Select */}
            <div className="hidden md:block">
              <CustomerSelect
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setCustomer}
                isLoading={isLoadingCustomers}
              />
            </div>

            {/* Fullscreen Toggle */}
            {isMounted && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleFullscreen}
                title={
                  isFullscreen
                    ? "Salir pantalla completa (F11)"
                    : "Pantalla completa (F11)"
                }
                className="hidden sm:flex"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: Mobile Warehouse + Customer selects */}
        <div className="flex gap-2 px-3 pb-2 md:hidden">
          <WarehouseSelect
            warehouses={warehouses}
            selectedWarehouseId={selectedWarehouseId}
            onSelectWarehouse={setWarehouse}
            isLoading={isLoadingWarehouses}
            className="flex-1"
            compact
          />
          <CustomerSelect
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setCustomer}
            isLoading={isLoadingCustomers}
            className="flex-1"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden">
        {/* Desktop: Side by Side Layout - use flex-1 not fixed percentages */}
        <div className="hidden lg:flex lg:flex-1 lg:overflow-hidden">
          {/* Products Panel - flexible, can shrink */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="flex-1 overflow-auto p-4">
              <ProductCatalog
                products={availableProducts}
                categories={categories}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onSelectCategory={setSelectedCategory}
                onAddToCart={addToCart}
                getCartQuantity={getCartQuantity}
                isLoadingProducts={isLoadingProducts}
                isLoadingCategories={isLoadingCategories}
              />
            </div>
          </div>

          {/* Cart Panel - fixed minimum width, won't shrink below it */}
          <div className="flex w-[420px] min-w-[380px] max-w-[480px] flex-col overflow-hidden bg-white p-4 dark:bg-neutral-900">
            <CartPanel
              items={cart}
              totals={totals}
              notes={notes}
              isProcessing={isProcessing}
              canCheckout={canCheckout}
              onUpdateQuantity={updateQuantity}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={removeFromCart}
              onClearCart={handleClearCart}
              onSetNotes={setNotes}
              onCheckout={handleCheckout}
              className="flex-1"
            />
          </div>
        </div>

        {/* Tablet/Mobile: Tab-based Layout */}
        <div className="flex flex-1 flex-col min-w-0 w-full max-w-full lg:hidden">
          {/* Mobile Tab Navigation - touch-friendly with 44px min height */}
          <div className="flex shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setMobileTab("products")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors",
                mobileTab === "products"
                  ? "border-b-2 border-primary-600 text-primary-600"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Productos</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("cart")}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors",
                mobileTab === "cart"
                  ? "border-b-2 border-primary-600 text-primary-600"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Carrito</span>
              {cart.length > 0 && (
                <span className="absolute -top-0.5 sm:-top-1 right-1/4 flex h-4 sm:h-5 min-w-4 sm:min-w-5 items-center justify-center rounded-full bg-error-500 px-0.5 sm:px-1 text-[10px] sm:text-xs font-bold text-white">
                  {totals.itemCount > 99 ? "99+" : totals.itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Content */}
          <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {mobileTab === "products" ? (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    // Prevent overflow: min-w-0 + w-full + max-w-full + overflow-x-hidden
                    "h-full w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden bg-neutral-50 dark:bg-neutral-900/50",
                    // Smaller padding on mobile (p-2), normal on sm+ (p-4)
                    "p-2 sm:p-4",
                    // Space for floating cart bar - pb-28 ensures content not hidden
                    cart.length > 0 && "pb-28 sm:pb-24",
                  )}
                >
                  <ProductCatalog
                    products={availableProducts}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    searchQuery={searchQuery}
                    onSelectCategory={setSelectedCategory}
                    onAddToCart={(product) => {
                      addToCart(product);
                    }}
                    getCartQuantity={getCartQuantity}
                    isLoadingProducts={isLoadingProducts}
                    isLoadingCategories={isLoadingCategories}
                    itemsPerPage={8}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-full w-full max-w-full min-w-0 flex-col overflow-hidden bg-neutral-50 p-2 sm:p-4 dark:bg-neutral-900/50"
                >
                  <CartPanel
                    items={cart}
                    totals={totals}
                    notes={notes}
                    isProcessing={isProcessing}
                    canCheckout={canCheckout}
                    onUpdateQuantity={updateQuantity}
                    onIncrement={incrementQuantity}
                    onDecrement={decrementQuantity}
                    onRemove={removeFromCart}
                    onClearCart={handleClearCart}
                    onSetNotes={setNotes}
                    onCheckout={handleCheckout}
                    className="flex h-full flex-col"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Cart Summary Bar (when on products tab) */}
          {mobileTab === "products" && cart.length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white p-2 sm:p-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800"
              style={{
                paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                type="button"
                onClick={() => setMobileTab("cart")}
                className="flex w-full items-center justify-between rounded-lg sm:rounded-xl bg-primary-600 px-3 sm:px-4 py-3 sm:py-3.5 text-white transition-colors hover:bg-primary-700 min-h-[48px]"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="absolute -right-1.5 sm:-right-2 -top-1.5 sm:-top-2 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-white text-[10px] sm:text-xs font-bold text-primary-600">
                      {totals.itemCount}
                    </span>
                  </div>
                  <span className="text-sm sm:text-base font-medium">
                    Ver carrito
                  </span>
                </div>
                <span className="text-base sm:text-lg font-bold">
                  {formatCurrency(totals.total)}
                </span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
