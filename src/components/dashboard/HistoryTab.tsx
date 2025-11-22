"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, ChevronRight, X, Calendar, Utensils } from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";

interface OrderHistoryItem {
  orderType?: "flex-bill" | "tap-order-and-pay" | "pick-and-go"; // Tipo de orden
  dishOrderId: number;
  item: string;
  quantity: number;
  price: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  images: string[];
  customFields: any;
  extraPrice: number;
  createdAt: string;
  tableNumber: number;
  tableOrderId: number;
  tableOrderStatus: string;
  tableOrderDate: string;
  restaurantId: number | null;
  restaurantName: string;
  restaurantLogo: string | null;
  // Payment method info
  paymentMethodId?: number | null;
  paymentCardLastFour?: string | null;
  paymentCardType?: string | null;
  paymentCardBrand?: string | null;
}

export default function HistoryTab() {
  const { user } = useUser();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // Bloquear scroll cuando el modal está abierto
  useEffect(() => {
    if (selectedOrderDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedOrderDetails]);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}/order-history`
        );

        if (!response.ok) {
          throw new Error("Error al cargar el historial");
        }

        const data = await response.json();
        setOrders(data.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderHistory();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 md:py-16 lg:py-20">
        <Loader2 className="size-8 md:size-10 lg:size-12 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-500 text-base md:text-lg lg:text-xl">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl md:text-7xl lg:text-8xl mb-4 md:mb-5 lg:mb-6">
            📋
          </div>
          <p className="text-gray-500 text-base md:text-lg lg:text-xl">
            No tienes pedidos aún
          </p>
        </div>
      </div>
    );
  }

  // Las órdenes ya vienen agrupadas por transacción desde el backend
  // Cada orden tiene sus platillos en el array "dishes"
  const groupedOrders = orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      <h1 className="text-gray-700 text-xl md:text-2xl lg:text-3xl mb-3 md:mb-4 lg:mb-5">
        Ordenes previas
      </h1>
      <div className="space-y-3 md:space-y-4 lg:space-y-5">
        {groupedOrders.map((order: any) => {
          return (
            <div
              key={order.transactionId}
              onClick={() => {
                setSelectedOrderDetails(order);
              }}
              className="border border-gray-200 rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 cursor-pointer"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 md:gap-4 lg:gap-5">
                  {/* Logo */}
                  {order.restaurantLogo ? (
                    <img
                      src={order.restaurantLogo}
                      alt={order.restaurantName}
                      className="size-16 md:size-20 lg:size-24 object-cover rounded-lg md:rounded-xl"
                    />
                  ) : (
                    <div className="size-16 md:size-20 lg:size-24 bg-teal-100 rounded-lg md:rounded-xl flex items-center justify-center">
                      <span className="text-2xl md:text-3xl lg:text-4xl">
                        🍽️
                      </span>
                    </div>
                  )}

                  {/* Order Info */}
                  <div className="flex-1">
                    <h3 className="text-black mb-1 text-base md:text-lg lg:text-xl">
                      {order.restaurantName}
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg text-gray-600 mb-1">
                      {order.totalQuantity}{" "}
                      {order.totalQuantity === 1 ? "articulo" : "articulos"} - $
                      {order.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs md:text-sm lg:text-base text-gray-400">
                      {new Date(order.tableOrderDate).toLocaleDateString(
                        "es-MX",
                        {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                        }
                      )}{" "}
                    </p>
                  </div>
                </div>

                {/* Order Type Badge */}
                <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                  <div className="text-right">
                    <span
                      className={`text-xs md:text-sm lg:text-base px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 rounded-full font-medium truncate ${
                        order.orderType === "tap-order-and-pay"
                          ? "bg-purple-100 text-purple-700"
                          : order.orderType === "pick-and-go"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {order.orderType === "tap-order-and-pay"
                        ? "Tap Order & Pay"
                        : order.orderType === "pick-and-go"
                        ? "Pick & Go"
                        : "Flex Bill"}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedOrderDetails && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs bg-opacity-50 z-999 flex items-center justify-center"
          onClick={() => {
            setSelectedOrderDetails(null);
          }}
        >
          <div
            className="bg-white w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl overflow-y-auto z-999"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  setSelectedOrderDetails(null);
                }}
                className="p-2 md:p-3 lg:p-4 hover:bg-gray-100 rounded-full cursor-pointer transition-colors justify-end flex items-end mt-3 md:mt-4 lg:mt-5 mr-3 md:mr-4 lg:mr-5"
              >
                <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-gray-600" />
              </button>
            </div>
            {/* Header */}
            <div className="px-6 md:px-8 lg:px-10 flex items-center justify-center mb-4 md:mb-5 lg:mb-6">
              <div className="flex flex-col justify-center items-center gap-3 md:gap-4 lg:gap-5">
                {selectedOrderDetails.restaurantLogo ? (
                  <img
                    src={selectedOrderDetails.restaurantLogo}
                    alt={selectedOrderDetails.restaurantName}
                    className="size-20 md:size-24 lg:size-28 object-cover rounded-lg md:rounded-xl"
                  />
                ) : (
                  <div className="size-20 md:size-24 lg:size-28 bg-teal-100 rounded-lg md:rounded-xl flex items-center justify-center">
                    <span className="text-2xl md:text-3xl lg:text-4xl">🍽️</span>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-xl md:text-2xl lg:text-3xl text-black">
                    {selectedOrderDetails.restaurantName}
                  </h2>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600">
                    Mesa {selectedOrderDetails.tableNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 lg:px-10 space-y-4 md:space-y-5 lg:space-y-6">
              {/* Order Info */}
              <div className="border-t border-[#8e8e8e] pt-4 md:pt-5 lg:pt-6">
                <h3 className="font-medium text-xl md:text-2xl lg:text-3xl text-black mb-3 md:mb-4 lg:mb-5">
                  Tu orden
                </h3>
                <div className="space-y-2 md:space-y-3 lg:space-y-4">
                  <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-gray-700">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-gray-700" />
                    <span className="text-sm md:text-base lg:text-lg">
                      {new Date(
                        selectedOrderDetails.tableOrderDate
                      ).toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-gray-700">
                    <Utensils className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-gray-700" />
                    <span className="text-sm md:text-base lg:text-lg">
                      Mesa {selectedOrderDetails.tableNumber}
                    </span>
                  </div>
                  {selectedOrderDetails.paymentCardBrand && (
                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-gray-700">
                      {getCardTypeIcon(
                        selectedOrderDetails.paymentCardBrand,
                        "small",
                        45,
                        28
                      )}
                      <span className="text-sm md:text-base lg:text-lg">
                        •••• •••• ••••{" "}
                        {selectedOrderDetails.paymentCardLastFour}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de platillos */}
              <div>
                <h3 className="font-semibold text-black text-base md:text-lg lg:text-xl mb-3 md:mb-4 lg:mb-5 mt-6 md:mt-8 lg:mt-10 pt-4 md:pt-5 lg:pt-6 border-t border-[#8e8e8e]">
                  Platillos Ordenados:
                </h3>
                <div className="space-y-3 md:space-y-4 lg:space-y-5 divide-y divide-[#8e8e8e]/50">
                  {selectedOrderDetails.dishes?.map((dish: any) => (
                    <div
                      key={dish.dishOrderId}
                      className="flex items-start gap-3 md:gap-4 lg:gap-5 pt-3 md:pt-4 lg:pt-5 first:pt-0 pb-3 md:pb-4 lg:pb-5"
                    >
                      {/* Dish Info */}
                      <div className="flex-1">
                        <h4 className="font-medium text-black text-base md:text-lg lg:text-xl capitalize">
                          {dish.item}
                        </h4>
                        <p className="text-xs md:text-sm lg:text-base text-gray-600">
                          Cantidad: {dish.quantity}
                        </p>
                        <p className="text-xs md:text-sm lg:text-base text-gray-600">
                          ${dish.price?.toFixed(2)} MXN
                        </p>
                        {dish.extraPrice > 0 && (
                          <p className="text-xs md:text-sm lg:text-base text-gray-600">
                            + Extras: ${dish.extraPrice?.toFixed(2)} MXN
                          </p>
                        )}
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <p className="font-semibold text-black text-base md:text-lg lg:text-xl">
                          ${dish.totalPrice?.toFixed(2)} MXN
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center border-t border-[#8e8e8e] pt-4 md:pt-5 lg:pt-6 mb-6 md:mb-8 lg:mb-10">
                <span className="text-xl md:text-2xl lg:text-3xl font-medium text-black">
                  Total
                </span>
                <span className="text-xl md:text-2xl lg:text-3xl font-medium text-black">
                  ${selectedOrderDetails.totalAmount?.toFixed(2)} MXN
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
