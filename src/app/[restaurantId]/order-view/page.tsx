"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePickAndGoContext } from "@/context/PickAndGoContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Loader2, RefreshCw } from "lucide-react";
import { pickAndGoService, PickAndGoOrder } from "@/services/pickandgo.service";

export default function OrderViewPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<PickAndGoOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { state } = usePickAndGoContext();
  const { navigateWithRestaurantId } = useNavigation();

  // Función para cargar la orden
  const fetchOrder = async (isRefresh = false) => {
    if (!orderId) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await pickAndGoService.getOrder(orderId);

      if (result.success && result.data) {
        setOrder(result.data);
        console.log("Order loaded:", result.data);
      } else {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : (result.error as any)?.message || "Error al cargar la orden";
        setError(errorMessage);
      }
    } catch (err) {
      setError("Error de red al cargar la orden");
      console.error("Error fetching order:", err);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Cargar orden si se proporciona orderId
  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleRefresh = () => {
    fetchOrder(true);
  };

  const handleContinue = () => {
    navigateWithRestaurantId("/menu");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "ready":
        return "bg-green-100 text-green-800 border-green-300";
      case "delivered":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Función para obtener el texto del status
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En progreso";
      case "ready":
        return "Listo";
      case "delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />
      <div className="px-4 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 px-8 flex flex-col justify-center">
            <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
              {success ? "¡Orden confirmada!" : "Tu orden"}
            </h1>
          </div>
        </div>
        <div className="flex-1 h-full flex flex-col overflow-hidden">
          {/* Contenido con scroll */}
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-8 overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col pb-[120px] pt-6">
              {/* Título con botón de refresh */}
              <div className="flex justify-center items-start mb-4 relative">
                <h2 className="bg-[#f9f9f9] border border-[#8e8e8e] rounded-full px-3 py-1 text-base font-medium text-black">
                  Items ordenados
                </h2>
                <div className="absolute right-0">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-5 text-[#0a8b9b] ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="size-8 animate-spin text-[#0a8b9b]" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : order ? (
                <>
                  {/* Items de la orden */}
                  <div className="divide-y divide-gray-200">
                    {order?.items?.map((dish, index) => (
                      <div
                        key={dish.id || index}
                        className="py-3 flex items-start gap-3"
                      >
                        <div className="flex-shrink-0">
                          <div className="size-16 bg-gray-300 rounded-sm flex items-center justify-center">
                            {dish.images &&
                            dish.images.length > 0 &&
                            dish.images[0] ? (
                              <img
                                src={dish.images[0]}
                                alt={dish.item}
                                className="w-full h-full object-cover rounded-sm"
                              />
                            ) : (
                              <img
                                src={"/logos/logo-short-green.webp"}
                                alt="Logo Xquisito"
                                className="size-18 object-contain"
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base text-black capitalize">
                            {dish.item}
                          </h3>

                          {dish.custom_fields &&
                            dish.custom_fields.length > 0 && (
                              <div className="text-xs text-gray-400 space-y-0.5 mt-1">
                                {dish.custom_fields.map(
                                  (field: any, idx: number) => (
                                    <div key={idx}>
                                      {field.selectedOptions
                                        ?.filter((opt: any) => opt.price > 0)
                                        .map((opt: any, optIdx: number) => (
                                          <p key={optIdx}>
                                            {opt.optionName} $
                                            {opt.price.toFixed(2)}
                                          </p>
                                        ))}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          {/* Badge de estado */}
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(dish.status)}`}
                            >
                              {getStatusText(dish.status)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="text-xs text-gray-500">
                            Cant: {dish.quantity}
                          </p>
                          <p className="text-base text-black">
                            ${((dish.price + (dish.extra_price || 0)) * dish.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No se encontró información de la orden
                  </p>
                </div>
              )}
            </div>{" "}
            {/* Cierra flex-1 overflow-y-auto */}
            {/* Botón fijado en la parte inferior */}
            <div className="fixed bottom-0 left-0 right-0 mx-4 px-6 z-10">
              <div className="w-full flex gap-3 justify-center pb-6">
                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 rounded-full cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>{" "}
          {/* Cierra bg-white rounded-t-4xl */}
        </div>{" "}
        {/* Cierra flex-1 h-full */}
      </div>{" "}
      {/* Cierra px-4 w-full flex-1 */}
    </div>
  );
}
