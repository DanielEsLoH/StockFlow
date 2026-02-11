import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  ShoppingCart,
  Package,
  Sparkles,
  Zap,
  Clock,
  Keyboard,
} from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/_app.invoices.new";
import { cn, formatCurrency } from "~/lib/utils";
import { getDateFromNow } from "~/lib/pos-utils";
import { useCheckoutInvoice } from "~/hooks/useInvoices";
import { useCustomers } from "~/hooks/useCustomers";
import { useProducts } from "~/hooks/useProducts";
import { useCategories } from "~/hooks/useCategories";
import { useWarehouses } from "~/hooks/useWarehouses";
import { useAuthStore } from "~/stores/auth.store";
import { usePOSCart } from "~/hooks/usePOSCart";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import { ThemeToggle } from "~/components/ui/ThemeToggle";
import { toast } from "~/components/ui/Toast";
import {
  ProductCatalog,
  POSCartPro,
  QuickSearch,
  CustomerSelect,
  WarehouseSelect,
  POSTicketModal,
} from "~/components/pos";
import type { Customer } from "~/types/customer";

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

// Invoice mode type
type InvoiceMode = "POS" | "MANUAL";

export default function POSPage() {
  // SSR-safe state for client-only features
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("products");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<InvoiceMode>("POS");
  const [lastInvoice, setLastInvoice] = useState<{
    invoiceNumber: string;
    items: typeof cart;
    totals: typeof totals;
    customer: Customer | null;
    payments: { method: string; amount: number }[];
  } | null>(null);

  // POS Cart hook - must be before useProducts to have selectedWarehouseId available
  const {
    cart,
    totals,
    selectedCustomerId,
    selectedWarehouseId,
    searchQuery,
    selectedCategory,
    isProcessing,
    notes,
    globalDiscount,
    ivaEnabled,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    updateDiscount,
    updateUnitPrice,
    setGlobalDiscount,
    setIvaEnabled,
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

  // Auth store — check if user has an assigned warehouse
  const authUser = useAuthStore((state) => state.user);
  const userWarehouseId = authUser?.warehouseId ?? null;
  const isAdmin =
    authUser?.role === "ADMIN" || authUser?.role === "SUPER_ADMIN";

  // Lock warehouse to user's assigned warehouse for non-admin users
  useEffect(() => {
    if (userWarehouseId && !isAdmin && selectedWarehouseId !== userWarehouseId) {
      setWarehouse(userWarehouseId);
    }
  }, [userWarehouseId, isAdmin, selectedWarehouseId, setWarehouse]);

  // Data queries
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    limit: 100,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({
    limit: 100,
    status: "ACTIVE",
    ...(selectedWarehouseId && { warehouseId: selectedWarehouseId }),
  });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories();
  const { data: warehousesData, isLoading: isLoadingWarehouses } =
    useWarehouses();
  const checkoutInvoice = useCheckoutInvoice();

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

  // Get customers array for selectedCustomer lookup
  const customers = customersData?.data ?? [];

  // Get selected customer object (needed by handleCheckout)
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) ?? null;
  }, [selectedCustomerId, customers]);

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

      // Save cart data before reset for ticket
      const cartSnapshot = [...cart];
      const totalsSnapshot = { ...totals };
      const customerSnapshot = selectedCustomer;

      checkoutInvoice.mutate(
        {
          customerId: selectedCustomerId!,
          dueDate: getDateFromNow(30),
          notes: notes || undefined,
          source: invoiceMode,
          warehouseId: selectedWarehouseId || undefined,
          immediatePayment: status === "PAID",
          paymentMethod: "CASH",
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.unitPrice * item.quantity * (item.discount / 100),
            taxRate: item.tax,
          })),
        },
        {
          onSuccess: (data) => {
            setLastInvoice({
              invoiceNumber: data.invoiceNumber,
              items: cartSnapshot,
              totals: totalsSnapshot,
              customer: customerSnapshot,
              payments:
                status === "PAID"
                  ? [{ method: "CASH", amount: totalsSnapshot.total }]
                  : [],
            });

            resetState();
            setProcessing(false);

            if (status === "PAID") {
              setShowTicketModal(true);
            }
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
      selectedCustomer,
      cart,
      totals,
      notes,
      invoiceMode,
      checkoutInvoice,
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
          if (invoiceMode === "POS") {
            handleCheckout("PAID");
          }
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
    invoiceMode,
  ]);

  // Get data arrays
  const categories = categoriesData ?? [];
  const warehouses = warehousesData ?? [];

  // Products are already filtered by warehouse from the backend when warehouseId is provided
  const availableProducts = productsData?.data ?? [];

  // Current time display
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full max-w-full min-w-0 flex-col overflow-x-hidden lg:h-[calc(100vh-2rem)]">
      {/* Premium POS Header */}
      <header className="shrink-0 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        {/* Row 1: Main Controls */}
        <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <Link to="/invoices">
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  Punto de Venta
                  <Badge variant="gradient" size="xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <Clock className="h-3 w-3" />
                  {currentTime.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Search */}
          <div className="min-w-0 flex-1 max-w-md">
            <QuickSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar productos... (F2)"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Keyboard Shortcuts Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="hidden lg:flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4" />
              <span className="text-xs">Atajos</span>
            </Button>

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

            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: Mode toggle + Warehouse + Customer selects */}
        <div className="flex items-center gap-3 px-3 pb-3 sm:px-4">
          {/* Invoice Mode Toggle */}
          <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setInvoiceMode("POS")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                invoiceMode === "POS"
                  ? "bg-primary-500 text-white"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700",
              )}
            >
              POS
            </button>
            <button
              type="button"
              onClick={() => setInvoiceMode("MANUAL")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                invoiceMode === "MANUAL"
                  ? "bg-primary-500 text-white"
                  : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700",
              )}
            >
              Manual
            </button>
          </div>
          <WarehouseSelect
            warehouses={warehouses}
            selectedWarehouseId={selectedWarehouseId}
            onSelectWarehouse={setWarehouse}
            isLoading={isLoadingWarehouses}
            className="flex-1 sm:flex-none sm:w-56"
            compact
            disabled={!isAdmin && !!userWarehouseId}
          />
          <CustomerSelect
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setCustomer}
            isLoading={isLoadingCustomers}
            className="flex-1 sm:flex-none sm:w-64"
          />

          {/* Quick Action Buttons - Desktop only */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            {invoiceMode === "POS" && (
              <Button
                variant="soft-success"
                size="sm"
                onClick={() => handleCheckout("PAID")}
                disabled={!canCheckout || isProcessing}
                className="gap-2"
              >
                <kbd className="px-1.5 py-0.5 rounded bg-success-600/20 text-[10px] font-mono">
                  F4
                </kbd>
                Cobrar
              </Button>
            )}
            <Button
              variant="soft-warning"
              size="sm"
              onClick={() => handleCheckout("PENDING")}
              disabled={!canCheckout || isProcessing}
              className="gap-2"
            >
              <kbd className="px-1.5 py-0.5 rounded bg-warning-600/20 text-[10px] font-mono">
                F8
              </kbd>
              Guardar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="gap-2"
            >
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-500/20 text-[10px] font-mono">
                F9
              </kbd>
              Limpiar
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Panel */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-center justify-center gap-6 py-2 px-4 bg-neutral-100/50 dark:bg-neutral-800/50">
                <div className="flex items-center gap-2 text-xs">
                  <kbd className="px-2 py-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono shadow-sm">
                    F2
                  </kbd>
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Buscar
                  </span>
                </div>
                {invoiceMode === "POS" && (
                  <div className="flex items-center gap-2 text-xs">
                    <kbd className="px-2 py-1 rounded bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-700 font-mono text-success-700 dark:text-success-300">
                      F4
                    </kbd>
                    <span className="text-neutral-600 dark:text-neutral-300">
                      Cobrar
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <kbd className="px-2 py-1 rounded bg-warning-100 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-700 font-mono text-warning-700 dark:text-warning-300">
                    F8
                  </kbd>
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Guardar
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <kbd className="px-2 py-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono shadow-sm">
                    F9
                  </kbd>
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Limpiar
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <kbd className="px-2 py-1 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono shadow-sm">
                    F11
                  </kbd>
                  <span className="text-neutral-600 dark:text-neutral-300">
                    Pantalla completa
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden">
        {/* Desktop: Side by Side Layout */}
        <div className="hidden lg:flex lg:flex-1 lg:overflow-hidden">
          {/* Products Panel */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-neutral-200 bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:border-neutral-700 dark:from-neutral-900/50 dark:to-neutral-900">
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

          {/* Cart Panel */}
          <div className="flex w-[440px] min-w-[400px] max-w-[500px] flex-col overflow-hidden bg-white dark:bg-neutral-900">
            <POSCartPro
              items={cart}
              totals={totals}
              notes={notes}
              isProcessing={isProcessing}
              canCheckout={canCheckout}
              customer={selectedCustomer}
              globalDiscount={globalDiscount}
              ivaEnabled={ivaEnabled}
              onUpdateQuantity={updateQuantity}
              onUpdatePrice={updateUnitPrice}
              onUpdateItemDiscount={updateDiscount}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              onRemove={removeFromCart}
              onClearCart={handleClearCart}
              onSetNotes={setNotes}
              onSetGlobalDiscount={setGlobalDiscount}
              onSetIvaEnabled={setIvaEnabled}
              onSelectCustomer={() => {
                const customerSelect = document.querySelector(
                  "[data-customer-select]",
                );
                if (customerSelect instanceof HTMLElement) {
                  customerSelect.click();
                }
              }}
              onCheckout={handleCheckout}
              invoiceMode={invoiceMode}
              className="flex-1"
            />
          </div>
        </div>

        {/* Tablet/Mobile: Tab-based Layout */}
        <div className="flex flex-1 flex-col min-w-0 w-full max-w-full lg:hidden">
          {/* Mobile Tab Navigation */}
          <div className="flex shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setMobileTab("products")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 min-h-[52px] py-3 text-sm font-medium transition-all",
                mobileTab === "products"
                  ? "border-b-2 border-primary-500 text-primary-600 bg-primary-50/50 dark:bg-primary-900/20"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <Package className="h-5 w-5" />
              <span>Productos</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("cart")}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 min-h-[52px] py-3 text-sm font-medium transition-all",
                mobileTab === "cart"
                  ? "border-b-2 border-primary-500 text-primary-600 bg-primary-50/50 dark:bg-primary-900/20"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Carrito</span>
              {cart.length > 0 && (
                <Badge
                  variant="gradient"
                  size="xs"
                  className="absolute top-2 right-1/4"
                >
                  {totals.itemCount > 99 ? "99+" : totals.itemCount}
                </Badge>
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
                    "h-full w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-neutral-900/50 dark:to-neutral-900",
                    "p-3 sm:p-4",
                    cart.length > 0 && "pb-28",
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
                  className="flex h-full w-full max-w-full min-w-0 flex-col overflow-hidden bg-white p-3 sm:p-4 dark:bg-neutral-900"
                >
                  <POSCartPro
                    items={cart}
                    totals={totals}
                    notes={notes}
                    isProcessing={isProcessing}
                    canCheckout={canCheckout}
                    customer={selectedCustomer}
                    globalDiscount={globalDiscount}
                    ivaEnabled={ivaEnabled}
                    onUpdateQuantity={updateQuantity}
                    onUpdatePrice={updateUnitPrice}
                    onUpdateItemDiscount={updateDiscount}
                    onIncrement={incrementQuantity}
                    onDecrement={decrementQuantity}
                    onRemove={removeFromCart}
                    onClearCart={handleClearCart}
                    onSetNotes={setNotes}
                    onSetGlobalDiscount={setGlobalDiscount}
                    onSetIvaEnabled={setIvaEnabled}
                    onSelectCustomer={() => setMobileTab("products")}
                    onCheckout={handleCheckout}
                    invoiceMode={invoiceMode}
                    className="flex h-full flex-col"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Cart Summary Bar */}
          {mobileTab === "products" && cart.length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-xl p-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900/95"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                type="button"
                onClick={() => setMobileTab("cart")}
                className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-3.5 text-white transition-all hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary-600">
                      {totals.itemCount}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Ver carrito</span>
                    <span className="text-xs text-white/70">
                      {totals.itemCount}{" "}
                      {totals.itemCount === 1 ? "producto" : "productos"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold">
                    {formatCurrency(totals.total)}
                  </span>
                  {totals.discountAmount > 0 && (
                    <span className="text-xs text-white/70">
                      -{formatCurrency(totals.discountAmount)}
                    </span>
                  )}
                </div>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* POS Ticket Modal */}
      {lastInvoice && (
        <POSTicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          businessName="Mi Negocio"
          invoiceNumber={lastInvoice.invoiceNumber}
          date={new Date().toLocaleString("es-CO")}
          customerName={lastInvoice.customer?.name}
          customerDocument={lastInvoice.customer?.document}
          items={lastInvoice.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total:
              item.quantity *
              item.unitPrice *
              (1 - item.discount / 100) *
              (1 + item.tax / 100),
          }))}
          subtotal={lastInvoice.totals.subtotal}
          discountAmount={lastInvoice.totals.discountAmount}
          taxAmount={lastInvoice.totals.taxAmount}
          total={lastInvoice.totals.total}
          payments={lastInvoice.payments.map((p) => ({
            method: p.method,
            methodLabel: p.method === "CASH" ? "Efectivo" : p.method,
            amount: p.amount,
          }))}
          change={0}
          footerMessage="¡Gracias por su compra!"
        />
      )}
    </div>
  );
}
