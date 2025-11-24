import { BaseApiService } from "./base.service";

/**
 * Tipos de datos para Pick & Go
 */
export interface PickAndGoOrder {
  id: string;
  clerk_user_id?: string | null; // Optional for guest users
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount: number;
  payment_status: "pending" | "paid";
  order_status:
    | "active"
    | "confirmed"
    | "preparing"
    | "completed"
    | "abandoned";
  session_data: Record<string, any>;
  prep_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  items?: PickAndGoItem[];
  payments?: any[];
}

export interface PickAndGoItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  status: "pending" | "cooking" | "delivered";
  payment_status: "not_paid" | "paid";
  images: string[];
  custom_fields: Record<string, any>;
  extra_price: number;
  pick_and_go_order_id: string;
}

export interface CreateOrderRequest {
  clerk_user_id?: string | null; // Optional for guest users
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount?: number;
  session_data?: Record<string, any>;
  prep_metadata?: Record<string, any>;
}

export interface AddItemRequest {
  item: string;
  quantity: number;
  price: number;
  images?: string[];
  custom_fields?: Record<string, any>;
  extra_price?: number;
}

export interface EstimatePrepTimeRequest {
  items: Array<{
    item: string;
    quantity: number;
  }>;
  restaurant_id?: number;
}

/**
 * Servicio para gestionar pedidos Pick & Go
 * Conecta con los endpoints específicos del backend Pick & Go
 */
export class PickAndGoApiService extends BaseApiService {
  private readonly baseUrl = "/api/pick-and-go";

  /**
   * Método para manejar errores de manera consistente
   */
  private handleError(error: any) {
    return {
      success: false,
      error: {
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
        details: error,
      },
    };
  }

  /**
   * Crear nueva orden Pick & Go
   * @param orderData - Datos de la orden
   * @returns Promise con la orden creada
   */
  async createOrder(orderData: CreateOrderRequest) {
    try {
      console.log("🆕 Creating Pick & Go order:", orderData);

      const response = await this.post<{
        success: boolean;
        data: PickAndGoOrder;
      }>(`${this.baseUrl}/orders`, orderData);

      if (response.data?.success) {
        console.log("✅ Order created successfully:", response.data.data.id);
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("💥 Error creating Pick & Go order:", error);
      return this.handleError(error);
    }
  }

  /**
   * Obtener orden por ID con items y pagos
   * @param orderId - ID de la orden
   * @returns Promise con los datos completos de la orden
   */
  async getOrder(orderId: string) {
    try {
      console.log("🔍 Getting Pick & Go order:", orderId);

      const response = await this.get<{
        success: boolean;
        data: PickAndGoOrder;
      }>(`${this.baseUrl}/orders/${orderId}`);

      if (response.data?.success) {
        console.log(
          "✅ Order retrieved successfully with",
          response.data.data.items?.length || 0,
          "items"
        );
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to get order");
      }
    } catch (error) {
      console.error("💥 Error getting Pick & Go order:", error);
      return this.handleError(error);
    }
  }

  /**
   * Obtener órdenes del usuario
   * @param userId - ID del usuario
   * @param filters - Filtros opcionales
   * @returns Promise con la lista de órdenes
   */
  async getUserOrders(
    userId: string,
    filters?: {
      order_status?: string;
      payment_status?: string;
      limit?: number;
    }
  ) {
    try {
      console.log("👤 Getting user orders for:", userId);

      const queryParams = new URLSearchParams();
      if (filters?.order_status)
        queryParams.append("order_status", filters.order_status);
      if (filters?.payment_status)
        queryParams.append("payment_status", filters.payment_status);
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());

      const url = `${this.baseUrl}/user/${userId}/orders${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

      const response = await this.get<{
        success: boolean;
        data: PickAndGoOrder[];
      }>(url);

      if (response.data?.success) {
        console.log(
          "✅ Retrieved",
          response.data.data.length,
          "orders for user"
        );
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to get user orders");
      }
    } catch (error) {
      console.error("💥 Error getting user orders:", error);
      return this.handleError(error);
    }
  }

  /**
   * Agregar item a la orden
   * @param orderId - ID de la orden
   * @param itemData - Datos del item
   * @returns Promise con el item creado
   */
  async addItemToOrder(orderId: string, itemData: AddItemRequest) {
    try {
      console.log("🍽️ Adding item to order:", orderId, itemData);

      const response = await this.post<{
        success: boolean;
        data: PickAndGoItem;
      }>(`${this.baseUrl}/orders/${orderId}/items`, itemData);

      if (response.data?.success) {
        console.log("✅ Item added successfully");
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to add item to order");
      }
    } catch (error) {
      console.error("💥 Error adding item to order:", error);
      return this.handleError(error);
    }
  }

  /**
   * Actualizar estado de la orden
   * @param orderId - ID de la orden
   * @param orderStatus - Nuevo estado
   * @param prepMetadata - Metadatos adicionales
   * @returns Promise con la orden actualizada
   */
  async updateOrderStatus(
    orderId: string,
    orderStatus: string,
    prepMetadata?: Record<string, any>
  ) {
    try {
      console.log("🔄 Updating order status:", orderId, "to", orderStatus);

      const response = await this.put<{
        success: boolean;
        data: PickAndGoOrder;
      }>(`${this.baseUrl}/orders/${orderId}/status`, {
        order_status: orderStatus,
        prepMetadata,
      });

      if (response.data?.success) {
        console.log("✅ Order status updated successfully");
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("💥 Error updating order status:", error);
      return this.handleError(error);
    }
  }

  /**
   * Actualizar estado de pago
   * @param orderId - ID de la orden
   * @param paymentStatus - Nuevo estado de pago
   * @returns Promise con la orden actualizada
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: "pending" | "paid"
  ) {
    try {
      console.log("💳 Updating payment status:", orderId, "to", paymentStatus);

      const response = await this.put<{
        success: boolean;
        data: PickAndGoOrder;
      }>(`${this.baseUrl}/orders/${orderId}/payment-status`, {
        payment_status: paymentStatus,
      });

      if (response.data?.success) {
        console.log("✅ Payment status updated successfully");
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to update payment status");
      }
    } catch (error) {
      console.error("💥 Error updating payment status:", error);
      return this.handleError(error);
    }
  }

  /**
   * Calcular tiempo estimado de preparación
   * @param items - Items de la orden
   * @param restaurantId - ID del restaurante (opcional)
   * @returns Promise con el tiempo estimado
   */
  async estimatePrepTime(
    items: Array<{ item: string; quantity: number }>,
    restaurantId?: number
  ) {
    try {
      console.log("⏰ Estimating prep time for", items.length, "items");

      const response = await this.post<{
        success: boolean;
        data: { estimated_minutes: number };
      }>(`${this.baseUrl}/estimate-prep-time`, {
        items,
        restaurant_id: restaurantId,
      });

      if (response.data?.success) {
        console.log(
          "✅ Estimated prep time:",
          response.data.data.estimated_minutes,
          "minutes"
        );
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to estimate prep time");
      }
    } catch (error) {
      console.error("💥 Error estimating prep time:", error);
      return this.handleError(error);
    }
  }

  /**
   * Obtener órdenes del restaurante (para dashboard administrativo)
   * @param restaurantId - ID del restaurante
   * @param filters - Filtros opcionales
   * @returns Promise con las órdenes del restaurante
   */
  async getRestaurantOrders(
    restaurantId: number,
    filters?: {
      order_status?: string;
      date_from?: string;
      date_to?: string;
    }
  ) {
    try {
      console.log("🏪 Getting restaurant orders for:", restaurantId);

      const queryParams = new URLSearchParams();
      if (filters?.order_status)
        queryParams.append("order_status", filters.order_status);
      if (filters?.date_from)
        queryParams.append("date_from", filters.date_from);
      if (filters?.date_to) queryParams.append("date_to", filters.date_to);

      const url = `${this.baseUrl}/restaurant/${restaurantId}/orders${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

      const response = await this.get<{
        success: boolean;
        data: PickAndGoOrder[];
      }>(url);

      if (response.data?.success) {
        console.log(
          "✅ Retrieved",
          response.data.data.length,
          "restaurant orders"
        );
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Failed to get restaurant orders");
      }
    } catch (error) {
      console.error("💥 Error getting restaurant orders:", error);
      return this.handleError(error);
    }
  }
}

// Crear instancia del servicio
export const pickAndGoApiService = new PickAndGoApiService();
