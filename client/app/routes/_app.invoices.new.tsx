import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { Link } from 'react-router';
import type { Route } from './+types/_app.invoices.new';
import { cn, formatCurrency } from '~/lib/utils';
import { getTodayDate, getDateFromNow } from '~/lib/pos-utils';
import { useCreateInvoice } from '~/hooks/useInvoices';
import { useCustomers } from '~/hooks/useCustomers';
import { useProducts } from '~/hooks/useProducts';
import { useCategories } from '~/hooks/useCategories';
import { usePOSCart } from '~/hooks/usePOSCart';
import { Button } from '~/components/ui/Button';
import { ThemeToggle } from '~/components/ui/ThemeToggle';
import { toast } from '~/components/ui/Toast';
import {
  ProductCatalog,
  CartPanel,
  QuickSearch,
  CustomerSelect,
} from '~/components/pos';
import type { InvoiceStatus } from '~/types/invoice';

// Meta for SEO
export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Punto de Venta - StockFlow' },
    { name: 'description', content: 'Sistema de punto de venta para facturacion rapida' },
  ];
};

// Mobile tab type
type MobileTab = 'products' | 'cart';

export default function POSPage() {
  // SSR-safe state for client-only features
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('products');

  // Data queries
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({ limit: 100 });
  const { data: productsData, isLoading: isLoadingProducts } = useProducts({ limit: 200 });
  const { data: categoriesData, isLoading: isLoadingCategories } = useCategories();
  const createInvoice = useCreateInvoice();

  // POS Cart hook
  const {
    cart,
    totals,
    selectedCustomerId,
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

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle checkout
  const handleCheckout = useCallback(
    (status: 'PENDING' | 'PAID') => {
      if (!canCheckout) {
        if (!selectedCustomerId) {
          toast.error('Selecciona un cliente para continuar');
        } else if (cart.length === 0) {
          toast.error('Agrega productos al carrito');
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
        }
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
    ]
  );

  // Handle clear cart with confirmation
  const handleClearCart = useCallback(() => {
    clearCart();
    toast.info('Carrito limpiado');
  }, [clearCart]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'F4':
          e.preventDefault();
          handleCheckout('PAID');
          break;
        case 'F8':
          e.preventDefault();
          handleCheckout('PENDING');
          break;
        case 'F9':
          e.preventDefault();
          if (cart.length > 0) {
            handleClearCart();
          }
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (searchQuery) {
            setSearchQuery('');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleCheckout,
    handleClearCart,
    toggleFullscreen,
    cart.length,
    searchQuery,
    setSearchQuery,
  ]);

  // Get data arrays
  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];
  const categories = categoriesData ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:h-[calc(100vh-2rem)]">
      {/* Header */}
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
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
          <div className="flex-1 max-w-xl">
            <QuickSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar productos... (F2)"
            />
          </div>

          {/* Right: Customer + Actions */}
          <div className="flex items-center gap-3">
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
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Salir pantalla completa (F11)' : 'Pantalla completa (F11)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile: Customer Select */}
        <div className="mt-3 md:hidden">
          <CustomerSelect
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setCustomer}
            isLoading={isLoadingCustomers}
            className="w-full"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: Side by Side Layout */}
        <div className="hidden lg:flex lg:flex-1">
          {/* Left Panel: Product Catalog (58%) */}
          <div className="flex w-[58%] flex-col overflow-hidden border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <ProductCatalog
              products={products}
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

          {/* Right Panel: Cart (42%) */}
          <div className="flex w-[42%] flex-col overflow-hidden bg-neutral-50 p-4 dark:bg-neutral-900/50">
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
              className="h-full"
            />
          </div>
        </div>

        {/* Tablet/Mobile: Tab-based Layout */}
        <div className="flex flex-1 flex-col lg:hidden">
          {/* Mobile Tab Navigation */}
          <div className="flex shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setMobileTab('products')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                mobileTab === 'products'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              <Package className="h-5 w-5" />
              Productos
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                mobileTab === 'cart'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              Carrito
              {cart.length > 0 && (
                <span className="absolute right-4 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {totals.itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {mobileTab === 'products' ? (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-auto bg-neutral-50 p-4 dark:bg-neutral-900/50"
                >
                  <ProductCatalog
                    products={products}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    searchQuery={searchQuery}
                    onSelectCategory={setSelectedCategory}
                    onAddToCart={(product) => {
                      addToCart(product);
                      // Optionally switch to cart tab after adding
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
                  className="h-full overflow-auto bg-neutral-50 p-4 dark:bg-neutral-900/50"
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
                    className="h-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Cart Summary Bar (when on products tab) */}
          {mobileTab === 'products' && cart.length > 0 && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="shrink-0 border-t border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
            >
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="flex w-full items-center justify-between rounded-xl bg-primary-600 px-4 py-3 text-white shadow-lg transition-colors hover:bg-primary-700"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">
                    {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <span className="text-lg font-bold">
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