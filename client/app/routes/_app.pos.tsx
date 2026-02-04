import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "~/lib/animations";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  User,
  CreditCard,
  Banknote,
  LogOut,
  Maximize,
  Keyboard,
} from "lucide-react";
import type { Route } from "./+types/_app.pos";
import { useCurrentSession, useCreateSale } from "~/hooks/usePOS";
import { useProducts } from "~/hooks/useProducts";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import {
  POSCart,
  POSProductSearch,
  POSSplitPaymentModal,
} from "~/components/pos";
import { formatCurrency, formatDateTime } from "~/lib/utils";
import { useBarcodeScanner } from "~/hooks/useBarcodeScanner";
import { usePOSKeyboard, toggleFullscreen } from "~/hooks/usePOSKeyboard";
import type { CartItem, SalePaymentData } from "~/types/pos";
import type { Product } from "~/types/product";
import { toast } from "sonner";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Punto de Venta - StockFlow" },
    { name: "description", content: "Sistema de punto de venta" },
  ];
};

export default function POSPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const { data: session, isLoading: isSessionLoading } = useCurrentSession();
  const { data: productsData, isLoading: isProductsLoading } = useProducts({
    status: "ACTIVE",
    limit: 500,
  });
  const createSaleMutation = useCreateSale();

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>();

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  const products = productsData?.data || [];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to open session if no active session
  useEffect(() => {
    if (!isSessionLoading && !session) {
      navigate("/pos/open");
    }
  }, [session, isSessionLoading, navigate]);

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
        await createSaleMutation.mutateAsync({
          customerId,
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          })),
          payments,
          discountPercent: globalDiscount,
        });

        toast.success("Venta procesada exitosamente");
        setShowPaymentModal(false);
        clearCart();
      } catch {
        toast.error("Error al procesar la venta");
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
        (Date.now() - new Date(session.openedAt).getTime()) / 1000 / 60,
      )
    : 0;
  const hours = Math.floor(sessionDuration / 60);
  const minutes = sessionDuration % 60;

  return (
    <motion.div
      variants={containerVariants}
      initial={isMounted ? "hidden" : false}
      animate="visible"
      className="h-[calc(100vh-8rem)] flex flex-col gap-4"
    >
      {/* Session Status Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-display">
                    Punto de Venta
                  </h1>
                  <p className="text-primary-100 text-sm">
                    Caja: {session.cashRegister?.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-white/20 text-white border-0">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {formatCurrency(session.totalSales || 0)}
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  <Clock className="h-4 w-4 mr-1" />
                  {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  <User className="h-4 w-4 mr-1" />
                  {session.user?.firstName || "Usuario"}
                </Badge>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                    title="Pantalla completa (F11)"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                  <Link to="/pos/close">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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
      </motion.div>

      {/* Main POS Interface */}
      <motion.div
        variants={itemVariants}
        className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0"
      >
        {/* Product Search & Catalog */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Search Bar */}
          <POSProductSearch
            products={products}
            isLoading={isProductsLoading}
            onSelectProduct={addToCart}
            inputRef={searchInputRef}
          />

          {/* Keyboard Shortcuts Info */}
          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <Keyboard className="h-4 w-4" />
              <span>Atajos:</span>
            </div>
            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
              F2
            </span>
            <span>Buscar</span>
            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
              F4
            </span>
            <span>Cobrar</span>
            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
              F11
            </span>
            <span>Pantalla completa</span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 dark:bg-success-900/20">
                  <DollarSign className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Ventas</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(session.totalSales || 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/20">
                  <Banknote className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Efectivo</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      session.currentCash || session.openingAmount || 0,
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/20">
                  <CreditCard className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Transacciones</p>
                  <p className="text-lg font-bold">{session.salesCount || 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Link to="/pos/sales">
              <Button variant="outline" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ver Ventas
              </Button>
            </Link>
            <Link to={`/pos/sessions/${session.id}`}>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Reporte X
              </Button>
            </Link>
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
      </motion.div>

      {/* Payment Modal */}
      <POSSplitPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleCheckout}
        total={cartTotal}
        isProcessing={createSaleMutation.isPending}
      />
    </motion.div>
  );
}
