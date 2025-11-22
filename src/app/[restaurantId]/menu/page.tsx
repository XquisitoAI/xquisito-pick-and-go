"use client";

import MenuView from "@/components/menu/MenuView";
import Loader from "@/components/UI/Loader";
import { useRestaurant } from "@/context/RestaurantContext";
import { usePickAndGoContext } from "@/context/PickAndGoContext";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Home } from "lucide-react";

const MenuPage = () => {
  const params = useParams();
  const router = useRouter();
  const { setRestaurantId: setPickAndGoRestaurantId } = usePickAndGoContext();
  const { setRestaurantId, restaurant, loading, error } = useRestaurant();

  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    // Validar restaurantId
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      console.error("❌ Invalid restaurant ID");
      router.push("/");
      return;
    }

    // Establecer el restaurant ID en ambos contextos
    setRestaurantId(parseInt(restaurantId));
    setPickAndGoRestaurantId(restaurantId);

    console.log("🥡 Pick & Go Menu Page:", {
      restaurantId,
    });
  }, [restaurantId, setRestaurantId, setPickAndGoRestaurantId, router]);

  // Mostrar loader mientras carga
  if (loading || !restaurant || !restaurantId) {
    return <Loader />;
  }

  // Mostrar error si falla la carga
  if (error) {
    return (
      <div className="h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-8 lg:px-10 pb-12 md:py-10 lg:py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-6 md:mb-8 lg:mb-10 text-center">
              <img
                src="/logos/logo-short-green.webp"
                alt="Xquisito Logo"
                className="size-16 md:size-20 lg:size-24 mx-auto mb-4 md:mb-5 lg:mb-6"
              />
              <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-medium mb-2 md:mb-3 lg:mb-4">
                Error al cargar el restaurante
              </h1>
              <p className="text-white/80 text-sm md:text-base lg:text-lg mb-2">
                No pudimos obtener la información del menú
              </p>
              <p className="text-white/60 text-xs md:text-sm lg:text-base">
                {error}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 md:space-y-4 lg:space-y-5">
              {/* Go Home Option */}
              <button
                onClick={() => router.push("/")}
                className="w-full bg-white hover:bg-gray-50 text-black py-4 md:py-5 lg:py-6 px-4 md:px-5 lg:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-3 md:gap-4 lg:gap-5 active:scale-95"
              >
                <div className="bg-gradient-to-r from-[#34808C] to-[#173E44] p-2 md:p-2.5 lg:p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Home className="size-5 md:size-6 lg:size-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base md:text-lg lg:text-xl font-medium mb-0.5 md:mb-1">
                    Volver al inicio
                  </h2>
                  <p className="text-xs md:text-sm lg:text-base text-gray-600">
                    Regresar a la página principal
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si no hay datos
  if (!restaurant || !restaurantId) {
    return (
      <div className="h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-8 lg:px-10 pb-12 md:py-10 lg:py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-6 md:mb-8 lg:mb-10 text-center">
              <img
                src="/logos/logo-short-green.webp"
                alt="Xquisito Logo"
                className="size-16 md:size-20 lg:size-24 mx-auto mb-4 md:mb-5 lg:mb-6"
              />
              <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-medium mb-2 md:mb-3 lg:mb-4">
                Información Inválida
              </h1>
              <p className="text-white/80 text-sm md:text-base lg:text-lg">
                Restaurante no encontrado
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 md:space-y-4 lg:space-y-5">
              {/* Go Home Option */}
              <button
                onClick={() => router.push("/")}
                className="w-full bg-white hover:bg-gray-50 text-black py-4 md:py-5 lg:py-6 px-4 md:px-5 lg:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-3 md:gap-4 lg:gap-5 active:scale-95"
              >
                <div className="bg-gradient-to-r from-[#34808C] to-[#173E44] p-2 md:p-2.5 lg:p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Home className="size-5 md:size-6 lg:size-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base md:text-lg lg:text-xl font-medium mb-0.5 md:mb-1">
                    Volver al inicio
                  </h2>
                  <p className="text-xs md:text-sm lg:text-base text-gray-600">
                    Regresar a la página principal
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <MenuView />;
};

export default MenuPage;
