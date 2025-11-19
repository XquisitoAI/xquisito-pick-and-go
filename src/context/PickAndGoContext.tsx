"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { PickAndGoOrder, PickAndGoItem } from "@/services/api";
import { usePickAndGo } from "@/hooks/usePickAndGo";

// Import enhanced cart utilities from TableContext
import {
  CartItem,
  CustomField,
  calculateTotals,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart,
  getUserAuthInfo,
  saveGuestInfo,
  generateGuestId,
  validateCartItem,
  validateCustomFields
} from "@/utils/cartHelpers";

// ===============================================
// ENHANCED TYPES AND INTERFACES
// ===============================================

// CartItem is now imported from cartHelpers with full custom fields support

interface PickAndGoState {
  // Orden actual
  currentOrder: PickAndGoOrder | null;

  // Items del carrito (antes de confirmar orden)
  cartItems: CartItem[];
  cartTotal: number;
  cartItemCount: number;

  // Estados de carga y error
  loading: boolean;
  error: string | null;

  // Enhanced customer info with authentication support
  customerInfo: {
    name: string;
    phone?: string;
    email?: string;
    isAuthenticated?: boolean;
    userId?: string;
    guestId?: string;
  } | null;

  // Estado del flujo
  currentStep: 'menu' | 'cart' | 'checkout' | 'payment' | 'confirmation' | 'tracking';

  // Metadatos de la sesión
  sessionData: Record<string, any>;

  // Enhanced restaurant context (replacing table functionality)
  restaurantId?: string;
}

type PickAndGoAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CURRENT_ORDER"; payload: PickAndGoOrder | null }
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "REMOVE_FROM_CART"; payload: { id: string; customFields?: CustomField[] } }
  | { type: "UPDATE_CART_QUANTITY"; payload: { id: string; quantity: number; customFields?: CustomField[] } }
  | { type: "CLEAR_CART" }
  | { type: "SET_CUSTOMER_INFO"; payload: PickAndGoState['customerInfo'] }
  | { type: "SET_CURRENT_STEP"; payload: PickAndGoState['currentStep'] }
  | { type: "UPDATE_SESSION_DATA"; payload: Record<string, any> }
  | { type: "SET_RESTAURANT_ID"; payload: string }
  | { type: "SYNC_TOTALS" };

// ===============================================
// REDUCER
// ===============================================

const initialState: PickAndGoState = {
  currentOrder: null,
  cartItems: [],
  cartTotal: 0,
  cartItemCount: 0,
  loading: false,
  error: null,
  customerInfo: null,
  currentStep: 'menu',
  sessionData: {},
  restaurantId: undefined
};

function pickAndGoReducer(state: PickAndGoState, action: PickAndGoAction): PickAndGoState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_CURRENT_ORDER":
      return { ...state, currentOrder: action.payload };

    case "ADD_TO_CART": {
      // Use enhanced cart logic from TableContext
      const updatedItems = addItemToCart(state.cartItems, action.payload);
      const { totalItems, totalPrice } = calculateTotals(updatedItems);

      return {
        ...state,
        cartItems: updatedItems,
        cartTotal: totalPrice,
        cartItemCount: totalItems
      };
    }

    case "REMOVE_FROM_CART": {
      // Use enhanced removal logic with custom fields support
      const updatedItems = removeItemFromCart(
        state.cartItems,
        action.payload.id,
        action.payload.customFields
      );
      const { totalItems, totalPrice } = calculateTotals(updatedItems);

      return {
        ...state,
        cartItems: updatedItems,
        cartTotal: totalPrice,
        cartItemCount: totalItems
      };
    }

    case "UPDATE_CART_QUANTITY": {
      // Use enhanced quantity update logic with custom fields support
      const updatedItems = updateCartItemQuantity(
        state.cartItems,
        action.payload.id,
        action.payload.quantity,
        action.payload.customFields
      );
      const { totalItems, totalPrice } = calculateTotals(updatedItems);

      return {
        ...state,
        cartItems: updatedItems,
        cartTotal: totalPrice,
        cartItemCount: totalItems
      };
    }

    case "CLEAR_CART": {
      const emptyCart = clearCart();
      const { totalItems, totalPrice } = calculateTotals(emptyCart);

      return {
        ...state,
        cartItems: emptyCart,
        cartTotal: totalPrice,
        cartItemCount: totalItems
      };
    }

    case "SYNC_TOTALS": {
      // Recalculate totals from current cart items
      const { totalItems, totalPrice } = calculateTotals(state.cartItems);
      return {
        ...state,
        cartTotal: totalPrice,
        cartItemCount: totalItems
      };
    }

    case "SET_RESTAURANT_ID":
      return {
        ...state,
        restaurantId: action.payload
      };

    case "SET_CUSTOMER_INFO":
      return { ...state, customerInfo: action.payload };

    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload };

    case "UPDATE_SESSION_DATA":
      return {
        ...state,
        sessionData: { ...state.sessionData, ...action.payload }
      };

    default:
      return state;
  }
}

// ===============================================
// CONTEXTO
// ===============================================

interface PickAndGoContextType {
  state: PickAndGoState;
  dispatch: React.Dispatch<PickAndGoAction>;

  // Enhanced cart actions with custom fields support
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (itemId: string, customFields?: CustomField[]) => void;
  updateCartQuantity: (itemId: string, quantity: number, customFields?: CustomField[]) => void;
  clearCart: () => void;
  syncCartTotals: () => void;

  // Order actions
  createOrder: () => Promise<PickAndGoOrder | null>;
  confirmOrder: () => Promise<void>;
  trackOrder: (orderId: string) => Promise<void>;

  // Enhanced customer management
  setCustomerInfo: (info: PickAndGoState['customerInfo']) => void;
  initializeCustomerFromAuth: () => void;
  saveGuestInfo: (name: string) => void;

  // Flow management
  setCurrentStep: (step: PickAndGoState['currentStep']) => void;
  updateSessionData: (data: Record<string, any>) => void;
  setRestaurantId: (restaurantId: string) => void;

  // Utilities
  clearError: () => void;
  validateItem: (item: Partial<CartItem>) => boolean;
}

const PickAndGoContext = createContext<PickAndGoContextType | undefined>(undefined);

// ===============================================
// PROVIDER
// ===============================================

interface PickAndGoProviderProps {
  children: ReactNode;
}

export function PickAndGoProvider({ children }: PickAndGoProviderProps) {
  const [state, dispatch] = useReducer(pickAndGoReducer, initialState);
  const { user, isLoaded } = useUser();
  const pickAndGoHook = usePickAndGo();

  // Initialize customer info when user authentication changes
  useEffect(() => {
    if (isLoaded) {
      initializeCustomerFromAuth();
    }
  }, [isLoaded, user]);

  // Sync loading and error state from hook
  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: pickAndGoHook.loading });
  }, [pickAndGoHook.loading]);

  useEffect(() => {
    dispatch({ type: "SET_ERROR", payload: pickAndGoHook.error });
  }, [pickAndGoHook.error]);

  useEffect(() => {
    dispatch({ type: "SET_CURRENT_ORDER", payload: pickAndGoHook.currentOrder });
  }, [pickAndGoHook.currentOrder]);

  // ===============================================
  // ACCIONES
  // ===============================================

  // ===============================================
  // ENHANCED CART ACTIONS
  // ===============================================

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    // Validate item before adding
    if (!validateItem(item)) {
      console.error('❌ Invalid item data:', item);
      dispatch({ type: "SET_ERROR", payload: "Invalid item data" });
      return;
    }

    const cartItem: CartItem = {
      ...item,
      id: `${item.name}-${Date.now()}-${Math.random()}`
    };

    dispatch({ type: "ADD_TO_CART", payload: cartItem });
    console.log('🛒 Item added to cart:', cartItem.name, cartItem.customFields ? 'with custom fields' : '');
  };

  const removeFromCart = (itemId: string, customFields?: CustomField[]) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: { id: itemId, customFields } });
    console.log('🗑️ Item removed from cart:', itemId, customFields ? 'with custom fields' : '');
  };

  const updateCartQuantity = (itemId: string, quantity: number, customFields?: CustomField[]) => {
    dispatch({ type: "UPDATE_CART_QUANTITY", payload: { id: itemId, quantity, customFields } });
    console.log('🔄 Cart quantity updated:', itemId, quantity, customFields ? 'with custom fields' : '');
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
    console.log('🧹 Cart cleared');
  };

  const syncCartTotals = () => {
    dispatch({ type: "SYNC_TOTALS" });
  };

  // ===============================================
  // AUTHENTICATION & CUSTOMER MANAGEMENT
  // ===============================================

  const initializeCustomerFromAuth = () => {
    const authInfo = getUserAuthInfo(isLoaded, user);

    setCustomerInfo({
      name: authInfo.displayName,
      email: authInfo.email || undefined,
      isAuthenticated: authInfo.isAuthenticated,
      userId: authInfo.userId || undefined,
      guestId: authInfo.guestId || undefined
    });

    console.log('👤 Customer initialized:', {
      authenticated: authInfo.isAuthenticated,
      name: authInfo.displayName
    });
  };

  const saveGuestInfoLocal = (name: string) => {
    const guestId = generateGuestId();
    saveGuestInfo(name, guestId);

    setCustomerInfo({
      name,
      isAuthenticated: false,
      guestId
    });

    console.log('👤 Guest info saved:', { name, guestId });
  };

  // ===============================================
  // ENHANCED ORDER MANAGEMENT
  // ===============================================

  const createOrder = async (): Promise<PickAndGoOrder | null> => {
    // Enhanced validation - support both authenticated and guest users
    if (state.cartItems.length === 0) {
      console.error('❌ Cannot create order: empty cart');
      dispatch({ type: "SET_ERROR", payload: "Cart is empty" });
      return null;
    }

    if (!state.customerInfo?.name) {
      console.error('❌ Cannot create order: missing customer info');
      dispatch({ type: "SET_ERROR", payload: "Customer information required" });
      return null;
    }

    try {
      // Enhanced order data with authentication support
      const orderData = {
        clerk_user_id: state.customerInfo.userId || null,
        customer_name: state.customerInfo.name,
        customer_phone: state.customerInfo.phone,
        customer_email: state.customerInfo.email,
        total_amount: state.cartTotal,
        session_data: {
          ...state.sessionData,
          cartItemCount: state.cartItemCount,
          pickupPreference: 'asap',
          guestId: state.customerInfo.guestId,
          isAuthenticated: state.customerInfo.isAuthenticated
        },
        prep_metadata: {
          estimatedItems: state.cartItems.length,
          cartTotal: state.cartTotal,
          cartItems: state.cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customFields: item.customFields,
            extraPrice: item.extraPrice
          }))
        }
      };

      // Create the order
      const order = await pickAndGoHook.createOrder(orderData);

      if (order) {
        console.log('✅ Order created successfully:', order.id);
        setCurrentStep('confirmation');
        return order;
      } else {
        dispatch({ type: "SET_ERROR", payload: "Failed to create order" });
      }

      return null;
    } catch (error) {
      console.error('💥 Error creating order:', error);
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  };

  const confirmOrder = async () => {
    if (!pickAndGoHook.currentOrder) {
      console.error('❌ No current order to confirm');
      dispatch({ type: "SET_ERROR", payload: "No order to confirm" });
      return;
    }

    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Add all cart items to the order with enhanced custom fields support
      for (const cartItem of state.cartItems) {
        await pickAndGoHook.addItemToOrder({
          item: cartItem.name,
          quantity: cartItem.quantity,
          price: cartItem.price,
          custom_fields: {
            description: cartItem.description,
            extras: cartItem.extras || [],
            customFields: cartItem.customFields || []
          },
          extra_price: cartItem.extraPrice || 0,
          images: cartItem.images || (cartItem.image ? [cartItem.image] : [])
        });
      }

      // Update order status
      await pickAndGoHook.updateOrderStatus('confirmed');

      // Clear cart and advance to tracking
      clearCart();
      setCurrentStep('tracking');
      dispatch({ type: "SET_LOADING", payload: false });

      console.log('✅ Order confirmed successfully');
    } catch (error) {
      console.error('💥 Error confirming order:', error);
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : 'Failed to confirm order' });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const trackOrder = async (orderId: string) => {
    try {
      await pickAndGoHook.getOrder(orderId);
      setCurrentStep('tracking');
      console.log('✅ Now tracking order:', orderId);
    } catch (error) {
      console.error('💥 Error tracking order:', error);
    }
  };

  // ===============================================
  // UTILITY FUNCTIONS
  // ===============================================

  const setCustomerInfo = (info: PickAndGoState['customerInfo']) => {
    dispatch({ type: "SET_CUSTOMER_INFO", payload: info });
  };

  const setCurrentStep = (step: PickAndGoState['currentStep']) => {
    dispatch({ type: "SET_CURRENT_STEP", payload: step });
  };

  const updateSessionData = (data: Record<string, any>) => {
    dispatch({ type: "UPDATE_SESSION_DATA", payload: data });
  };

  const setRestaurantId = (restaurantId: string) => {
    dispatch({ type: "SET_RESTAURANT_ID", payload: restaurantId });
  };

  const clearError = () => {
    dispatch({ type: "SET_ERROR", payload: null });
    pickAndGoHook.clearError();
  };

  const validateItem = (item: Partial<CartItem>): boolean => {
    return validateCartItem(item) && validateCustomFields(item.customFields);
  };

  // ===============================================
  // CONTEXT VALUE
  // ===============================================

  const contextValue: PickAndGoContextType = {
    state,
    dispatch,
    // Enhanced cart actions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    syncCartTotals,
    // Order actions
    createOrder,
    confirmOrder,
    trackOrder,
    // Enhanced customer management
    setCustomerInfo,
    initializeCustomerFromAuth,
    saveGuestInfo: saveGuestInfoLocal,
    // Flow management
    setCurrentStep,
    updateSessionData,
    setRestaurantId,
    // Utilities
    clearError,
    validateItem
  };

  return (
    <PickAndGoContext.Provider value={contextValue}>
      {children}
    </PickAndGoContext.Provider>
  );
}

// ===============================================
// HOOK
// ===============================================

export function usePickAndGoContext() {
  const context = useContext(PickAndGoContext);
  if (!context) {
    throw new Error('usePickAndGoContext must be used within a PickAndGoProvider');
  }
  return context;
}