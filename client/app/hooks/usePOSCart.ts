import { useReducer, useCallback, useMemo } from 'react';
import type { Product } from '~/types/product';
import {
  type POSCartItem,
  type CartTotals,
  calculateCartTotals,
  createCartItem,
  canAddToCart,
  COLOMBIA_VAT_RATE,
} from '~/lib/pos-utils';

/**
 * POS State interface
 */
export interface POSState {
  cart: POSCartItem[];
  selectedCustomerId: string | null;
  selectedWarehouseId: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  isProcessing: boolean;
  notes: string;
  globalDiscount: number;
}

/**
 * POS Action types
 */
type POSAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string } // productId
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'INCREMENT_QUANTITY'; payload: string } // productId
  | { type: 'DECREMENT_QUANTITY'; payload: string } // productId
  | { type: 'UPDATE_DISCOUNT'; payload: { productId: string; discount: number } }
  | { type: 'UPDATE_UNIT_PRICE'; payload: { productId: string; price: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER'; payload: string | null }
  | { type: 'SET_WAREHOUSE'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_CATEGORY'; payload: string | null }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_GLOBAL_DISCOUNT'; payload: number }
  | { type: 'RESET_STATE' };

/**
 * Initial state
 */
const initialState: POSState = {
  cart: [],
  selectedCustomerId: null,
  selectedWarehouseId: null,
  searchQuery: '',
  selectedCategory: null,
  isProcessing: false,
  notes: '',
  globalDiscount: 0,
};

/**
 * POS Reducer
 */
function posReducer(state: POSState, action: POSAction): POSState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const product = action.payload;
      const existingItem = state.cart.find((item) => item.productId === product.id);

      if (existingItem) {
        // Check if we can increment
        const newQuantity = existingItem.quantity + 1;
        const { canAdd } = canAddToCart(product, existingItem.quantity - 1, newQuantity);

        if (!canAdd) return state;

        return {
          ...state,
          cart: state.cart.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: newQuantity }
              : item
          ),
        };
      }

      // Check if we can add new item
      const { canAdd } = canAddToCart(product);
      if (!canAdd) return state;

      return {
        ...state,
        cart: [...state.cart, createCartItem(product)],
      };
    }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.productId !== action.payload),
      };

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;

      if (quantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter((item) => item.productId !== productId),
        };
      }

      const item = state.cart.find((i) => i.productId === productId);
      if (!item) return state;

      // Validate against stock
      if (quantity > item.product.stock) return state;

      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        ),
      };
    }

    case 'INCREMENT_QUANTITY': {
      const item = state.cart.find((i) => i.productId === action.payload);
      if (!item) return state;

      const newQuantity = item.quantity + 1;
      if (newQuantity > item.product.stock) return state;

      return {
        ...state,
        cart: state.cart.map((i) =>
          i.productId === action.payload ? { ...i, quantity: newQuantity } : i
        ),
      };
    }

    case 'DECREMENT_QUANTITY': {
      const item = state.cart.find((i) => i.productId === action.payload);
      if (!item) return state;

      const newQuantity = item.quantity - 1;
      if (newQuantity <= 0) {
        return {
          ...state,
          cart: state.cart.filter((i) => i.productId !== action.payload),
        };
      }

      return {
        ...state,
        cart: state.cart.map((i) =>
          i.productId === action.payload ? { ...i, quantity: newQuantity } : i
        ),
      };
    }

    case 'UPDATE_DISCOUNT': {
      const { productId, discount } = action.payload;
      const clampedDiscount = Math.max(0, Math.min(100, discount));

      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === productId
            ? { ...item, discount: clampedDiscount }
            : item
        ),
      };
    }

    case 'UPDATE_UNIT_PRICE': {
      const { productId, price } = action.payload;
      if (price < 0) return state;

      return {
        ...state,
        cart: state.cart.map((item) =>
          item.productId === productId
            ? { ...item, unitPrice: price }
            : item
        ),
      };
    }

    case 'SET_GLOBAL_DISCOUNT': {
      const clampedDiscount = Math.max(0, Math.min(100, action.payload));
      return {
        ...state,
        globalDiscount: clampedDiscount,
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
        notes: '',
      };

    case 'SET_CUSTOMER':
      return {
        ...state,
        selectedCustomerId: action.payload,
      };

    case 'SET_WAREHOUSE':
      return {
        ...state,
        selectedWarehouseId: action.payload,
        // Clear cart when warehouse changes to avoid stock conflicts
        cart: [],
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'SET_SELECTED_CATEGORY':
      return {
        ...state,
        selectedCategory: action.payload,
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      };

    case 'SET_NOTES':
      return {
        ...state,
        notes: action.payload,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

/**
 * Custom hook for POS cart management
 */
export function usePOSCart() {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // Actions
  const addToCart = useCallback((product: Product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);

  const incrementQuantity = useCallback((productId: string) => {
    dispatch({ type: 'INCREMENT_QUANTITY', payload: productId });
  }, []);

  const decrementQuantity = useCallback((productId: string) => {
    dispatch({ type: 'DECREMENT_QUANTITY', payload: productId });
  }, []);

  const updateDiscount = useCallback((productId: string, discount: number) => {
    dispatch({ type: 'UPDATE_DISCOUNT', payload: { productId, discount } });
  }, []);

  const updateUnitPrice = useCallback((productId: string, price: number) => {
    dispatch({ type: 'UPDATE_UNIT_PRICE', payload: { productId, price } });
  }, []);

  const setGlobalDiscount = useCallback((discount: number) => {
    dispatch({ type: 'SET_GLOBAL_DISCOUNT', payload: discount });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const setCustomer = useCallback((customerId: string | null) => {
    dispatch({ type: 'SET_CUSTOMER', payload: customerId });
  }, []);

  const setWarehouse = useCallback((warehouseId: string | null) => {
    dispatch({ type: 'SET_WAREHOUSE', payload: warehouseId });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setSelectedCategory = useCallback((categoryId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: categoryId });
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: processing });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: 'SET_NOTES', payload: notes });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Computed values
  const totals: CartTotals = useMemo(
    () => calculateCartTotals(state.cart, state.globalDiscount),
    [state.cart, state.globalDiscount]
  );

  const cartItemsMap = useMemo(() => {
    const map = new Map<string, number>();
    state.cart.forEach((item) => {
      map.set(item.productId, item.quantity);
    });
    return map;
  }, [state.cart]);

  const getCartQuantity = useCallback(
    (productId: string): number => {
      return cartItemsMap.get(productId) ?? 0;
    },
    [cartItemsMap]
  );

  const isInCart = useCallback(
    (productId: string): boolean => {
      return cartItemsMap.has(productId);
    },
    [cartItemsMap]
  );

  const canCheckout = useMemo(() => {
    return (
      state.cart.length > 0 &&
      state.selectedCustomerId !== null &&
      !state.isProcessing
    );
  }, [state.cart.length, state.selectedCustomerId, state.isProcessing]);

  return {
    // State
    ...state,
    totals,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    updateDiscount,
    updateUnitPrice,
    setGlobalDiscount,
    clearCart,
    setCustomer,
    setWarehouse,
    setSearchQuery,
    setSelectedCategory,
    setProcessing,
    setNotes,
    resetState,

    // Helpers
    getCartQuantity,
    isInCart,
    canCheckout,
  };
}

export type UsePOSCartReturn = ReturnType<typeof usePOSCart>;

// Re-export types for convenience
export type { POSCartItem, CartTotals };
export { COLOMBIA_VAT_RATE };