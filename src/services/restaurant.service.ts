import { Restaurant } from "../interfaces/restaurant";
import { MenuSection } from "../interfaces/category";
import { requestWithAuth, type ApiResponse } from "./request-helper";

interface RestaurantWithMenu {
  restaurant: Restaurant;
  menu: MenuSection[];
}

/**
 * Servicio para interactuar con la API de restaurantes
 */
class RestaurantService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return requestWithAuth<T>(endpoint, options);
  }
  /**
   * Obtener información de un restaurante por ID
   */
  async getRestaurantById(restaurantId: number): Promise<Restaurant> {
    const result = await this.request<Restaurant>(
      `/restaurants/${restaurantId}`
    );

    if (!result.success || !result.data) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : result.error?.message || "Failed to fetch restaurant"
      );
    }

    return result.data;
  }

  /**
   * Obtener menú completo de un restaurante
   */
  async getRestaurantMenu(restaurantId: number): Promise<MenuSection[]> {
    const result = await this.request<MenuSection[]>(
      `/restaurants/${restaurantId}/menu`
    );

    if (!result.success || !result.data) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : result.error?.message || "Failed to fetch restaurant menu"
      );
    }

    return result.data;
  }

  /**
   * Obtener restaurante con su menú completo en una sola petición
   */
  async getRestaurantWithMenu(
    restaurantId: number
  ): Promise<RestaurantWithMenu> {
    const result = await this.request<RestaurantWithMenu>(
      `/restaurants/${restaurantId}/complete`
    );

    if (!result.success || !result.data) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : result.error?.message || "Failed to fetch restaurant data"
      );
    }

    return result.data;
  }

  /**
   * Obtener todos los restaurantes activos
   */
  async getAllRestaurants(): Promise<Restaurant[]> {
    const result = await this.request<Restaurant[]>("/restaurants");

    if (!result.success || !result.data) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : result.error?.message || "Failed to fetch restaurants"
      );
    }

    return result.data;
  }
}

// Exportar instancia única del servicio
export const restaurantService = new RestaurantService();
