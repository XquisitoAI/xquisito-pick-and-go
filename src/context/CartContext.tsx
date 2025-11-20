"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { MenuItemData } from "../interfaces/menuItemData";
import { cartApi, CartItem as ApiCartItem } from "../services/cartApi";
import { useUser } from "@clerk/nextjs";
import { useRestaurant } from "./RestaurantContext";

// Interfaz para un item del carrito (frontend)
export interface CartItem extends MenuItemData {
  quantity: number;
  cartItemId?: string; // ID del item en el carrito (del backend)
}

// Estado del carrito
interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  userName: string;
  isLoading: boolean;
  cartId: string | null;
}

// Acciones del carrito
type CartAction =
  | { type: "ADD_ITEM"; payload: MenuItemData }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "SET_USER_NAME"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | {
      type: "SET_CART";
      payload: {
        items: CartItem[];
        totalItems: number;
        totalPrice: number;
        cartId: string | null;
      };
    };

// Estado inicial
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  userName: "",
  isLoading: false,
  cartId: null,
};

// Reducer del carrito
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_CART":
      return {
        ...state,
        items: action.payload.items,
        totalItems: action.payload.totalItems,
        totalPrice: action.payload.totalPrice,
        cartId: action.payload.cartId,
        isLoading: false,
      };

    case "SET_USER_NAME":
      return {
        ...state,
        userName: action.payload,
      };

    case "CLEAR_CART":
      return {
        ...initialState,
        userName: state.userName, // Mantener userName
      };

    // Las acciones ADD_ITEM, REMOVE_ITEM, UPDATE_QUANTITY ahora son manejadas por el provider
    // usando la API, pero mantenemos los casos para actualización optimista
    case "ADD_ITEM":
    case "REMOVE_ITEM":
    case "UPDATE_QUANTITY":
      return state;

    default:
      return state;
  }
}

// Helper para convertir ApiCartItem a CartItem
function convertApiItemToCartItem(apiItem: ApiCartItem): CartItem {
  return {
    id: apiItem.menu_item_id,
    name: apiItem.name,
    description: apiItem.description || "",
    price: apiItem.price,
    images: apiItem.images || [],
    features: apiItem.features || [],
    discount: apiItem.discount || 0,
    customFields: apiItem.customFields || [],
    extraPrice: apiItem.extraPrice || 0,
    quantity: apiItem.quantity,
    cartItemId: apiItem.id,
  };
}

// Contexto del carrito con funciones
interface CartContextType {
  state: CartState;
  addItem: (item: MenuItemData) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  setUserName: (name: string) => void;
  submitCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

// Provider del carrito
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user, isLoaded } = useUser();
  const { restaurantId } = useRestaurant();

  // Establecer clerk_user_id y restaurant_id en cartApi cuando cambien
  useEffect(() => {
    if (isLoaded) {
      cartApi.setClerkUserId(user?.id || null);
    }
  }, [user, isLoaded]);

  useEffect(() => {
    if (restaurantId) {
      cartApi.setRestaurantId(restaurantId);
    }
  }, [restaurantId]);

  // Función para refrescar el carrito desde el backend
  const refreshCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await cartApi.getCart();

      if (response.success && response.data) {
        const items = response.data.items.map(convertApiItemToCartItem);
        dispatch({
          type: "SET_CART",
          payload: {
            items,
            totalItems: response.data.total_items,
            totalPrice: response.data.total_amount,
            cartId: response.data.cart_id,
          },
        });
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Agregar item al carrito
  const addItem = async (item: MenuItemData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartApi.addToCart(
        item.id,
        1,
        item.customFields || [],
        item.extraPrice || 0
      );

      if (response.success) {
        // Refrescar carrito después de agregar
        await refreshCart();
      } else {
        console.error("Error adding item to cart:", response.error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Eliminar item del carrito
  const removeItem = async (itemId: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Buscar el cartItemId del item
      const item = state.items.find((i) => i.id === itemId);
      if (!item || !item.cartItemId) {
        console.error("Cart item not found");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      const response = await cartApi.removeFromCart(item.cartItemId);

      if (response.success) {
        await refreshCart();
      } else {
        console.error("Error removing item from cart:", response.error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Actualizar cantidad de un item
  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Buscar el cartItemId del item
      const item = state.items.find((i) => i.id === itemId);
      if (!item || !item.cartItemId) {
        console.error("Cart item not found");
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      const response = await cartApi.updateCartItemQuantity(
        item.cartItemId,
        quantity
      );

      if (response.success) {
        await refreshCart();
      } else {
        console.error("Error updating quantity:", response.error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Limpiar carrito
  const clearCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartApi.clearCart();

      if (response.success) {
        dispatch({ type: "CLEAR_CART" });
      } else {
        console.error("Error clearing cart:", response.error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Enviar carrito como pedido (Pick & Go specific)
  const submitCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartApi.submitCart();

      if (response.success) {
        // Limpiar carrito después de enviar
        dispatch({ type: "CLEAR_CART" });
        console.log("Order submitted successfully:", response.data);
      } else {
        console.error("Error submitting cart:", response.error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } catch (error) {
      console.error("Error submitting cart:", error);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Actualizar nombre de usuario
  const setUserName = (name: string) => {
    dispatch({ type: "SET_USER_NAME", payload: name });
  };

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart,
    setUserName,
    submitCart,
  };

  // Cargar carrito al montar el componente o cuando cambie el restaurante
  useEffect(() => {
    if (restaurantId) {
      refreshCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook personalizado para usar el carrito
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}