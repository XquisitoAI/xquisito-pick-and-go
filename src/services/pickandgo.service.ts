import { requestWithAuth, type ApiResponse } from "./request-helper";

export interface PickAndGoOrder {
  id: string;
  clerk_user_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount: number;
  restaurant_id: number;
  branch_number: number;
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
  clerk_user_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  restaurant_id: number;
  branch_number: number;
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

export interface DishOrder {
  id: string;
  restaurant_id: number;
  table_number: string;
  item: string;
  quantity: number;
  price: number;
  status: "pending" | "cooking" | "delivered";
  payment_status: "not_paid" | "paid";
  user_id?: string | null;
  guest_id?: string | null;
  guest_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  images?: string[];
  custom_fields?: Record<string, any>;
  extra_price?: number;
  pick_and_go_order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDishOrderRequest {
  item: string;
  quantity: number;
  price: number;
  userId?: string | null;
  guestId?: string | null;
  guestName?: string;
  images?: string[];
  customFields?: Record<string, any>;
  extraPrice?: number;
  pickAndGoOrderId?: string;
}

export interface RecordPaymentTransactionRequest {
  payment_method_id?: string | null;
  restaurant_id: number;
  id_table_order?: string | null;
  id_tap_orders_and_pay?: string | null;
  pick_and_go_order_id?: string | null;
  base_amount: number;
  tip_amount: number;
  iva_tip: number;
  xquisito_commission_total: number;
  xquisito_commission_client: number;
  xquisito_commission_restaurant: number;
  iva_xquisito_client: number;
  iva_xquisito_restaurant: number;
  xquisito_client_charge: number;
  xquisito_restaurant_charge: number;
  xquisito_rate_applied: number;
  total_amount_charged: number;
}

class PickAndGoService {
  private supabaseUserId: string | null = null;
  private restaurantId: number | null = null;
  private branchNumber: number | null = null;

  // Establecer el supabase_user_id manualmente
  public setSupabaseUserId(userId: string | null) {
    this.supabaseUserId = userId;
  }

  // Establecer el restaurant_id manualmente
  public setRestaurantId(restaurantId: number | null) {
    this.restaurantId = restaurantId;
  }

  // Establecer el branch_number manualmente
  public setBranchNumber(branchNumber: number | null) {
    this.branchNumber = branchNumber;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return requestWithAuth<T>(endpoint, options);
  }

  // Crear nueva orden Pick & Go
  async createOrder(
    orderData: CreateOrderRequest
  ): Promise<ApiResponse<PickAndGoOrder>> {
    console.log("🆕 Creating Pick & Go order:", orderData);

    // Si clerk_user_id ya viene en orderData, usarlo; si no, usar el interno
    const finalUserId = orderData.clerk_user_id !== undefined
      ? orderData.clerk_user_id
      : (this.supabaseUserId || null);

    const body = {
      clerk_user_id: finalUserId,
      user_id: finalUserId, // También enviar como user_id para compatibilidad con el backend
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email,
      restaurant_id: orderData.restaurant_id || this.restaurantId,
      branch_number: orderData.branch_number || this.branchNumber,
      total_amount: orderData.total_amount || 0,
      session_data: orderData.session_data || {},
      prep_metadata: orderData.prep_metadata || {},
    };

    return this.request<PickAndGoOrder>("/pick-and-go/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Obtener orden por ID con items y pagos
  async getOrder(orderId: string): Promise<ApiResponse<PickAndGoOrder>> {
    console.log("🔍 Getting Pick & Go order:", orderId);
    return this.request<PickAndGoOrder>(`/pick-and-go/orders/${orderId}`);
  }

  // Obtener órdenes del usuario
  async getUserOrders(
    userId: string,
    filters?: {
      order_status?: string;
      payment_status?: string;
      limit?: number;
    }
  ): Promise<ApiResponse<PickAndGoOrder[]>> {
    console.log("👤 Getting user orders for:", userId);

    const queryParams = new URLSearchParams();
    if (filters?.order_status)
      queryParams.append("order_status", filters.order_status);
    if (filters?.payment_status)
      queryParams.append("payment_status", filters.payment_status);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());

    const url = `/pick-and-go/user/${userId}/orders${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

    return this.request<PickAndGoOrder[]>(url);
  }

  // Agregar item a la orden
  async addItemToOrder(
    orderId: string,
    itemData: AddItemRequest
  ): Promise<ApiResponse<PickAndGoItem>> {
    console.log("🍽️ Adding item to order:", orderId, itemData);

    return this.request<PickAndGoItem>(
      `/pick-and-go/orders/${orderId}/items`,
      {
        method: "POST",
        body: JSON.stringify(itemData),
      }
    );
  }

  // Actualizar estado de la orden
  async updateOrderStatus(
    orderId: string,
    orderStatus: string,
    prepMetadata?: Record<string, any>
  ): Promise<ApiResponse<PickAndGoOrder>> {
    console.log("🔄 Updating order status:", orderId, "to", orderStatus);

    return this.request<PickAndGoOrder>(
      `/pick-and-go/orders/${orderId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({
          order_status: orderStatus,
          prep_metadata: prepMetadata,
        }),
      }
    );
  }

  // Actualizar estado de pago
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: "pending" | "paid"
  ): Promise<ApiResponse<PickAndGoOrder>> {
    console.log("💳 Updating payment status:", orderId, "to", paymentStatus);

    return this.request<PickAndGoOrder>(
      `/pick-and-go/orders/${orderId}/payment-status`,
      {
        method: "PUT",
        body: JSON.stringify({
          payment_status: paymentStatus,
        }),
      }
    );
  }

  // Calcular tiempo estimado de preparación
  async estimatePrepTime(
    items: Array<{ item: string; quantity: number }>,
    restaurantId?: number
  ): Promise<ApiResponse<{ estimated_minutes: number }>> {
    console.log("⏰ Estimating prep time for", items.length, "items");

    return this.request<{ estimated_minutes: number }>(
      "/pick-and-go/estimate-prep-time",
      {
        method: "POST",
        body: JSON.stringify({
          items,
          restaurant_id: restaurantId || this.restaurantId,
        }),
      }
    );
  }

  // Obtener órdenes del restaurante (para dashboard administrativo)
  async getRestaurantOrders(
    restaurantId: number,
    filters?: {
      order_status?: string;
      branch_number?: number;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ApiResponse<PickAndGoOrder[]>> {
    console.log("🏪 Getting restaurant orders for:", restaurantId);

    const queryParams = new URLSearchParams();
    if (filters?.order_status)
      queryParams.append("order_status", filters.order_status);
    if (filters?.branch_number)
      queryParams.append("branch_number", filters.branch_number.toString());
    if (filters?.date_from) queryParams.append("date_from", filters.date_from);
    if (filters?.date_to) queryParams.append("date_to", filters.date_to);

    const url = `/pick-and-go/restaurant/${restaurantId}/orders${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

    return this.request<PickAndGoOrder[]>(url);
  }

  // Obtener órdenes de una sucursal específica
  async getBranchOrders(
    restaurantId: number,
    branchNumber: number,
    filters?: {
      order_status?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<ApiResponse<PickAndGoOrder[]>> {
    console.log(
      `🏢 Getting branch orders for restaurant ${restaurantId}, branch ${branchNumber}`
    );

    const queryParams = new URLSearchParams();
    if (filters?.order_status)
      queryParams.append("order_status", filters.order_status);
    if (filters?.date_from) queryParams.append("date_from", filters.date_from);
    if (filters?.date_to) queryParams.append("date_to", filters.date_to);

    const url = `/pick-and-go/restaurant/${restaurantId}/branch/${branchNumber}/orders${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

    return this.request<PickAndGoOrder[]>(url);
  }

  // Crear una orden de platillo (dish order) vinculada a Pick & Go
  async createDishOrder(
    pickAndGoOrderId: string,
    orderData: CreateDishOrderRequest
  ): Promise<ApiResponse<DishOrder>> {
    console.log("🍽️ Creating Pick & Go dish order:", {
      pickAndGoOrderId,
      orderData,
    });

    // Usar el nuevo endpoint que NO requiere mesas
    return this.request<DishOrder>(
      `/pick-and-go/orders/${pickAndGoOrderId}/dishes`,
      {
        method: "POST",
        body: JSON.stringify(orderData),
      }
    );
  }

  // Registrar una transacción de pago
  async recordPaymentTransaction(
    transactionData: RecordPaymentTransactionRequest
  ): Promise<ApiResponse<any>> {
    console.log("💰 Recording payment transaction:", transactionData);

    return this.request<any>("/payment-transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  }

  // Actualizar estado de un platillo
  async updateDishStatus(
    dishId: string,
    status: DishOrder["status"]
  ): Promise<ApiResponse<DishOrder>> {
    console.log("🔄 Updating dish status:", dishId, "to", status);

    return this.request<DishOrder>(`/dishes/${dishId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // Actualizar estado de pago de un platillo
  async updateDishPaymentStatus(
    dishId: string,
    paymentStatus: DishOrder["payment_status"]
  ): Promise<ApiResponse<DishOrder>> {
    console.log(
      "💳 Updating dish payment status:",
      dishId,
      "to",
      paymentStatus
    );

    return this.request<DishOrder>(`/dishes/${dishId}/payment-status`, {
      method: "PUT",
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
  }
}

export const pickAndGoService = new PickAndGoService();
