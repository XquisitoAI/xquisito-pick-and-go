/**
 * Servicio para manejo de órdenes de platillos
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";
import { CreateDishOrderRequest, DishOrder } from "@/types/table.types";

class OrderService extends BaseApiService {
  /**
   * Crear una nueva orden de platillo para una mesa
   */
  async createDishOrder(
    restaurantId: string,
    tableNumber: string,
    orderData: CreateDishOrderRequest
  ): Promise<ApiResponse<DishOrder>> {
    return this.post(
      `/restaurants/${restaurantId}/tables/${tableNumber}/dishes`,
      orderData
    );
  }

  /**
   * Actualizar estado de un platillo (para cocina)
   */
  async updateDishStatus(
    dishId: string,
    status: DishOrder["status"]
  ): Promise<ApiResponse<any>> {
    return this.put(`/dishes/${dishId}/status`, { status });
  }

  /**
   * Vincular órdenes de invitado a usuario autenticado
   */
  async linkGuestOrdersToUser(
    guestId: string,
    userId: string,
    tableNumber?: string,
    restaurantId?: string
  ): Promise<ApiResponse<any>> {
    return this.put(`/orders/link-user`, {
      guestId,
      userId,
      tableNumber,
      restaurantId,
    });
  }
}

export const orderService = new OrderService();
