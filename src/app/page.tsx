"use client";

import Loader from "@/components/UI/Loader";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Restaurant ID por defecto para testing
const DEFAULT_RESTAURANT_ID = 3;
const DEFAULT_TABLE = 12;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user just signed in/up and has context
    const storedTable = sessionStorage.getItem("pendingTableRedirect");
    const storedRestaurant = sessionStorage.getItem("pendingRestaurantId");
    const isFromPaymentFlow = sessionStorage.getItem("signupFromPaymentFlow");
    const isFromPaymentSuccess = sessionStorage.getItem(
      "signupFromPaymentSuccess"
    );
    const isFromMenu = sessionStorage.getItem("signInFromMenu");

    console.log("🔍 Root page debugging:", {
      isLoaded,
      isSignedIn,
      storedTable,
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

    if (isSignedIn && isFromMenu) {
      // User signed in from MenuView settings, redirect to dashboard (Pick & Go - no table)
      console.log("✅ Redirecting to dashboard from menu sign-in");
      sessionStorage.removeItem("signInFromMenu");
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    if (isSignedIn && storedTable && isFromPaymentFlow) {
      // User signed up during payment flow, redirect to payment-options with table
      console.log("✅ Redirecting to payment-options with table:", storedTable);
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("signupFromPaymentFlow");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/payment-options?table=${storedTable}`);
      return;
    }

    if (isSignedIn && isFromPaymentSuccess) {
      // User signed up from payment-success, redirect to dashboard
      console.log("✅ Redirecting to dashboard from payment-success");
      sessionStorage.removeItem("signupFromPaymentSuccess");
      sessionStorage.removeItem("pendingRestaurantId");
      router.replace(`/${restaurantId}/dashboard`);
      return;
    }

    // Check for table parameter in current URL
    const tableParam = searchParams.get("table");
    if (tableParam) {
      console.log(
        `✅ Redirecting to /${restaurantId}/menu?table=${tableParam}`
      );
      router.replace(`/${restaurantId}/menu?table=${tableParam}`);
      return;
    }

    // Default redirect to restaurant 3 menu for Pick & Go (no table needed)
    console.log(
      `✅ Default redirect to /${DEFAULT_RESTAURANT_ID}/menu (Pick & Go)`
    );
    router.replace(`/${DEFAULT_RESTAURANT_ID}/menu`);
  }, [router, searchParams, isSignedIn, isLoaded]);
  return <Loader />;
}
