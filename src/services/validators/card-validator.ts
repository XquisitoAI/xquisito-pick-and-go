/**
 * Utilidades para validación de tarjetas de crédito/débito
 */

/**
 * Validar número de tarjeta usando algoritmo de Luhn
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, "");

  // Algoritmo de Luhn básico
  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19;
};

/**
 * Detectar tipo de tarjeta
 */
export const getCardType = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");

  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) {
      return type;
    }
  }

  return "unknown";
};

/**
 * Formatear número de tarjeta (añadir espacios cada 4 dígitos)
 */
export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(" ").substr(0, 19); // Max 16 dígitos + 3 espacios
};

/**
 * Formatear fecha de expiración (MM/YY)
 */
export const formatExpiryDate = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
  }
  return cleaned;
};

/**
 * Validar CVV
 */
export const validateCVV = (cvv: string, cardType?: string): boolean => {
  const cleaned = cvv.replace(/\D/g, "");

  if (cardType === "amex") {
    return cleaned.length === 4;
  }

  return cleaned.length === 3;
};

/**
 * Validar fecha de expiración
 */
export const validateExpiryDate = (expDate: string): boolean => {
  const cleaned = expDate.replace(/\D/g, "");

  if (cleaned.length !== 4) {
    return false;
  }

  const month = parseInt(cleaned.substring(0, 2));
  const year = parseInt("20" + cleaned.substring(2, 4));

  if (month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) {
    return false;
  }

  if (year === currentYear && month < currentMonth) {
    return false;
  }

  return true;
};
