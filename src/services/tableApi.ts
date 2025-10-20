/**
 * @deprecated Este archivo se mantiene solo para compatibilidad con código legacy.
 *
 * IMPORTANTE: Para código nuevo, usar los servicios modulares desde @/services/api
 *
 * Servicios recomendados:
 * - tableService: Para operaciones de mesa
 * - orderService: Para operaciones de órdenes
 * - splitBillService: Para división de cuenta
 *
 * Ver documentación en: API_REFACTORING.md
 */

// ===============================================
// RE-EXPORTS DE TIPOS (COMPATIBILIDAD)
// ===============================================

// IMPORTANTE: Los tipos se han movido a @/types para mejor organización
// Se re-exportan aquí solo para compatibilidad con código legacy
export type {
  DishOrder,
  TableSummary,
  ActiveUser,
  SplitPayment,
  CreateDishOrderRequest,
} from "@/types/table.types";

// ===============================================
// RE-EXPORTS DE SERVICIOS (COMPATIBILIDAD)
// ===============================================

// IMPORTANTE: La funcionalidad de API se ha movido a servicios modulares
// Se re-exporta aquí solo para compatibilidad con código legacy

/**
 * @deprecated Usar servicios modulares en su lugar:
 * - tableService.getSummary()
 * - tableService.getOrders()
 * - orderService.createDishOrder()
 * - splitBillService.initialize()
 */
import { apiService } from "../utils/api";
export { apiService as tableApi };

// ===============================================
// SERVICIOS MODULARES RECOMENDADOS
// ===============================================

// Exportar los nuevos servicios para facilitar la migración
export { tableService } from "./api/table.service";
export { orderService } from "./api/order.service";
export { splitBillService } from "./api/split-bill.service";
