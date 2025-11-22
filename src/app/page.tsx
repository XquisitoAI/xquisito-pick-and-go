"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Restaurant ID por defecto para testing
const DEFAULT_RESTAURANT_ID = 5;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user just signed in/up and has context
    const storedRestaurant = sessionStorage.getItem("pendingRestaurantId");
    const isFromPaymentFlow = sessionStorage.getItem("signupFromPaymentFlow");
    const isFromPaymentSuccess = sessionStorage.getItem(
      "signupFromPaymentSuccess"
    );
    const isFromMenu = sessionStorage.getItem("signInFromMenu");
    const isFromCart = sessionStorage.getItem("signupFromCart");

    console.log("🔍 Root page debugging:", {
      isLoaded,
      isSignedIn,
      storedRestaurant,
      isFromPaymentFlow,
      isFromPaymentSuccess,
      isFromMenu,
      isFromCart,
      currentPath: window.location.pathname,
    });

    // Determinar restaurantId
    const restaurantParam = searchParams.get("restaurant");
    const restaurantId =
      restaurantParam || storedRestaurant || DEFAULT_RESTAURANT_ID;

    if (isSignedIn && isFromCart) {
      // User signed in/up from cart (CartView), redirect to card-selection
      sessionStorage.removeItem("signupFromCart");
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/card-selection`);
      return;
    }

    if (isSignedIn && isFromMenu) {
      // User signed in from MenuView settings, redirect to dashboard (Pick & Go - no table)
      sessionStorage.removeItem("signInFromMenu");
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    if (isSignedIn && isFromPaymentFlow) {
      // User signed up during payment flow, redirect to payment-options with table
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("signupFromPaymentFlow");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/payment-options`);
      return;
    }

    if (isSignedIn && isFromPaymentSuccess) {
      // User signed up from payment-success, redirect to dashboard
      sessionStorage.removeItem("signupFromPaymentSuccess");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    // Check for table parameter in current URL
    const tableParam = searchParams.get("table");
    if (tableParam) {
      router.replace(`/${restaurantId}/menu?table=${tableParam}`);
      return;
    }

    // Default redirect to restaurant 3 menu for Pick & Go (no table needed)
    console.log(
      `✅ Default redirect to /${DEFAULT_RESTAURANT_ID}/menu (Pick & Go)`
    );
    router.replace(`/${DEFAULT_RESTAURANT_ID}/menu`);
  }, [router, searchParams, isSignedIn, isLoaded]);

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
              Por favor tapee la tarjeta o escanee el código QR de su mesa para
              comenzar
            </p>
          </div>

          {/* Additional Info */}
          <div className="mt-6 md:mt-7 lg:mt-8 text-center">
            <p className="text-white/70 text-xs md:text-sm lg:text-base">
              Encontrará la tarjeta en su mesa. Cada tarjeta tiene un código
              único para acceder al menú digital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
