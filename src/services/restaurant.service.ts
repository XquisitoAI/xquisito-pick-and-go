import { Restaurant } from "../interfaces/restaurant";
import { MenuSection } from "../interfaces/category";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

interface RestaurantWithMenu {
  restaurant: Restaurant;
  menu: MenuSection[];
}

/**
 * Servicio para interactuar con la API de restaurantes
 */
class RestaurantService {
  /**
   * Obtener información de un restaurante por ID
   */
  async getRestaurantById(restaurantId: number): Promise<Restaurant> {
    try {
      const response = await fetch(`${API_URL}/restaurants/${restaurantId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Restaurant not found");
        }
        throw new Error("Failed to fetch restaurant");
      }

      const result: ApiResponse<Restaurant> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch restaurant");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      throw error;
    }
  }

  /**
   * Obtener menú completo de un restaurante
   */
  async getRestaurantMenu(restaurantId: number): Promise<MenuSection[]> {
    try {
      const response = await fetch(
        `${API_URL}/restaurants/${restaurantId}/menu`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Restaurant not found");
        }
        throw new Error("Failed to fetch restaurant menu");
      }

      const result: ApiResponse<MenuSection[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch restaurant menu");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching restaurant menu:", error);
      throw error;
    }
  }

  /**
   * Obtener restaurante con su menú completo en una sola petición
   */
  async getRestaurantWithMenu(
    restaurantId: number
  ): Promise<RestaurantWithMenu> {
    try {
      const response = await fetch(
        `${API_URL}/restaurants/${restaurantId}/complete`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Restaurant not found");
        }
        throw new Error("Failed to fetch restaurant data");
      }

      const result: ApiResponse<RestaurantWithMenu> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch restaurant data");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching restaurant with menu:", error);
      throw error;
    }
  }

  /**
   * Obtener todos los restaurantes activos
   */
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      const response = await fetch(`${API_URL}/restaurants`);

      if (!response.ok) {
        throw new Error("Failed to fetch restaurants");
      }

      const result: ApiResponse<Restaurant[]> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch restaurants");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
export const restaurantService = new RestaurantService();
