"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { usePickAndGoContext } from "@/context/PickAndGoContext";
import { useRestaurant } from "@/context/RestaurantContext";
import CartView from "@/components/CartView";

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const { setRestaurantId: setPickAndGoRestaurantId } = usePickAndGoContext();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      router.push("/");
      return;
    }

    // Establecer restaurant ID en ambos contextos
    setRestaurantId(parseInt(restaurantId));
    setPickAndGoRestaurantId(restaurantId);

    console.log("🛒 Pick & Go Cart Page:", { restaurantId });
  }, [restaurantId, setRestaurantId, setPickAndGoRestaurantId, router]);

  if (!restaurantId || isNaN(parseInt(restaurantId))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Restaurante Inválido
          </h1>
          <p className="text-gray-600">ID de restaurante no válido</p>
        </div>
      </div>
    );
  }

  return <CartView />;
}
