/**
 * Tipos relacionados con pagos y métodos de pago
 */

export interface PaymentMethod {
  id: string;
  lastFourDigits: string;
  cardType: string;
  cardBrand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddPaymentMethodRequest {
  fullName: string;
  email: string;
  cardNumber: string;
  expDate: string;
  cvv: string;
}

export interface ProcessPaymentRequest {
  paymentMethodId: string;
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  tableNumber?: string;
  restaurantId?: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  description?: string;
}
