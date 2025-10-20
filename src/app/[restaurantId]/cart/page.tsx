"use client";

import { useRestaurant } from "@/context/RestaurantContext";
import { useTable } from "@/context/TableContext";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

const CartPage = () => {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const { dispatch } = useTable();
  const { setRestaurantId } = useRestaurant();
  const tableNumber = searchParams?.get("table");
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      router.push("/");
      return;
    }

    if (!tableNumber || isNaN(parseInt(tableNumber))) {
      router.push("/");
      return;
    }

    // Establecer restaurant y mesa en contextos
    setRestaurantId(parseInt(restaurantId));
    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });
  }, [tableNumber, restaurantId, dispatch, setRestaurantId, router]);

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Mesa Inválida
          </h1>
          <p className="text-gray-600">Por favor escanee el código QR</p>
        </div>
      </div>
    );
  }

  return <div>CartPage</div>;
};

export default CartPage;
