"use client";

import MenuView from "@/components/menu/MenuView";
import Loader from "@/components/UI/Loader";
import { useRestaurant } from "@/context/RestaurantContext";
import { useTable } from "@/context/TableContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

const MenuPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dispatch } = useTable();
  const { setRestaurantId, restaurant, loading, error } = useRestaurant();

  const restaurantId = params?.restaurantId as string;
  const tableNumber = searchParams?.get("table");

  useEffect(() => {
    // Validar restaurantId
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      console.error("❌ Invalid restaurant ID");
      router.push("/");
      return;
    }

    // Validar tableNumber
    if (!tableNumber || isNaN(parseInt(tableNumber))) {
      console.error("❌ Invalid table number");
      router.push("/");
      return;
    }

    // Establecer el restaurant ID en el contexto
    setRestaurantId(parseInt(restaurantId));

    // Establecer el número de mesa en el contexto
    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });

    console.log("🍽️ Restaurant Menu Page:", {
      restaurantId,
      tableNumber,
    });
  }, [restaurantId, tableNumber, dispatch, setRestaurantId, router]);

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

  // Mostrar error si no hay datos
  if (!restaurant || !restaurantId || !tableNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Información Inválida
          </h1>
          <p className="text-white">
            Por favor escanee el código QR de su mesa
          </p>
        </div>
      </div>
    );
  }

  return <MenuView tableNumber={tableNumber} />;
};

export default MenuPage;
