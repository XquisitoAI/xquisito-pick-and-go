"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiService, PaymentMethod } from "../utils/api2";
import { useGuest } from "./GuestContext";
import { useUser, useAuth } from "@clerk/nextjs";

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  hasPaymentMethods: boolean;
  addPaymentMethod: (paymentMethod: PaymentMethod) => void;
  refreshPaymentMethods: () => Promise<void>;
  removePaymentMethod: (paymentMethodId: string) => void;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;
  deletePaymentMethod: (paymentMethodId: string) => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

interface PaymentProviderProps {
  children: ReactNode;
}

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isGuest, guestId, setAsAuthenticated } = useGuest();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const hasPaymentMethods = paymentMethods.length > 0;

  const refreshPaymentMethods = async () => {
    // Only fetch if user is authenticated (either registered user or guest)
    if (!isLoaded) {
      setPaymentMethods([]);
      return;
    }

    // For registered users - prioritize user over guest session
    if (user) {
      console.log("🔐 Fetching payment methods for registered user:", user.id);

      // NO eliminar guest_id aquí - CartContext lo necesita para migrar el carrito
      // El CartContext se encargará de limpiarlo después de la migración exitosa
      const guestIdBefore = localStorage.getItem("xquisito-guest-id");
      if (guestIdBefore) {
        console.log(
          " ℹ️ Guest-id found (will be used for cart migration):",
          guestIdBefore
        );
        //localStorage.removeItem("xquisito-guest-id");
        localStorage.removeItem("xquisito-table-number");
        localStorage.removeItem("xquisito-restaurant-id");
        localStorage.removeItem("xquisito-guest-name");
      }

      console.log("  isGuest state:", isGuest);
      setIsLoading(true);
      try {
        // Get Clerk auth token
        const token = await getToken();
        if (token) {
          apiService.setAuthToken(token);
        } else {
          console.warn("  ⚠️ No Clerk token available!");
        }

        const response = await apiService.getPaymentMethods();
        console.log("🔍 GetPaymentMethods response for registered user:", response);

        // Handle response structure: check both possible locations
        const paymentMethods = response.data?.paymentMethods || response.paymentMethods || [];

        if (response.success && paymentMethods.length > 0) {
          setPaymentMethods(paymentMethods);
          console.log(
            "💳 Loaded payment methods for registered user:",
            paymentMethods.length
          );
        } else {
          setPaymentMethods([]);
          console.log("💳 No payment methods found for registered user");
        }
      } catch (error) {
        console.error(
          "❌ Error fetching payment methods for registered user:",
          error
        );
        setPaymentMethods([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For guests, we need either a guestId OR if we're in Pick & Go mode
    if (isGuest && guestId) {
      console.log("👥 Fetching payment methods for guest:", guestId);
      setIsLoading(true);
      try {
        const response = await apiService.getPaymentMethods();
        console.log("🔍 GetPaymentMethods response for guest:", response);

        // Handle response structure: check both possible locations
        const paymentMethods = response.data?.paymentMethods || response.paymentMethods || [];

        if (response.success && paymentMethods.length > 0) {
          setPaymentMethods(paymentMethods);
          console.log(
            "💳 Loaded payment methods for guest:",
            paymentMethods.length
          );
        } else {
          setPaymentMethods([]);
          console.log("💳 No payment methods found for guest");
        }
      } catch (error) {
        console.error("❌ Error fetching payment methods for guest:", error);
        setPaymentMethods([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For Pick & Go, if no guest context yet but we have guestId in localStorage, try anyway
    if (!isGuest && !user) {
      const storedGuestId = localStorage.getItem("xquisito-guest-id");
      if (storedGuestId) {
        console.log("🔍 Pick & Go: Found stored guestId, fetching payment methods:", storedGuestId);
        setIsLoading(true);
        try {
          const response = await apiService.getPaymentMethods();
          console.log("🔍 GetPaymentMethods response for stored guest:", response);

          const paymentMethods = response.data?.paymentMethods || response.paymentMethods || [];

          if (response.success && paymentMethods.length > 0) {
            setPaymentMethods(paymentMethods);
            console.log("💳 Loaded payment methods for stored guest:", paymentMethods.length);
          } else {
            setPaymentMethods([]);
            console.log("💳 No payment methods found for stored guest");
          }
        } catch (error) {
          console.error("❌ Error fetching payment methods for stored guest:", error);
          setPaymentMethods([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }
    }

    // No valid authentication context
    console.log("⚠️ No valid authentication context for payment methods", {
      isLoaded,
      hasUser: !!user,
      isGuest,
      guestId,
      storedGuestId: localStorage.getItem("xquisito-guest-id")
    });
    setPaymentMethods([]);
  };

  const addPaymentMethod = (paymentMethod: PaymentMethod) => {
    setPaymentMethods((prev) => [...prev, paymentMethod]);
  };

  const removePaymentMethod = (paymentMethodId: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId));
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    // Only registered users can set default payment methods
    if (!user) {
      console.log(
        "⚠️ setDefaultPaymentMethod: Only registered users can set default payment methods"
      );
      throw new Error("Only registered users can set default payment methods");
    }

    console.log(
      "🔧 Setting default payment method for registered user:",
      paymentMethodId
    );
    try {
      // Get Clerk auth token
      const token = await getToken();
      if (token) {
        apiService.setAuthToken(token);
      }

      const response =
        await apiService.setDefaultPaymentMethod(paymentMethodId);
      if (response.success) {
        // Update local state to reflect the new default
        setPaymentMethods((prev) =>
          prev.map((pm) => ({
            ...pm,
            isDefault: pm.id === paymentMethodId,
          }))
        );
        console.log(
          "✅ Default payment method set successfully:",
          paymentMethodId
        );
      } else {
        throw new Error(
          response.error?.message || "Failed to set default payment method"
        );
      }
    } catch (error) {
      console.error("❌ Error setting default payment method:", error);
      throw error;
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    // Only registered users can delete saved payment methods
    if (!user) {
      console.log(
        "⚠️ deletePaymentMethod: Only registered users can delete saved payment methods"
      );
      throw new Error("Only registered users can delete saved payment methods");
    }

    console.log(
      "🗑️ Deleting payment method for registered user:",
      paymentMethodId
    );
    try {
      // Get Clerk auth token
      const token = await getToken();
      if (token) {
        apiService.setAuthToken(token);
      }

      const response = await apiService.deletePaymentMethod(paymentMethodId);
      if (response.success) {
        removePaymentMethod(paymentMethodId);
        console.log("✅ Payment method deleted successfully:", paymentMethodId);
      } else {
        throw new Error(
          response.error?.message || "Failed to delete payment method"
        );
      }
    } catch (error) {
      console.error("❌ Error deleting payment method:", error);
      throw error;
    }
  };

  // Load payment methods when user context changes
  useEffect(() => {
    if (isLoaded) {
      // If user is authenticated, clear any guest session
      if (user && isGuest) {
        console.log("🔐 User authenticated - clearing guest session");
        setAsAuthenticated(user.id);
      }

      console.log("🔄 PaymentContext - Context changed:", {
        isLoaded,
        hasUser: !!user,
        userId: user?.id,
        isGuest,
        guestId,
      });
      refreshPaymentMethods();
    }
  }, [isLoaded, user?.id, isGuest, guestId, setAsAuthenticated]);

  const value: PaymentContextType = {
    paymentMethods,
    isLoading,
    hasPaymentMethods,
    addPaymentMethod,
    refreshPaymentMethods,
    removePaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
  };

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
}

// Custom hook to use payment context
export function usePayment(): PaymentContextType {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
}

// Helper hook to check if user has payment methods
export function useHasPaymentMethods(): boolean {
  const { hasPaymentMethods } = usePayment();
  return hasPaymentMethods;
}
