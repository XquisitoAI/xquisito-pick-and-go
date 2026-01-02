"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useBranch } from "@/context/BranchContext";
import { useNavigation } from "@/hooks/useNavigation";

interface BranchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchChangeRequested?: (newBranchNumber: number) => Promise<void>;
  isProcessing?: boolean;
  itemsToRemove?: Array<{
    id: number;
    name: string;
    quantity: number;
    cartItemId?: string;
  }>;
}

export default function BranchSelectionModal({
  isOpen,
  onClose,
  onBranchChangeRequested,
  isProcessing = false,
  itemsToRemove = [],
}: BranchSelectionModalProps) {
  const { branches, selectedBranchNumber } = useBranch();
  const { changeBranch } = useNavigation();

  // Estado local temporal para la selección
  const [tempSelectedBranch, setTempSelectedBranch] = useState<number | null>(
    selectedBranchNumber
  );

  // Sincronizar el estado temporal cuando cambia la selección global o se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTempSelectedBranch(selectedBranchNumber);
    }
  }, [isOpen, selectedBranchNumber]);

  if (!isOpen) return null;

  const handleSelectBranch = (branchNumber: number) => {
    setTempSelectedBranch(branchNumber);
  };

  const handleConfirm = async () => {
    if (
      tempSelectedBranch !== null &&
      tempSelectedBranch !== selectedBranchNumber
    ) {
      // Si hay un callback personalizado, usarlo en lugar de cambiar directamente
      if (onBranchChangeRequested) {
        await onBranchChangeRequested(tempSelectedBranch);
      } else {
        changeBranch(tempSelectedBranch);
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Fondo */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

      {/* Modal */}
      <div
        className="relative bg-white rounded-t-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
            <h3 className="text-lg font-semibold text-black">
              Selecciona una sucursal
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {isProcessing ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
              <p className="text-gray-600 text-base mb-4">
                Verificando disponibilidad
              </p>
            </div>
          ) : itemsToRemove.length > 0 ? (
            <div className="mb-4">
              <p className="text-gray-600 text-base mb-4">
                Los siguientes items no están disponibles en la nueva sucursal y
                serán eliminados del carrito:
              </p>
              <div className="bg-red-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                <ul className="space-y-2 text-left">
                  {itemsToRemove.map((item) => (
                    <li
                      key={item.cartItemId || item.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <X className="size-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-gray-600 text-xs">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Los demás items se mantendrán en tu carrito.
              </p>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-base">
                No hay sucursales disponibles
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {branches.map((branch) => {
                const isSelected = branch.branch_number === tempSelectedBranch;

                return (
                  <div
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch.branch_number)}
                    className={`py-2 px-5 border rounded-full cursor-pointer transition-colors ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-black/50 bg-[#f9f9f9] hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-black text-base md:text-lg">
                          {branch.name}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600">
                          {branch.address}
                        </p>
                      </div>

                      {/* Radio button */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-teal-500 bg-teal-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con botón de confirmar */}
        <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={handleConfirm}
            className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 rounded-full cursor-pointer transition-colors text-base"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
