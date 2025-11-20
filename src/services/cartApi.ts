// ===============================================
// CART API SERVICE
// ===============================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CartItem {
  id: string; // cart_item_id
  menu_item_id: number;
  name: string;
  description: string;
  images: string[];
  features: string[];
  quantity: number;
  price: number;
  discount: number;
  extraPrice: number;
  customFields: Array<{
    fieldId: string;
    fieldName: string;
    selectedOptions: Array<{
      optionId: string;
      optionName: string;
      price: number;
    }>;
  }>;
  subtotal: number;
}

export interface Cart {
  cart_id: string | null;
  items: CartItem[];
  total_items: number;
  total_amount: number;
}

export interface CartTotals {
  cart_id: string | null;
  total_items: number;
  total_amount: number;
}

class CartApiService {
  private clerkUserId: string | null = null;
  private restaurantId: number | null = null;

  /**
   * Establecer el clerk_user_id manualmente (llamar desde el componente con useUser)
   */
  public setClerkUserId(userId: string | null) {
    this.clerkUserId = userId;
  }

  /**
   * Establecer el restaurant_id manualmente (llamar desde el componente)
   */
  public setRestaurantId(restaurantId: number | null) {
    this.restaurantId = restaurantId;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("Cart API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Obtener guest_id desde GuestContext/localStorage
   * Usa el mismo formato que GuestContext: 'xquisito-guest-id'
   */
  private getGuestId(): string {
    if (typeof window === "undefined") return "";

    // Usar el mismo key que GuestContext
    let guestId = localStorage.getItem("xquisito-guest-id");
    if (!guestId) {
      // Generar guest ID en el mismo formato que GuestContext
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("xquisito-guest-id", guestId);
    }
    return guestId;
  }

  /**
   * Obtener identificador de usuario (clerk_user_id o guest_id)
   * Prioriza clerk_user_id si existe
   */
  private getUserIdentifier(): { clerk_user_id?: string; guest_id?: string } {
    // Primero intentar usar el clerkUserId establecido manualmente
    if (this.clerkUserId) {
      return { clerk_user_id: this.clerkUserId };
    }

    // Si no hay usuario de Clerk, usar guest_id
    return { guest_id: this.getGuestId() };
  }

  /**
   * Agregar item al carrito
   */
  async addToCart(
    menuItemId: number,
    quantity: number = 1,
    customFields: CartItem["customFields"] = [],
    extraPrice: number = 0
  ): Promise<ApiResponse<{ cart_item_id: string }>> {
    const userId = this.getUserIdentifier();

    return this.request<{ cart_item_id: string }>("/cart", {
      method: "POST",
      body: JSON.stringify({
        ...userId,
        menu_item_id: menuItemId,
        quantity,
        custom_fields: customFields,
        extra_price: extraPrice,
        restaurant_id: this.restaurantId,
      }),
    });
  }

  /**
   * Obtener carrito completo
   */
  async getCart(): Promise<ApiResponse<Cart>> {
    const userId = this.getUserIdentifier();
    const params = new URLSearchParams(userId as Record<string, string>);

    if (this.restaurantId) {
      params.append("restaurant_id", this.restaurantId.toString());
    }

    return this.request<Cart>(`/cart?${params.toString()}`);
  }

  /**
   * Obtener solo totales del carrito (más rápido)
   */
  async getCartTotals(): Promise<ApiResponse<CartTotals>> {
    const userId = this.getUserIdentifier();
    const params = new URLSearchParams(userId as Record<string, string>);

    if (this.restaurantId) {
      params.append("restaurant_id", this.restaurantId.toString());
    }

    return this.request<CartTotals>(`/cart/totals?${params.toString()}`);
  }

  /**
   * Actualizar cantidad de un item
   */
  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/cart/items/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }

  /**
   * Eliminar item del carrito
   */
  async removeFromCart(
    cartItemId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/cart/items/${cartItemId}`, {
      method: "DELETE",
    });
  }

  /**
   * Limpiar todo el carrito
   */
  async clearCart(): Promise<ApiResponse<{ message: string }>> {
    const userId = this.getUserIdentifier();

    return this.request<{ message: string }>("/cart", {
      method: "DELETE",
      body: JSON.stringify({
        ...userId,
        restaurant_id: this.restaurantId,
      }),
    });
  }

  /**
   * Obtener el guest_id actual
   */
  getGuestIdForUser(): string {
    return this.getGuestId();
  }
}

export const cartApi = new CartApiService();
