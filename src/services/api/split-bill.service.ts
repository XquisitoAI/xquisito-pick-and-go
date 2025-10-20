/**
 * Servicio para manejo de división de cuenta
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";
import { SplitPayment } from "@/types/table.types";

class SplitBillService extends BaseApiService {
  /**
   * Inicializar división de cuenta para una mesa
   */
  async initialize(
    restaurantId: string,
    tableNumber: string,
    numberOfPeople: number,
    userIds?: string[] | null,
    guestNames?: string[] | null
  ): Promise<ApiResponse<any>> {
    return this.post(
      `/restaurants/${restaurantId}/tables/${tableNumber}/split-bill`,
      {
        numberOfPeople,
        userIds,
        guestNames,
      }
    );
  }

  /**
   * Pagar cantidad dividida para una mesa
   */
  async paySplit(
    restaurantId: string,
    tableNumber: string,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.post(
      `/restaurants/${restaurantId}/tables/${tableNumber}/pay-split`,
      {
        userId,
        guestName,
        paymentMethodId,
      }
    );
  }

  /**
   * Obtener estado de pago dividido para una mesa
   */
  async getStatus(
    restaurantId: string,
    tableNumber: string
  ): Promise<ApiResponse<SplitPayment[]>> {
    return this.get(
      `/restaurants/${restaurantId}/tables/${tableNumber}/split-status`
    );
  }
}

export const splitBillService = new SplitBillService();
