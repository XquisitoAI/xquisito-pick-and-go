"use client";

import { useEffect } from "react";
import { getNextOpeningTime } from "../utils/restaurantHours";
import { OpeningHours } from "../utils/restaurantHours";

interface RestaurantClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  openingHours: OpeningHours | null | undefined;
  restaurantName?: string;
  restaurantLogo?: string | null;
}

export default function RestaurantClosedModal({
  isOpen,
  onClose,
  openingHours,
  restaurantName,
  restaurantLogo,
}: RestaurantClosedModalProps) {
  // Bloquear scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup: restaurar scroll al desmontar
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const nextOpeningTime = getNextOpeningTime(openingHours);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-4xl w-full shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex justify-center items-start mb-4">
            <h2 className="text-2xl font-semibold text-black text-center">
              El restaurante está cerrado
            </h2>
          </div>

          {/* Logo y nombre del restaurante */}
          {(restaurantName || restaurantLogo) && (
            <div className="flex flex-col items-center mb-6">
              {restaurantLogo ? (
                <img
                  src={restaurantLogo}
                  alt={restaurantName || "Logo del restaurante"}
                  className="w-20 h-20 object-contain rounded-lg mb-3"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                  <img
                    src="/logos/logo-short-green.webp"
                    alt="Logo Xquisito"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              )}
              {restaurantName && (
                <h3 className="text-lg font-medium text-black text-center">
                  {restaurantName}
                </h3>
              )}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-gray-600 text-base text-center">
              Lo sentimos, el restaurante {restaurantName} está cerrado en este
              momento.
            </p>

            {nextOpeningTime && (
              <div className="bg-[#f9f9f9] border border-[#bfbfbf]/50 rounded-lg p-2">
                <p className="text-black font-medium text-center">
                  {nextOpeningTime}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 bg-black hover:bg-stone-950 text-white py-3 rounded-full transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
