"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTable } from "@/context/TableContext";
import { useCart, CartItem } from "@/context/CartContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Loader2 } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [orderUserName, setOrderUserName] = useState("");
  const { dispatch } = useTable();
  const { state: cartState, setUserName: setCartUserName } = useCart();
  const { tableNumber, navigateWithTable } = useTableNavigation();
  const router = useRouter();

  useEffect(() => {
    if (!tableNumber) {
      // Redirigir a home si no hay número de mesa
      router.push("/");
      return;
    }

    if (isNaN(parseInt(tableNumber))) {
      // Redirigir si el número de mesa no es válido
      router.push("/");
      return;
    }

    // Establecer el número de mesa en el contexto
    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });
  }, [tableNumber, dispatch, router]);

  // Función para validar que solo se ingresen caracteres de texto válidos para nombres
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const textOnlyRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]*$/;

    if (textOnlyRegex.test(value)) {
      setUserName(value);
    }
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
        navigateWithTable("/card-selection");
      } catch (error) {
        console.error("Error submitting order:", error);
        // Si hay error, ocultar la animación
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-meduim text-gray-800 mb-4">
            Mesa Inválida
          </h1>
          <p className="text-gray-600">Por favor escanee el código QR</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />

      <div className="px-4 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 px-8 flex flex-col justify-center">
            <h2 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
              Ingresa tu nombre para continuar
            </h2>
          </div>
        </div>

        <div className="flex-1 h-full flex flex-col ">
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6">
            <div className="flex-1 flex flex-col items-center w-full h-full">
              <div className="pt-32 mb-6">
                <h2 className="text-lg font-medium text-black">Tu nombre</h2>
              </div>

              <div className="w-full mb-24">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={userName}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 border-0 border-b border-black text-black text-2xl text-center font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante en la parte inferior */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6">
        <button
          onClick={handleProceedToOrder}
          disabled={!userName.trim() || isSubmitting}
          className={`w-full max-w-md py-3 rounded-full transition-all text-white shadow-lg ${
            userName.trim() && !isSubmitting
              ? "bg-gradient-to-r from-[#34808C] to-[#173E44] hover:scale-105 cursor-pointer"
              : "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            "Continuar"
          )}
        </button>
      </div>
    </div>
  );
}
