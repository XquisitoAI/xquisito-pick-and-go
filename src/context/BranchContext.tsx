"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Branch, BranchContextType } from "@/types/branch.types";
import { branchService } from "@/services/branch.service";

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBranches = useCallback(async (restaurantId: number) => {
    setIsLoading(true);
    try {
      const response = await branchService.getBranches(restaurantId);
      if (response.success && response.data) {
        setBranches(response.data);

        // Si solo hay una sucursal, seleccionarla automáticamente
        if (response.data.length === 1) {
          setSelectedBranchId(response.data[0].id);
        }
        // Si hay múltiples pero ninguna seleccionada, usar la primera
        else if (response.data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(response.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        branches,
        isLoading,
        setSelectedBranchId,
        fetchBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
