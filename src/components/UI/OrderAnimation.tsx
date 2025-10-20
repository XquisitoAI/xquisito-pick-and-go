"use client";

import React, { useState, useEffect } from "react";
import { useTable, CartItem } from "../../context/TableContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import Loader from "@/components/UI/Loader";
import { useUser } from "@clerk/nextjs";

interface OrderAnimationProps {
  userName?: string;
  orderedItems?: CartItem[];
  onContinue?: () => void;
}

const OrderAnimation = ({
  userName,
  orderedItems,
  onContinue,
}: OrderAnimationProps) => {
  const { navigateWithTable } = useTableNavigation();
  const { state } = useTable();
  const { restaurant, loading } = useRestaurant();
  const { user } = useUser();
  const [animationState, setAnimationState] = useState<
    "circle" | "content" | "greenCircle" | "success"
  >("circle");
  const [logoColorful, setLogoColorful] = useState(false);

  const displayName = userName || state.currentUserName || "Usuario";
  const displayItems = orderedItems || [];
  const displayRestaurant = restaurant?.name || "Restaurante";

  const userImage = user?.imageUrl;
  const hasUserImage = !!userImage;

  useEffect(() => {
    const contentTimer = setTimeout(() => {
      setAnimationState("content");
    }, 1500);

    const logoTimer = setTimeout(() => {
      setLogoColorful(true);
    }, 3500);

    const greenCircleTimer = setTimeout(() => {
      setAnimationState("greenCircle");
    }, 5500);

    const successTimer = setTimeout(() => {
      setAnimationState("success");
    }, 7000);

    const navigateTimer = setTimeout(() => {
      handleContinue();
    }, 9000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(logoTimer);
      clearTimeout(greenCircleTimer);
      clearTimeout(successTimer);
      clearTimeout(navigateTimer);
    };
  }, []);

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigateWithTable("/order");
    }
  };

  // Mostrar loader mientras carga
  if (loading) {
    return <Loader />;
  }

  return (
    <>
      {/* White circle */}
      {animationState === "circle" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="circle-animation"></div>
        </div>
      )}

      {/* Contenido */}
      {(animationState === "content" || animationState === "greenCircle") && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
          <div className="min-h-screen bg-white p-8 animate-fade-in flex flex-col">
            <div className="flex flex-col flex-1">
              {/* Logo animado */}
              <div className="mb-8 mt-12 w-fit relative">
                {/* Pulsing rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="pulse-ring"></div>
                  <div className="pulse-ring pulse-ring-delay-1"></div>
                  <div className="pulse-ring pulse-ring-delay-2"></div>
                </div>
                {/* Logo container */}
                <div className="size-24 flex items-center justify-center rounded-full relative z-10">
                  <img
                    src="/logo-short-green.webp"
                    alt="Xquisito Logo"
                    className="size-16 grayscale opacity-50"
                  />
                </div>
              </div>

              {/* Título */}
              <div className="text-black text-5xl font-medium mb-12 mr-20">
                Estamos creando tu pedido
              </div>

              {/* Información del pedido */}
              <div className="flex flex-col w-full divide-y divide-[#8e8e8e]/50">
                {/* Restaurante */}
                <div className="pb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full border border-gray-400 bg-gray-100 overflow-hidden flex-shrink-0">
                      <img
                        src={restaurant?.logo_url || "/logo-short-green.webp"}
                        alt={displayRestaurant}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <span className="text-black text-lg font-medium">
                        {displayRestaurant}
                      </span>
                      <p className="text-sm text-gray-500">Restaurante</p>
                    </div>
                  </div>
                </div>

                {/* Usuario */}
                <div className="py-6">
                  <div className="flex items-center gap-3">
                    {hasUserImage ? (
                      <img
                        src={userImage}
                        alt={displayName}
                        className="size-12 rounded-full object-cover border border-gray-400 flex-shrink-0"
                      />
                    ) : (
                      <div className="size-12 rounded-full border border-gray-400 bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-black text-lg font-medium">
                        {displayName}
                      </span>
                      <p className="text-sm text-gray-500">Nombre</p>
                    </div>
                  </div>
                </div>

                {/* Platillos ordenados */}
                {displayItems.length > 0 && (
                  <div className="pt-6">
                    <p className="text-sm text-gray-500 mb-4">
                      Platillos ordenados
                    </p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {displayItems.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="flex items-center gap-3"
                        >
                          <div className="size-12 bg-gray-300 rounded-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.images && item.images[0] ? (
                              <img
                                src={item.images[0]}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src="/logo-short-green.webp"
                                alt="Logo Xquisito"
                                className="size-8 object-contain"
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-black text-base capitalize">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Cantidad: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-black text-base font-medium">
                              $
                              {(
                                (item.price + (item.extraPrice || 0)) *
                                item.quantity
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animacion circulo verde */}
      {animationState === "greenCircle" && (
        <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-none">
          <div className="p-8">
            <div className="mb-8 mt-12 relative">
              <div className="green-circle-from-logo"></div>
            </div>
          </div>
        </div>
      )}

      {/* Success screen */}
      {animationState === "success" && (
        <div className="fixed inset-0 z-[9999] bg-green-500">
          <div className="min-h-screen p-8 flex flex-col">
            <div className="flex flex-col flex-1">
              {/* Checkmark */}
              <div className="mb-8 mt-12 animate-simple-fade-in">
                <div className="size-24 rounded-full bg-white flex items-center justify-center">
                  <svg
                    className="size-16 text-green-500"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>

              {/* Success message */}
              <div className="text-white text-5xl font-medium mb-12 mr-28 animate-simple-fade-in">
                Tu pedido fue creado con éxito
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderAnimation;
