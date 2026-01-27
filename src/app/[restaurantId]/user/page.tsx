"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart, CartItem } from "@/context/CartContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";

export default function UserPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const [userName, setUserName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [orderUserName, setOrderUserName] = useState("");
  const { state: cartState, setUserName: setCartUserName } = useCart();
  const { navigateWithRestaurantId } = useNavigation();
  const router = useRouter();

  // Pick & Go no requiere número de mesa

  // Función para validar que solo se ingresen caracteres de texto válidos para nombres
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const textOnlyRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]*$/;

    if (textOnlyRegex.test(value)) {
      setUserName(value);
    }
  };

  // Manejar presión de Enter/Intro
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && userName.trim() && !isSubmitting) {
      e.preventDefault();
      handleProceedToOrder();
    }
  };

  // Manejar foco del input para scroll al teclado
  const handleInputFocus = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);
  };

  const handleProceedToOrder = async () => {
    if (userName.trim()) {
      setIsSubmitting(true);
      try {
        // Guardar items antes de que se limpie el carrito
        setOrderedItems([...cartState.items]);
        setOrderUserName(userName.trim());
        // Guardar el nombre del usuario en el contexto del carrito
        setCartUserName(userName.trim());
        // Navegar a card-selection
        navigateWithRestaurantId("/card-selection");
      } catch (error) {
        console.error("Error submitting order:", error);
        // Si hay error, ocultar la animación
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />

      <div className="px-4 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-linear-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center">
            <h2 className="font-medium text-white text-3xl md:text-4xl lg:text-5xl leading-7 md:leading-9 lg:leading-tight mt-2 md:mt-3 mb-6 md:mb-8">
              Ingresa tu nombre para continuar
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6 md:px-8 lg:px-10 pb-32">
            <div className="flex flex-col items-center w-full pt-32 md:pt-36 lg:pt-40">
              <div className="mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl lg:text-2xl font-medium text-black">
                  Tu nombre
                </h2>
              </div>

              <div className="w-full">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nombre"
                  value={userName}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  className="w-full px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 bg-gray-100/90 backdrop-blur-xl rounded-[9999px]! text-black text-xl md:text-2xl lg:text-3xl text-center font-normal placeholder:text-gray-400 focus:outline-none border border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_6px_rgba(255,255,255,0.8)] focus:shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_0_0_1.2px_rgba(20,184,166,0.5)] transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center py-4 md:py-5 lg:py-6">
        <div className="mx-4 md:mx-6 lg:mx-8 w-full max-w-full px-4 md:px-6 lg:px-8">
          <button
            onClick={handleProceedToOrder}
            disabled={!userName.trim() || isSubmitting}
            className={`w-full py-3 md:py-4 lg:py-5 rounded-full transition-colors text-white cursor-pointer text-base md:text-lg lg:text-xl ${
              userName.trim() && !isSubmitting
                ? "bg-gradient-to-r from-[#34808C] to-[#173E44]"
                : "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <svg
                  className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white"
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <style jsx>{`
                  @keyframes spin {
                    from {
                      transform: rotate(0deg);
                    }
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}</style>
              </div>
            ) : (
              "Continuar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
