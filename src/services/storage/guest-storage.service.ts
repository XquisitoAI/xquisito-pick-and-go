/**
 * Servicio para manejo de almacenamiento local de información de invitados
 */

class GuestStorageService {
  private readonly GUEST_ID_KEY = "xquisito-guest-id";
  private readonly TABLE_NUMBER_KEY = "xquisito-table-number";
  private readonly RESTAURANT_ID_KEY = "xquisito-restaurant-id";

  /**
   * Obtener o generar ID de invitado
   */
  getGuestId(): string | null {
    if (typeof window === "undefined") return null;

    let guestId = localStorage.getItem(this.GUEST_ID_KEY);

    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.GUEST_ID_KEY, guestId);
    }

    return guestId;
  }

  /**
   * Obtener número de mesa
   */
  getTableNumber(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TABLE_NUMBER_KEY);
  }

  /**
   * Obtener ID de restaurante
   */
  getRestaurantId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.RESTAURANT_ID_KEY);
  }

  /**
   * Establecer número de mesa
   */
  setTableNumber(tableNumber: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.TABLE_NUMBER_KEY, tableNumber);
  }

  /**
   * Establecer ID de restaurante
   */
  setRestaurantId(restaurantId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.RESTAURANT_ID_KEY, restaurantId);
  }

  /**
   * Establecer información completa del invitado
   */
  setGuestInfo(
    guestId?: string,
    tableNumber?: string,
    restaurantId?: string
  ): void {
    if (typeof window === "undefined") return;

    if (guestId) {
      localStorage.setItem(this.GUEST_ID_KEY, guestId);
    }
    if (tableNumber) {
      localStorage.setItem(this.TABLE_NUMBER_KEY, tableNumber);
    }
    if (restaurantId) {
      localStorage.setItem(this.RESTAURANT_ID_KEY, restaurantId);
    }
  }

  /**
   * Limpiar sesión de invitado
   */
  clearGuestSession(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(this.GUEST_ID_KEY);
    localStorage.removeItem(this.TABLE_NUMBER_KEY);
    localStorage.removeItem(this.RESTAURANT_ID_KEY);
  }
}

export const guestStorageService = new GuestStorageService();
