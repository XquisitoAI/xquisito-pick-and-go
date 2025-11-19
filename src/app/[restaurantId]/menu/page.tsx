"use client";

import MenuView from "@/components/menu/MenuView";
import Loader from "@/components/UI/Loader";
import { useRestaurant } from "@/context/RestaurantContext";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";

const MenuPage = () => {
  const params = useParams();
  const router = useRouter();
  const { setRestaurantId, restaurant, loading, error } = useRestaurant();

  const restaurantId = params?.restaurantId as string;
  useEffect(() => {
    // Validar restaurantId
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      console.error("❌ Invalid restaurant ID");
      router.push("/");
      return;
    }

    // Establecer el restaurant ID en el contexto
    setRestaurantId(parseInt(restaurantId));

    console.log("🥡 Pick & Go Menu Page:", {
      restaurantId,
    });
  }, [restaurantId, setRestaurantId, router]);

  // Mostrar loader mientras carga
  if (loading) {
    return <Loader />;
  }

  // Mostrar error si falla la carga
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Error al cargar restaurante
          </h1>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-white text-[#0a8b9b] px-6 py-2 rounded-lg font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Mostrar error si no hay datos del restaurante
  if (!restaurant || !restaurantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Restaurante no encontrado
          </h1>
          <p className="text-white">
            Por favor verifica el enlace e intenta nuevamente
          </p>
        </div>
      </div>
    );
  }

  return <MenuView />;
};

export default MenuPage;
