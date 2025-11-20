"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Suspense,
} from "react";
import { apiService } from "../utils/api2";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface GuestContextType {
  isGuest: boolean;
  guestId: string | null;
  tableNumber: string | null;
  guestName: string | null;
  setAsGuest: (tableNumber?: string) => void;
  setAsAuthenticated: (userId: string) => void;
  clearGuestSession: () => void;
  setGuestName: (name: string) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

interface GuestProviderProps {
  children: ReactNode;
}

function GuestProviderInternal({ children }: GuestProviderProps) {
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [hasLinkedOrders, setHasLinkedOrders] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  // Link guest orders when user authenticates
  useEffect(() => {
    if (!isLoaded || !user || hasLinkedOrders) return;

    const storedGuestId = localStorage.getItem("xquisito-guest-id");
    const storedTableNumber = localStorage.getItem("xquisito-table-number");
    const storedRestaurantId = localStorage.getItem("xquisito-restaurant-id");

    if (storedGuestId && user.id) {
      console.log("🔗 Linking guest orders to authenticated user:", {
        guestId: storedGuestId,
        userId: user.id,
        tableNumber: storedTableNumber,
        restaurantId: storedRestaurantId,
      });

      apiService
        .linkGuestOrdersToUser(
          storedGuestId,
          user.id,
          storedTableNumber || undefined,
          storedRestaurantId || undefined
        )
        .then((response) => {
          if (response.success) {
            console.log("✅ Guest orders linked successfully:", response.data);
            setHasLinkedOrders(true);
          } else {
            console.error("❌ Failed to link guest orders:", response.error);
          }
        })
        .catch((error) => {
          console.error("❌ Error linking guest orders:", error);
        });
    }
  }, [isLoaded, user, hasLinkedOrders]);

  // Smart initialization: Auto-detect guest vs registered user context
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load

    const tableParam = searchParams?.get("table");

    if (user) {
      // User is registered - clear any guest session
      if (isGuest) {
        console.log("🔐 Registered user detected - clearing guest session");
        clearGuestSession();
      }
    } else {
      // No registered user - check if we should be guest

      const storedGuestId = localStorage.getItem("xquisito-guest-id");
      const storedTableNumber = localStorage.getItem("xquisito-table-number");

      // Priority 1: If URL has table parameter, use it (even if restoring session)
      if (tableParam) {
        console.log(
          "👤 Table parameter detected:",
          tableParam,
          "- Setting up guest session"
        );

        // Use existing guest ID if available, or create new one
        const guestIdToUse = storedGuestId || generateGuestId();

        // Store to localStorage FIRST to ensure persistence
        localStorage.setItem("xquisito-table-number", tableParam);
        localStorage.setItem("xquisito-guest-id", guestIdToUse);

        setIsGuest(true);
        setGuestId(guestIdToUse);
        setTableNumber(tableParam);
        apiService.setTableNumber(tableParam);
        console.log("👤 Guest session configured:", {
          guestId: guestIdToUse,
          tableNumber: tableParam,
          wasRestored: !!storedGuestId,
        });
        return;
      }

      // Priority 2: Restore existing guest session (only if no table param)
      if (storedGuestId && storedTableNumber) {
        const storedGuestName = localStorage.getItem("xquisito-guest-name");
        setIsGuest(true);
        setGuestId(storedGuestId);
        setTableNumber(storedTableNumber);
        setGuestName(storedGuestName);
        console.log("🔄 Restored guest session:", {
          guestId: storedGuestId,
          tableNumber: storedTableNumber,
          guestName: storedGuestName,
        });
        return;
      }

      // Priority 3: No table param and no valid stored session - stay as non-guest
      console.log(
        "ℹ️ No table parameter and no valid guest session - staying as non-guest"
      );
    }
  }, [isLoaded, user, searchParams]);

  const setAsGuest = (newTableNumber?: string) => {
    // Generate guest ID through apiService (which handles localStorage)
    const generatedGuestId = generateGuestId();

    // Ensure localStorage is updated immediately
    localStorage.setItem("xquisito-guest-id", generatedGuestId);

    setIsGuest(true);
    setGuestId(generatedGuestId);

    if (newTableNumber) {
      localStorage.setItem("xquisito-table-number", newTableNumber);
      apiService.setTableNumber(newTableNumber);
      setTableNumber(newTableNumber);
    }

    console.log("👤 Set as guest user:", {
      guestId: generatedGuestId,
      tableNumber: newTableNumber,
    });
  };

  const setAsAuthenticated = (userId: string) => {
    // Clear guest session when user authenticates
    clearGuestSession();
    console.log("🔐 Set as authenticated user:", userId);
  };

  const clearGuestSession = () => {
    apiService.clearGuestSession();
    setIsGuest(false);
    setGuestId(null);
    setTableNumber(null);
    setGuestName(null);
    localStorage.removeItem("xquisito-guest-name");
    console.log("🗑️ Guest session cleared");
  };

  const setGuestNameHandler = (name: string) => {
    setGuestName(name);
    localStorage.setItem("xquisito-guest-name", name);
    console.log("👤 Guest name set:", name);
  };

  // Helper function to generate guest ID
  const generateGuestId = (): string => {
    if (typeof window !== "undefined") {
      let guestId = localStorage.getItem("xquisito-guest-id");

      if (!guestId) {
        guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("xquisito-guest-id", guestId);
      }

      return guestId;
    }
    return `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const value: GuestContextType = {
    isGuest,
    guestId,
    tableNumber,
    guestName,
    setAsGuest,
    setAsAuthenticated,
    clearGuestSession,
    setGuestName: setGuestNameHandler,
  };

  return (
    <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
  );
}

export function GuestProvider({ children }: GuestProviderProps) {
  return (
    <Suspense fallback={<div style={{ display: "none" }} />}>
      <GuestProviderInternal>{children}</GuestProviderInternal>
    </Suspense>
  );
}

// Custom hook to use guest context
export function useGuest(): GuestContextType {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
}

// Helper hook to check if user is guest
export function useIsGuest(): boolean {
  const { isGuest } = useGuest();
  return isGuest;
}

// Helper hook to get guest info
export function useGuestInfo(): {
  guestId: string | null;
  tableNumber: string | null;
} {
  const { guestId, tableNumber } = useGuest();
  return { guestId, tableNumber };
}
