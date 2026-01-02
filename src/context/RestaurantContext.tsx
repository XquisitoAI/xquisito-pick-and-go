"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { Restaurant } from "../interfaces/restaurant";
import { MenuSection } from "../interfaces/category";
import { restaurantService } from "../services/restaurant.service";
import { isRestaurantOpen } from "../utils/restaurantHours";
import { useBranch } from "./BranchContext";

interface RestaurantContextValue {
  restaurantId: number | null;
  restaurant: Restaurant | null;
  menu: MenuSection[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  setRestaurantId: (id: number) => void;
  refetchMenu: () => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue | undefined>(
  undefined
);

interface RestaurantProviderProps {
  children: ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [restaurantId, setRestaurantIdState] = useState<number | null>(null);
  const { selectedBranchNumber } = useBranch();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Función para establecer el restaurantId y cargar los datos
  const setRestaurantId = (id: number) => {
    console.log("🍽️ Setting restaurant ID:", id);
    setRestaurantIdState(id);
  };

  // Función para recargar el menú
  const refetchMenu = async () => {
    if (!restaurantId) return;

    console.log("🔄 Refetching menu for restaurant:", restaurantId);
    await fetchRestaurantData(restaurantId);
  };
  // Función para cargar datos del restaurante y menú
  const fetchRestaurantData = async (id: number, branch?: number) => {
    try {
      setLoading(true);
      setError(null);

      if (branch) {
        console.log(
          "📡 Fetching restaurant data for ID:",
          id,
          "branch:",
          branch
        );
        // Obtener restaurante y menú filtrado por sucursal
        const data = await restaurantService.getRestaurantWithMenuByBranch(
          id,
          branch
        );

        console.log("✅ Restaurant data loaded:", data.restaurant.name);
        console.log(
          "✅ Menu loaded with",
          data.menu.length,
          "sections (filtered by branch",
          branch,
          ")"
        );

        setRestaurant(data.restaurant);
        setMenu(data.menu);
      } else {
        console.log("📡 Fetching restaurant data for ID:", id);
        // Obtener restaurante y menú completo (sin filtrar por sucursal)
        const data = await restaurantService.getRestaurantWithMenu(id);

        console.log("✅ Restaurant data loaded:", data.restaurant.name);
        console.log("✅ Menu loaded with", data.menu.length, "sections");

        setRestaurant(data.restaurant);
        setMenu(data.menu);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load restaurant data";
      console.error("❌ Error loading restaurant data:", errorMessage);
      setError(errorMessage);
      setRestaurant(null);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect para cargar datos cuando cambia el restaurantId
  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData(restaurantId, selectedBranchNumber || undefined);
    } else {
      // Reset state cuando no hay restaurantId
      setRestaurant(null);
      setMenu([]);
      setError(null);
    }
  }, [restaurantId, selectedBranchNumber]);

  // Check if restaurant is currently open (re-check every minute)
  const isOpen = useMemo(() => {
    return isRestaurantOpen(restaurant?.opening_hours);
  }, [restaurant?.opening_hours]);

  // Re-check restaurant hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by updating a dummy state
      setRestaurant((prev) => (prev ? { ...prev } : null));
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const value: RestaurantContextValue = {
    restaurantId,
    restaurant,
    menu,
    loading,
    error,
    isOpen,
    setRestaurantId,
    refetchMenu,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useRestaurant() {
  const context = useContext(RestaurantContext);

  if (context === undefined) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }

  return context;
}
