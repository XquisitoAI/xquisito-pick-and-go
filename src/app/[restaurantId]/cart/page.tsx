"use client";

import { useRestaurant } from "@/context/RestaurantContext";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect } from "react";
import CartView from "@/components/CartView";

const CartPage = () => {
  const params = useParams();
  const router = useRouter();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      router.push("/");
      return;
    }

    // Establecer restaurant en contexto
    setRestaurantId(parseInt(restaurantId));
  }, [restaurantId, setRestaurantId, router]);

  return <CartView />;
};

export default CartPage;