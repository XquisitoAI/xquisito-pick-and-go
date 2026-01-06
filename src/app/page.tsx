"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Restaurant ID por defecto para testing
const DEFAULT_RESTAURANT_ID = 5;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check if user just signed in/up and has context
    const storedRestaurant = sessionStorage.getItem("pendingRestaurantId");
    const isFromPaymentFlow = sessionStorage.getItem("signupFromPaymentFlow");
    const isFromPaymentSuccess = sessionStorage.getItem(
      "signupFromPaymentSuccess"
    );
    const isFromMenu = sessionStorage.getItem("signInFromMenu");

    console.log("🔍 Root page debugging:", {
      isLoading,
      user,
      storedRestaurant,
      isFromPaymentFlow,
      isFromPaymentSuccess,
      isFromMenu,
      currentPath: window.location.pathname,
    });

    // Determinar restaurantId
    const restaurantParam = searchParams.get("restaurant");
    const restaurantId =
      restaurantParam || storedRestaurant || DEFAULT_RESTAURANT_ID;

    if (user && isFromMenu) {
      // User signed in from MenuView settings, redirect to dashboard (Pick & Go - no table)
      sessionStorage.removeItem("signInFromMenu");
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    if (user && isFromPaymentFlow) {
      // User signed up during payment flow, redirect to payment-options with table
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("signupFromPaymentFlow");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/payment-options`);
      return;
    }

    if (user && isFromPaymentSuccess) {
      // User signed up from payment-success, redirect to dashboard
      sessionStorage.removeItem("signupFromPaymentSuccess");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    // Default redirect to restaurant 3 menu for Pick & Go (no table needed)
    console.log(
      `✅ Default redirect to /${DEFAULT_RESTAURANT_ID}/menu (Pick & Go)`
    );
    router.replace(`/${DEFAULT_RESTAURANT_ID}/menu`);
  }, [router, searchParams, user, isLoading]);

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-8 lg:px-10 pb-12 md:py-10 lg:py-12">
        <div className="w-full max-w-md">
          {/* Logo and QR Code side by side */}
          <div className="mb-6 md:mb-8 lg:mb-10 text-center">
            <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8 mb-4 md:mb-5 lg:mb-6">
              <img
                src="/logos/logo-short-green.webp"
                alt="Xquisito Logo"
                className="size-16 md:size-20 lg:size-24"
              />
            </div>
            <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-medium mb-2 md:mb-3 lg:mb-4">
              Bienvenido a Xquisito
            </h1>
            <p className="text-white/80 text-sm md:text-base lg:text-lg">
              Ordena para llevar desde tu dispositivo y recoge en el restaurante
            </p>
          </div>

          {/* Additional Info */}
          <div className="mt-6 md:mt-7 lg:mt-8 text-center">
            <p className="text-white/70 text-xs md:text-sm lg:text-base">
              Accede al menú de tu restaurante favorito mediante el enlace
              proporcionado. Próximamente podrás explorar todos los restaurantes
              disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
