"use client";

import { useRouter, useParams } from "next/navigation";
import { useCallback } from "react";
import { useRestaurant } from "../context/RestaurantContext";

/**
 * Hook de navegación para Pick & Go
 * Simplifica la navegación eliminando la complejidad de table parameters
 * y enfocándose solo en restaurantId
 */
export function useNavigation() {
  const router = useRouter();
  const params = useParams();
  const { restaurantId } = useRestaurant();

  // Obtener restaurantId de params o del contexto
  const currentRestaurantId = params?.restaurantId || restaurantId;

  /**
   * Navegar manteniendo el contexto del restaurante
   * @param path - Ruta a navegar (ej: "/menu", "/cart", "/dish/123")
   * @param replace - Si usar replace en lugar de push (default: false)
   */
  const navigateWithRestaurantId = useCallback(
    (path: string, replace: boolean = false) => {
      if (!currentRestaurantId) {
        console.warn(
          "No restaurant ID found, navigating without restaurant context"
        );
        if (replace) {
          router.replace(path);
        } else {
          router.push(path);
        }
        return;
      }

      // Construir la URL completa con restaurantId
      let fullPath = path;
      if (!path.startsWith(`/${currentRestaurantId}/`)) {
        // Remover el primer slash si existe para evitar dobles slashes
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        fullPath = `/${currentRestaurantId}/${cleanPath}`;
      }

      if (replace) {
        router.replace(fullPath);
      } else {
        router.push(fullPath);
      }
    },
    [router, currentRestaurantId]
  );

  /**
   * Navegar a la página de detalle de un producto
   * @param dishId - ID del producto
   * @param replace - Si usar replace en lugar de push (default: false)
   */
  const navigateToDish = useCallback(
    (dishId: string | number, replace: boolean = false) => {
      navigateWithRestaurantId(`/dish/${dishId}`, replace);
    },
    [navigateWithRestaurantId]
  );

  /**
   * Navegar hacia atrás con contexto
   * Si no hay restaurantId, usa router.back()
   * Si hay restaurantId, navega al menú principal
   */
  const goBack = useCallback(() => {
    if (!currentRestaurantId) {
      router.back();
      return;
    }

    // Navegar al menú principal del restaurante
    navigateWithRestaurantId("/menu");
  }, [router, currentRestaurantId, navigateWithRestaurantId]);

  /**
   * Construir URL completa con restaurantId sin navegar
   * @param path - Ruta relativa
   * @returns URL completa con restaurantId
   */
  const getUrlWithRestaurantId = useCallback(
    (path: string) => {
      if (!currentRestaurantId) {
        return path;
      }

      // Construir la URL con restaurantId
      let fullPath = path;
      if (!path.startsWith(`/${currentRestaurantId}/`)) {
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        fullPath = `/${currentRestaurantId}/${cleanPath}`;
      }

      return fullPath;
    },
    [currentRestaurantId]
  );

  /**
   * Navegar al carrito del restaurante
   */
  const navigateToCart = useCallback(() => {
    navigateWithRestaurantId("/cart");
  }, [navigateWithRestaurantId]);

  /**
   * Navegar al menú del restaurante
   */
  const navigateToMenu = useCallback(() => {
    navigateWithRestaurantId("/menu");
  }, [navigateWithRestaurantId]);

  /**
   * Navegar a la página de confirmación de pedido
   */
  const navigateToOrderConfirmation = useCallback(() => {
    navigateWithRestaurantId("/order-confirmation");
  }, [navigateWithRestaurantId]);

  return {
    // Estado
    restaurantId: currentRestaurantId,
    hasRestaurant: !!currentRestaurantId,

    // Navegación general
    navigateWithRestaurantId,
    goBack,
    getUrlWithRestaurantId,

    // Navegación específica para Pick & Go
    navigateToDish,
    navigateToCart,
    navigateToMenu,
    navigateToOrderConfirmation,
  };
}

// Re-export para compatibilidad (opcional, si queremos mantener el nombre)
export { useNavigation as usePickAndGoNavigation };