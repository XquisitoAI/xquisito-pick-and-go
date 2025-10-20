/**
 * @deprecated Este archivo se mantiene solo para compatibilidad con código legacy.
 *
 * IMPORTANTE: Para código nuevo, usar los servicios modulares desde @/services
 *
 * Nuevos servicios disponibles:
 * - paymentService: Gestión de pagos
 * - tableService: Gestión de mesas
 * - orderService: Gestión de órdenes
 * - splitBillService: División de cuenta
 * - userService: Información de usuarios
 * - restaurantService: Gestión de restaurantes
 * - guestStorageService: Almacenamiento de invitados
 *
 * Ver documentación en: API_REFACTORING.md
 */

// Re-exportar tipos desde la nueva ubicación centralizada
export type { ApiResponse } from "@/types/api.types";
export type { PaymentMethod, AddPaymentMethodRequest } from "@/types/payment.types";

// Re-exportar validadores desde su nueva ubicación
export {
  validateCardNumber,
  getCardType,
  formatCardNumber,
  formatExpiryDate,
} from "@/services/validators/card-validator";

// Importar servicios modulares
import { paymentService } from "@/services/api/payment.service";
import { tableService } from "@/services/api/table.service";
import { orderService } from "@/services/api/order.service";
import { splitBillService } from "@/services/api/split-bill.service";
import { userService } from "@/services/api/user.service";
import { guestStorageService } from "@/services/storage/guest-storage.service";
import { BaseApiService } from "@/services/api/base.service";

/**
 * Clase ApiService mantenida para compatibilidad legacy.
 * Internamente redirige a los nuevos servicios modulares.
 *
 * @deprecated Usar servicios modulares desde @/services en lugar de esta clase.
 *
 * Ejemplo de migración:
 * ```
 * // Antes
 * import { apiService } from '../utils/api';
 * await apiService.getTableSummary(restaurantId, tableNumber);
 *
 * // Ahora (recomendado)
 * import { tableService } from '@/services/api';
 * await tableService.getSummary(restaurantId, tableNumber);
 * ```
 */
class ApiService extends BaseApiService {
  // ===============================================
  // PAYMENT METHODS - Redirige a paymentService
  // ===============================================

  async addPaymentMethod(...args: Parameters<typeof paymentService.addPaymentMethod>) {
    return paymentService.addPaymentMethod(...args);
  }

  async getPaymentMethods() {
    return paymentService.getPaymentMethods();
  }

  async deletePaymentMethod(paymentMethodId: string) {
    return paymentService.deletePaymentMethod(paymentMethodId);
  }

  async setDefaultPaymentMethod(paymentMethodId: string) {
    return paymentService.setDefaultPaymentMethod(paymentMethodId);
  }

  async processPayment(paymentData: any) {
    return paymentService.processPayment(paymentData);
  }

  async getPaymentHistory() {
    return paymentService.getPaymentHistory();
  }

  // ===============================================
  // GUEST STORAGE - Redirige a guestStorageService
  // ===============================================

  setGuestInfo(guestId?: string, tableNumber?: string, restaurantId?: string) {
    return guestStorageService.setGuestInfo(guestId, tableNumber, restaurantId);
  }

  setTableNumber(tableNumber: string) {
    return guestStorageService.setTableNumber(tableNumber);
  }

  setRestaurantId(restaurantId: string) {
    return guestStorageService.setRestaurantId(restaurantId);
  }

  getCurrentRestaurantId() {
    return guestStorageService.getRestaurantId();
  }

  clearGuestSession() {
    return guestStorageService.clearGuestSession();
  }

  // ===============================================
  // TABLE API - Redirige a tableService
  // ===============================================

  async getTableSummary(restaurantId: string, tableNumber: string) {
    return tableService.getSummary(restaurantId, tableNumber);
  }

  async getTableOrders(restaurantId: string, tableNumber: string) {
    return tableService.getOrders(restaurantId, tableNumber);
  }

  async getActiveUsers(restaurantId: string, tableNumber: string) {
    return tableService.getActiveUsers(restaurantId, tableNumber);
  }

  async getAllTables(restaurantId: string) {
    return tableService.getAll(restaurantId);
  }

  async checkTableAvailability(restaurantId: string, tableNumber: string) {
    return tableService.checkAvailability(restaurantId, tableNumber);
  }

  // ===============================================
  // ORDER API - Redirige a orderService
  // ===============================================

  async createDishOrder(
    restaurantId: string,
    tableNumber: string,
    userId: string | null,
    guestName: string,
    item: string,
    quantity: number,
    price: number,
    guestId?: string | null,
    images: string[] = [],
    customFields?: any,
    extraPrice?: number
  ) {
    return orderService.createDishOrder(restaurantId, tableNumber, {
      userId,
      guestName,
      item,
      quantity,
      price,
      guestId,
      images,
      customFields,
      extraPrice,
    });
  }

  async updateDishStatus(dishId: string, status: string) {
    return orderService.updateDishStatus(dishId, status as any);
  }

  async linkGuestOrdersToUser(
    guestId: string,
    userId: string,
    tableNumber?: string,
    restaurantId?: string
  ) {
    return orderService.linkGuestOrdersToUser(guestId, userId, tableNumber, restaurantId);
  }

  // ===============================================
  // PAYMENT API - Redirige a paymentService
  // ===============================================

  async payDishOrder(dishId: string, paymentMethodId?: string | null) {
    return paymentService.payDishOrder(dishId, paymentMethodId);
  }

  async payTableAmount(
    restaurantId: string,
    tableNumber: string,
    amount: number,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ) {
    return paymentService.payTableAmount(
      restaurantId,
      tableNumber,
      amount,
      userId,
      guestName,
      paymentMethodId
    );
  }

  // ===============================================
  // SPLIT BILL API - Redirige a splitBillService
  // ===============================================

  async initializeSplitBill(
    restaurantId: string,
    tableNumber: string,
    numberOfPeople: number,
    userIds?: string[] | null,
    guestNames?: string[] | null
  ) {
    return splitBillService.initialize(
      restaurantId,
      tableNumber,
      numberOfPeople,
      userIds,
      guestNames
    );
  }

  async paySplitAmount(
    restaurantId: string,
    tableNumber: string,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ) {
    return splitBillService.paySplit(
      restaurantId,
      tableNumber,
      userId,
      guestName,
      paymentMethodId
    );
  }

  async getSplitPaymentStatus(restaurantId: string, tableNumber: string) {
    return splitBillService.getStatus(restaurantId, tableNumber);
  }

  // ===============================================
  // USER API - Redirige a userService
  // ===============================================

  async getUsersInfo(userIds: string[]) {
    return userService.getUsersInfo(userIds);
  }
}

// Exportar instancia única para compatibilidad con código legacy
export const apiService = new ApiService();

// Exportar como default para compatibilidad
export default apiService;
