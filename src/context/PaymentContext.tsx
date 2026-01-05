"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { paymentService } from "../services/payment.service";
import { useGuest } from "./GuestContext";
import { useAuth } from "./AuthContext";
import { PaymentMethod } from "@/types/payment.types";

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  hasPaymentMethods: boolean;
  addPaymentMethod: (paymentMethod: PaymentMethod) => void;
  refreshPaymentMethods: () => Promise<void>;
  removePaymentMethod: (paymentMethodId: string) => void;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;
  deletePaymentMethod: (paymentMethodId: string) => Promise<void>;
  migrateGuestPaymentMethods: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

interface PaymentProviderProps {
  children: ReactNode;
}

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isGuest, guestId, setAsAuthenticated } = useGuest();
  const { user, isAuthenticated } = useAuth();

  const hasPaymentMethods = paymentMethods.length > 0;

  const refreshPaymentMethods = async () => {
    // Fetch payment methods for both authenticated users and guests

    // For registered users - prioritize user over guest session
    if (user) {
      console.log("🔐 Fetching payment methods for registered user:", user.id);

      // NO eliminar guest_id aquí - CartContext lo necesita para migrar el carrito
      // El CartContext se encargará de limpiarlo después de la migración exitosa
      const guestIdBefore = localStorage.getItem("xquisito-guest-id");
      if (guestIdBefore) {
        console.log(
          "  ℹ️ Guest-id found (will be used for cart migration):",
          guestIdBefore
        );
        // Solo limpiar table/restaurant/name, NO el guest_id
        localStorage.removeItem("xquisito-table-number");
        localStorage.removeItem("xquisito-restaurant-id");
        localStorage.removeItem("xquisito-guest-name");
      }

      console.log("  isGuest state:", isGuest);
      setIsLoading(true);
      try {
        // Set auth token from AuthContext (token is automatically managed)
        // No need to manually get token since paymentService handles it through AuthContext

        const response = await paymentService.getPaymentMethods();
        console.log("🔍 Full API response:", response);
        console.log("🔍 Response.data:", response.data);

        if (response.success) {
          // Handle different possible response structures
          let methods: PaymentMethod[] = [];

          // Check if paymentMethods is directly in response (not in data)
          if ((response as any).paymentMethods) {
            methods = (response as any).paymentMethods;
          } else if (response.data?.paymentMethods) {
            methods = response.data.paymentMethods;
          } else if (Array.isArray(response.data)) {
            methods = response.data;
          }

          setPaymentMethods(methods);
          console.log(
            "💳 Loaded payment methods for registered user:",
            methods.length,
            methods
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

    // For guests, ensure we have a guest ID
    if (isGuest && guestId) {
      console.log("👥 Fetching payment methods for guest:", guestId);
      setIsLoading(true);
      try {
        const response = await paymentService.getPaymentMethods();
        console.log("🔍 Full API response (guest):", response);
        console.log("🔍 Response.data (guest):", response.data);

        if (response.success) {
          // Handle different possible response structures
          let methods: PaymentMethod[] = [];

          // Check if paymentMethods is directly in response (not in data)
          if ((response as any).paymentMethods) {
            methods = (response as any).paymentMethods;
          } else if (response.data?.paymentMethods) {
            methods = response.data.paymentMethods;
          } else if (Array.isArray(response.data)) {
            methods = response.data;
          }

          setPaymentMethods(methods);
          console.log(
            "💳 Loaded payment methods for guest:",
            methods.length,
            methods
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

    // No valid authentication context
    console.log("⚠️ No valid authentication context for payment methods");
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
      // Auth token is automatically managed by AuthContext and paymentService

      const response =
        await paymentService.setDefaultPaymentMethod(paymentMethodId);
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
        throw new Error("Failed to set default payment method");
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
      console.log("🔍 Current auth state:", {
        user,
        isAuthenticated,
        isLoading,
      });
      throw new Error("Debes estar autenticado para eliminar tarjetas");
    }

    console.log(
      "🗑️ Deleting payment method for registered user:",
      paymentMethodId,
      "User ID:",
      user.id
    );
    try {
      // Auth token is automatically managed by AuthContext and paymentService

      const response =
        await paymentService.deletePaymentMethod(paymentMethodId);
      console.log("🗑️ Delete response:", response);

      if (response.success) {
        removePaymentMethod(paymentMethodId);
        console.log("✅ Payment method deleted successfully:", paymentMethodId);
      } else {
        console.error("❌ Delete payment method failed:", response.error);
        throw new Error("No se pudo eliminar la tarjeta");
      }
    } catch (error) {
      console.error("❌ Error deleting payment method:", error);
      throw error;
    }
  };

  const migrateGuestPaymentMethods = async () => {
    const guestIdInStorage = localStorage.getItem("xquisito-guest-id");

    if (!user || !guestIdInStorage) {
      console.log("⚠️ Cannot migrate: missing user or guest-id");
      return;
    }

    console.log("🔄 Starting payment methods migration from guest to user", {
      guestId: guestIdInStorage,
      userId: user.id,
    });

    try {
      const response = await paymentService.migrateGuestPaymentMethods(
        guestIdInStorage
      );

      if (response.success) {
        console.log(
          "✅ Payment methods migrated successfully:",
          response.data?.migratedCount || 0,
          "methods"
        );

        // Refresh payment methods to show migrated ones
        await refreshPaymentMethods();

        // IMPORTANT: Only delete guest-id after ALL migrations complete
        // This includes: cart migration (done in CartContext) + payment methods migration
        console.log(
          "🗑️ All migrations completed - removing guest ID from localStorage"
        );
        localStorage.removeItem("xquisito-guest-id");
        console.log("✅ Guest ID successfully removed");
      } else {
        console.error("❌ Payment methods migration failed:", response.error);
      }
    } catch (error) {
      console.error("❌ Error migrating payment methods:", error);
    }
  };

  // Load payment methods when user context changes
  useEffect(() => {
    // If user is authenticated, clear any guest session
    if (user && isGuest) {
      console.log("🔐 User authenticated - clearing guest session");
      setAsAuthenticated(user.id);
    }

    console.log("🔄 PaymentContext - Context changed:", {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      isGuest,
      guestId,
    });
    refreshPaymentMethods();
  }, [isAuthenticated, user?.id, isGuest, guestId, setAsAuthenticated]);

  // Auto-migrate guest payment methods when user logs in
  useEffect(() => {
    const autoMigrate = async () => {
      const guestIdInStorage = localStorage.getItem("xquisito-guest-id");
      if (user && guestIdInStorage) {
        console.log(
          "🔄 Auto-triggering payment methods migration after authentication"
        );
        // Wait for cart migration to complete first (handled in CartContext)
        // Then migrate payment methods
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await migrateGuestPaymentMethods();
      }
    };
    autoMigrate();
  }, [user?.id]);

  const value: PaymentContextType = {
    paymentMethods,
    isLoading,
    hasPaymentMethods,
    addPaymentMethod,
    refreshPaymentMethods,
    removePaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    migrateGuestPaymentMethods,
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
