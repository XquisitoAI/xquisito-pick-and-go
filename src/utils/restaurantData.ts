import { Restaurant } from "../interfaces/restaurant";

// Datos centralizados del restaurante
export const restaurantData: Restaurant = {
  id: 'newId',
  name: "Café Delicias",
  description: "Sabores auténticos que despiertan tus sentidos",
  logo: "/restaurant-logo.png",
  tableNumber: 11,
  cartItemsCount: 2
};

// Función para obtener los datos del restaurante
export function getRestaurantData(): Restaurant {
  return restaurantData;
}

// Función para actualizar el contador del carrito
export function updateCartItemsCount(count: number): Restaurant {
  return {
    ...restaurantData,
    cartItemsCount: count
  };
}