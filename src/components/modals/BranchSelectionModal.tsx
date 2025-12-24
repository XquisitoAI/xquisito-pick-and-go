"use client";

import { X, MapPin, Phone } from "lucide-react";
import { useBranch } from "@/context/BranchContext";
import { useNavigation } from "@/hooks/useNavigation";

interface BranchSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BranchSelectionModal({
  isOpen,
  onClose,
}: BranchSelectionModalProps) {
  const { branches, selectedBranchId } = useBranch();
  const { changeBranch } = useNavigation();

  if (!isOpen) return null;

  const handleSelectBranch = (branchId: number) => {
    changeBranch(branchId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-end justify-center backdrop-blur-sm z-[9999]"
      onClick={onClose}
    >
      {/* Fondo */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Modal */}
      <div
        className="relative bg-white rounded-t-4xl w-full mx-4 md:mx-6 lg:mx-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 md:px-8 lg:px-10 pt-4 md:pt-6 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-black">
              Selecciona una sucursal
            </h3>
            <button
              onClick={onClose}
              className="p-1 md:p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="size-5 md:size-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-8 lg:px-10 py-4 md:py-6">
          {branches.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-500 text-base md:text-lg">
                No hay sucursales disponibles
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {branches.map((branch) => {
                const isSelected = branch.id === selectedBranchId;

                return (
                  <div
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch.id)}
                    className={`py-3 md:py-4 lg:py-5 px-4 md:px-5 lg:px-6 border rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 md:gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-black text-base md:text-lg lg:text-xl mb-1 md:mb-2">
                          {branch.name}
                        </h4>

                        {/* Address */}
                        <div className="flex items-start gap-2 mb-1 md:mb-1.5">
                          <MapPin className="size-4 md:size-5 text-gray-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm md:text-base text-gray-600">
                            {branch.address}
                          </p>
                        </div>

                        {/* Phone */}
                        {branch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="size-4 md:size-5 text-gray-500 flex-shrink-0" />
                            <p className="text-sm md:text-base text-gray-600">
                              {branch.phone}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Radio button */}
                      <div
                        className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
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

        {/* Footer con padding para safe area */}
        <div
          className="px-6 md:px-8 lg:px-10 pb-4 md:pb-6"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 md:py-4 rounded-full cursor-pointer transition-colors text-base md:text-lg"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
