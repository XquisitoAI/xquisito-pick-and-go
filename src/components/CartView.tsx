"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { usePickAndGoContext } from "../context/PickAndGoContext";
import { CartItem } from "../utils/cartHelpers";
import MenuHeaderBack from "./headers/MenuHeaderBack";
import OrderAnimation from "./UI/OrderAnimation";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CartView() {
  const { state, updateCartQuantity, removeFromCart, createOrder, setCustomerInfo } = usePickAndGoContext();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [showOrderAnimation, setShowOrderAnimation] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOrder = async () => {
    // Si el usuario está loggeado, hacer la orden directamente con animación
    if (isLoaded && isSignedIn && user) {
      setIsSubmitting(true);
      try {
        // Guardar items antes de que se limpie el carrito
        setOrderedItems([...state.cartItems]);
        // Mostrar animación de orden INMEDIATAMENTE
        setShowOrderAnimation(true);
        // Enviar la orden a la API en segundo plano usando el nombre completo de Clerk
        const userName =
          user.fullName || user.firstName || user.username || "Usuario";

        // Preparar datos del pedido usando la nueva interfaz
        setCustomerInfo({
          name: userName,
          email: user.primaryEmailAddress?.emailAddress || "",
          phone: user.primaryPhoneNumber?.phoneNumber || "",
          isAuthenticated: true,
          userId: user.id
        });

        await createOrder();
      } catch (error) {
        console.error("Error submitting order:", error);
        // Si hay error, ocultar la animación
        setShowOrderAnimation(false);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Si NO está loggeado, navegar a sign-in
      sessionStorage.setItem("signInFromCart", "true");
      router.push("/sign-in");
    }
  };

  const handleContinueFromAnimation = () => {
    router.push("/order");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />

      <div className="px-4 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          {state.cartItems.length === 0 ? (
            <div className="py-6 px-8 flex flex-col justify-center">
              <h1 className="text-[#e0e0e0] text-xl font-medium">
                🥡 Pick & Go
              </h1>
              <h2 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                El carrito está vacío, agrega items y disfruta
              </h2>
            </div>
          ) : (
            <div className="py-6 px-8 flex flex-col justify-center">
              <h1 className="text-[#e0e0e0] text-xl font-medium">
                🥡 Pick & Go
              </h1>
              <h2 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                Todo listo, revisa tu pedido y confirma
              </h2>
            </div>
          )}
        </div>

        <div className="flex-1 h-full flex flex-col overflow-hidden">
          {/* Cart Items */}
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6 overflow-hidden">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto flex flex-col pb-4">
              <div className="pt-6">
                <h2 className="bg-[#f9f9f9] border border-[#8e8e8e] rounded-full px-3 py-1 text-base font-medium text-black justify-self-center">
                  Mi carrito
                </h2>
              </div>

              {state.cartItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 text-center">
                  <div>
                    <div className="text-gray-400 text-6xl mb-4">🛒</div>
                    <p className="text-black text-2xl">El carrito está vacío</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-black font-medium text-sm flex gap-10 justify-end translate-y-4">
                    <span>Cant.</span>
                    <span>Precio</span>
                  </div>
                  <div className="divide-y divide-[#8e8e8e]/50">
                    {state.cartItems.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="size-16 bg-gray-300 rounded-sm flex items-center justify-center hover:scale-105 transition-transform duration-200">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt="Dish preview"
                                    className="w-full h-full object-cover rounded-sm"
                                  />
                                ) : (
                                  <img
                                    src={"/logo-short-green.webp"}
                                    alt="Logo Xquisito"
                                    className="size-18 object-contain"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base text-black capitalize">
                                {item.name}
                              </h3>
                              {item.customFields &&
                                item.customFields.length > 0 && (
                                  <div className="text-xs text-gray-400 space-y-0.5">
                                    {item.customFields.map((field, idx) => (
                                      <div key={idx}>
                                        {field.selectedOptions
                                          .filter((opt) => opt.price > 0)
                                          .map((opt, optIdx) => (
                                            <p key={optIdx}>
                                              {opt.optionName} $
                                              {opt.price.toFixed(2)}
                                            </p>
                                          ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="text-right flex items-center justify-center gap-4">
                            <div className="flex items-center gap-2">
                              <Minus
                                onClick={() =>
                                  updateCartQuantity(item.id, item.quantity - 1)
                                }
                                className="size-4 flex items-center justify-center text-black cursor-pointer"
                              />
                              <p className="text-base text-black text-center">
                                {item.quantity}
                              </p>
                              <Plus
                                onClick={() =>
                                  updateCartQuantity(item.id, item.quantity + 1)
                                }
                                className="size-4 flex items-center justify-center text-black cursor-pointer"
                              />
                            </div>
                            <div className="w-16 text-right">
                              <p className="text-base text-black">
                                $
                                {(
                                  (item.price + (item.extraPrice || 0)) *
                                  item.quantity
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed bottom section */}
            {state.cartItems.length > 0 && (
              <div className="bg-white border-t border-[#8e8e8e]/50">
                <div className="w-full flex justify-between text-black text-base font-medium mb-6 pt-6">
                  <span>Total</span>
                  <p>${state.cartTotal.toFixed(2)} MXN</p>
                </div>

                <div className="text-black">
                  <span className="font-medium text-xl">
                    ¿Algo que debamos saber?
                  </span>
                  <textarea
                    name=""
                    id=""
                    className="h-24 text-base w-full bg-[#f9f9f9] border border-[#bfbfbf] px-3 py-2 rounded-lg resize-none focus:outline-none mt-2"
                    placeholder="Alergias, instrucciones especiales, comentarios..."
                  ></textarea>
                </div>

                <div className="py-4 w-full">
                  <button
                    onClick={handleOrder}
                    className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors font-normal"
                  >
                    Ordenar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OrderAnimation overlay - solo para usuarios loggeados */}
      {showOrderAnimation && (
        <OrderAnimation
          userName={
            user?.fullName || user?.firstName || user?.username || "Usuario"
          }
          orderedItems={orderedItems}
          onContinue={handleContinueFromAnimation}
        />
      )}
    </div>
  );
}