import { requestWithAuth, type ApiResponse } from "./request-helper";
import {
  PaymentMethod,
  AddPaymentMethodRequest,
  ProcessPaymentRequest,
  PaymentHistory,
} from "@/types/payment.types";

class PaymentService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return await requestWithAuth<T>(endpoint, options);
  }

  /**
   * Añadir método de pago
   */
  async addPaymentMethod(
    paymentData: AddPaymentMethodRequest
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return this.request("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * Obtener métodos de pago del usuario
   */
  async getPaymentMethods(): Promise<
    ApiResponse<{ paymentMethods: PaymentMethod[] }>
  > {
    return this.request("/payment-methods", {
      method: "GET",
    });
  }

  /**
   * Eliminar método de pago
   */
  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
  }

  /**
   * Establecer método de pago como predeterminado
   */
  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/payment-methods/${paymentMethodId}/default`, {
      method: "PUT",
    });
  }

  /**
   * Procesar pago
   */
  async processPayment(
    paymentData: ProcessPaymentRequest
  ): Promise<ApiResponse<any>> {
    return this.request("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * Obtener historial de pagos
   */
  async getPaymentHistory(): Promise<ApiResponse<PaymentHistory[]>> {
    return this.request("/payments/history", {
      method: "GET",
    });
  }

  /**
   * Pagar por una orden de platillo específica (para Pick & Go)
   */
  async payDishOrder(
    dishId: string,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.request(`/dishes/${dishId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  /**
   * Pagar una orden Pick & Go
   */
  async payPickAndGoOrder(
    orderId: string,
    paymentMethodId?: string | null,
    amount?: number
  ): Promise<ApiResponse<any>> {
    return this.request(`/pick-and-go/orders/${orderId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethodId, amount }),
    });
  }

  /**
   * Migrar métodos de pago de guest a usuario autenticado
   */
  async migrateGuestPaymentMethods(
    guestId: string
  ): Promise<ApiResponse<{ migratedCount: number }>> {
    return this.request("/payment-methods/migrate-from-guest", {
      method: "POST",
      body: JSON.stringify({ guestId }),
    });
  }
}

export const paymentService = new PaymentService();
