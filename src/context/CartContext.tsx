"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { MenuItemData } from "../interfaces/menuItemData";
import { cartService, CartItem as ApiCartItem } from "../services/cart.service";
import { useAuth } from "./AuthContext";
import { useGuest } from "./GuestContext";
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
}

const CartContext = createContext<CartContextType | null>(null);

// Provider del carrito
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user, isLoading: authLoading } = useAuth();
  const { guestId, restaurantId: guestRestaurantId, branchNumber: guestBranchNumber } = useGuest();
  const { restaurantId } = useRestaurant();

  // Establecer user_id y restaurant_id en cartService cuando cambien
  useEffect(() => {
    if (!authLoading) {
      cartService.setSupabaseUserId(user?.id || null);
    }
  }, [user, authLoading]);

  useEffect(() => {
    const effectiveRestaurantId = restaurantId || guestRestaurantId;
    if (effectiveRestaurantId) {
      cartService.setRestaurantId(effectiveRestaurantId);
    }
  }, [restaurantId, guestRestaurantId]);

  useEffect(() => {
    if (guestBranchNumber) {
      cartService.setBranchNumber(guestBranchNumber);
    }
  }, [guestBranchNumber]);

  // Migrar carrito cuando el usuario inicia sesión
  useEffect(() => {
    const migrateCartIfNeeded = async () => {
      const effectiveRestaurantId = restaurantId || guestRestaurantId;

      if (!authLoading && user?.id && effectiveRestaurantId) {
        const storedGuestId = localStorage.getItem("xquisito-guest-id");

        console.log("🔍 Migration check:", {
          authLoading,
          userId: user.id,
          restaurantId: effectiveRestaurantId,
          branchNumber: guestBranchNumber,
          storedGuestId,
          hasGuestId: !!storedGuestId,
        });

        if (storedGuestId) {
          console.log("🔄 Attempting to migrate guest cart to user...", {
            from_guest: storedGuestId,
            to_user: user.id,
            restaurant: effectiveRestaurantId,
            branch: guestBranchNumber,
          });
          try {
            const response = await cartService.migrateGuestCart(
              storedGuestId,
              user.id
            );
            console.log("📦 Migration response:", response);

            if (response.success && response.data) {
              console.log(
                `✅ Cart migrated successfully: ${response.data.items_migrated || 0} items`
              );

              // Limpiar el guest_id del localStorage después de la migración exitosa
              if (typeof window !== "undefined") {
                localStorage.removeItem("xquisito-guest-id");
                console.log(
                  "🗑️ Guest ID removed from localStorage after successful migration"
                );
              }

              // Refrescar el carrito después de la migración
              await refreshCart();
            } else {
              console.warn(
                "⚠️ Migration completed but no data returned:",
                response
              );
            }
          } catch (error) {
            console.error("❌ Error migrating cart:", error);
          }
        } else {
          console.log("ℹ️ No guest_id found, skipping migration");
        }
      }
    };

    migrateCartIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, restaurantId, guestRestaurantId, guestBranchNumber]);

  // Función para refrescar el carrito desde el backend
  const refreshCart = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await cartService.getCart();

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

      const response = await cartService.addToCart(
        item.id,
        1,
        item.customFields || [],
        item.extraPrice || 0,
        item.price // Pasar el precio base (ya con descuento aplicado si lo hay)
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

      const response = await cartService.removeFromCart(item.cartItemId);

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

      const response = await cartService.updateCartItemQuantity(
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

      const response = await cartService.clearCart();

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
  };

  // Cargar carrito al montar el componente o cuando cambie el restaurante
  useEffect(() => {
    const effectiveRestaurantId = restaurantId || guestRestaurantId;
    const hasIdentity = user?.id || guestId;

    // Solo cargar el carrito si tenemos restaurantId Y (user_id O guest_id)
    if (effectiveRestaurantId && hasIdentity && !authLoading) {
      refreshCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, guestRestaurantId, user?.id, guestId, authLoading]);

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
