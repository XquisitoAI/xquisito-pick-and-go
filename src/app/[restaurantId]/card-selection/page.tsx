"use client";

import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { usePayment } from "@/context/PaymentContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Plus, Trash2, Loader2, CircleAlert } from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";
import Loader from "@/components/UI/Loader";
import OrderAnimation from "@/components/UI/OrderAnimation";
import { apiService } from "@/utils/api";
import { calculateCommissions } from "@/utils/commissionCalculator";

export default function CardSelectionPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { state: cartState, clearCart } = useCart();
  const { navigateWithTable, tableNumber } = useTableNavigation();
  const { hasPaymentMethods, paymentMethods, deletePaymentMethod } =
    usePayment();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Obtener monto base del carrito desde el contexto
  const baseAmount = cartState.totalPrice;

  // Debug: Log cart state
  useEffect(() => {
    console.log("🛒 Cart state in card-selection:", {
      items: cartState.items,
      totalItems: cartState.totalItems,
      totalPrice: cartState.totalPrice,
      isLoading: cartState.isLoading,
    });
  }, [cartState]);

  // Estados para propina
  const [tipPercentage, setTipPercentage] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showTotalModal, setShowTotalModal] = useState(false);

  // Estados para tarjetas
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Estado para mostrar animación y guardar orderId e items
  const [showAnimation, setShowAnimation] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedOrderItems, setCompletedOrderItems] = useState<
    typeof cartState.items
  >([]);
  const [completedUserName, setCompletedUserName] = useState<string>("");

  // Calcular propina
  const calculateTipAmount = () => {
    if (customTip && parseFloat(customTip) > 0) {
      return parseFloat(customTip);
    }
    return (baseAmount * tipPercentage) / 100;
  };

  const tipAmount = calculateTipAmount();

  // Usar el calculador de comisiones centralizado
  const commissions = calculateCommissions(baseAmount, tipAmount);
  const {
    ivaTip,
    subtotalForCommission,
    xquisitoCommissionTotal,
    xquisitoCommissionClient,
    xquisitoCommissionRestaurant,
    ivaXquisitoClient,
    ivaXquisitoRestaurant,
    xquisitoClientCharge,
    xquisitoRestaurantCharge,
    totalAmountCharged: totalAmount,
    rates,
  } = commissions;

  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    setCustomTip("");
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setTipPercentage(0);
  };

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    if (hasPaymentMethods && paymentMethods.length > 0) {
      if (!selectedPaymentMethodId) {
        const defaultMethod =
          paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];
        setSelectedPaymentMethodId(defaultMethod.id);
      }
    } else {
      setSelectedPaymentMethodId(null);
    }
    // Solo marcar como cargado cuando el carrito también esté listo
    if (!cartState.isLoading) {
      setIsLoadingInitial(false);
    }
  }, [hasPaymentMethods, paymentMethods, selectedPaymentMethodId, cartState.isLoading]);

  const handlePayment = async (): Promise<void> => {
    if (!tableNumber) {
      alert("No se encontró el número de mesa. Por favor escanea el código QR nuevamente.");
      return;
    }

    if (hasPaymentMethods && !selectedPaymentMethodId) {
      alert("Por favor selecciona una tarjeta de pago");
      return;
    }

    if (!hasPaymentMethods) {
      // Redirigir a agregar tarjeta
      navigateWithTable(
        `/add-card?amount=${totalAmount}&baseAmount=${baseAmount}`
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Configurar token de autenticación si el usuario está logueado
      if (user?.id) {
        const token = await getToken();
        if (token) {
          apiService.setAuthToken(token);
          console.log("🔑 Auth token configured for payment:", {
            userId: user.id,
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...'
          });
        } else {
          console.warn("⚠️ User is logged in but no token available");
        }
      } else {
        console.log("👥 No user logged in, will process as guest");
      }

      // Paso 1: Procesar pago con endpoint existente
      const paymentData = {
        paymentMethodId: selectedPaymentMethodId!,
        amount: totalAmount,
        currency: "MXN",
        description: `Pago Mesa ${tableNumber} - ${user?.fullName || "Invitado"}`,
        orderId: `order-${Date.now()}`,
        tableNumber: tableNumber,
        restaurantId,
      };

      console.log("💳 Processing payment:", paymentData);

      const paymentResult = await apiService.processPayment(paymentData);

      if (!paymentResult.success) {
        throw new Error(
          paymentResult.error?.message || "Error al procesar el pago"
        );
      }

      console.log("✅ Payment successful:", paymentResult);

      let customerPhone: string | null = null;

      if (user?.id) {
        try {
          const userResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`
          );

          if (userResponse.ok) {
            const userResult = await userResponse.json();
            if (userResult.success && userResult.user) {
              customerPhone = userResult.user.phone || null;
            }
          }
        } catch (error) {
          console.warn("Could not fetch user phone:", error);
        }
      }

      // Paso 3: Crear dish orders individuales para cada item del carrito
      const customerName =
        user?.fullName ||
        user?.firstName ||
        cartState.userName ||
        "Invitado";
      const customerEmail = user?.emailAddresses?.[0]?.emailAddress || null;

      let firstTapOrderId: string | null = null;

      console.log("📦 Creating dish orders for all items...");

      // Obtener clerk_user_id (puede ser el ID de Clerk o el guest_id)
      const clerkUserId = user?.id
        ? user.id
        : typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      // Validar que hay items en el carrito
      if (!cartState.items || cartState.items.length === 0) {
        throw new Error("El carrito está vacío");
      }

      console.log("📦 Cart items to process:", cartState.items);

      // Crear un dish order por cada item del carrito
      for (const item of cartState.items) {
        // Preparar images - filtrar solo strings válidos
        const images = item.images && Array.isArray(item.images) && item.images.length > 0
          ? item.images.filter(img => img && typeof img === 'string')
          : [];

        // Preparar custom_fields
        const customFields = item.customFields && Array.isArray(item.customFields) && item.customFields.length > 0
          ? item.customFields
          : null;

        const dishOrderData: any = {
          item: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          clerk_user_id: clerkUserId,
          images: images,  // Array de strings
          custom_fields: customFields,  // JSONB o null
          extra_price: item.extraPrice || 0,
        };

        console.log("Creating dish order:", dishOrderData);

        const dishOrderResult = await apiService.createDishOrder(
          restaurantId,
          tableNumber,
          dishOrderData
        );

        if (!dishOrderResult.success) {
          console.error("❌ Failed to create dish order:", dishOrderResult);
          throw new Error(
            dishOrderResult.error?.message || "Error al crear el dish order"
          );
        }

        console.log("✅ Dish order created - Full response:", dishOrderResult);
        console.log("✅ Dish order data:", dishOrderResult.data);

        // Guardar el tap_order_id del primer dish order
        // El backend envuelve la respuesta: { success, data: { success, data: { tap_order_id } } }
        if (!firstTapOrderId) {
          firstTapOrderId =
            dishOrderResult.data?.data?.tap_order_id ||
            dishOrderResult.data?.tap_order_id ||
            dishOrderResult.data?.data?.id ||
            dishOrderResult.data?.id ||
            null;
          console.log("📝 First tap_order_id captured:", firstTapOrderId);
        }
      }

      // Paso 4: Actualizar el payment status y order status
      if (firstTapOrderId) {
        // Actualizar payment status a 'paid'
        const paymentStatusResult = await apiService.updatePaymentStatus(
          firstTapOrderId,
          "paid"
        );

        if (!paymentStatusResult.success) {
          console.warn(
            "⚠️ Failed to update payment status:",
            paymentStatusResult.error
          );
        } else {
          console.log("✅ Payment status updated to 'paid'");
        }

        // Actualizar order status a 'completed'
        const orderStatusResult = await apiService.updateOrderStatus(
          firstTapOrderId,
          "completed"
        );

        if (!orderStatusResult.success) {
          console.warn(
            "⚠️ Failed to update order status:",
            orderStatusResult.error
          );
        } else {
          console.log("✅ Order status updated to 'completed'");
        }

        // Paso 5: Registrar transacción para trazabilidad
        if (selectedPaymentMethodId) {
          try {
            const xquisitoRateApplied = subtotalForCommission > 0
              ? (xquisitoCommissionTotal / subtotalForCommission) * 100
              : 0;

            await apiService.recordPaymentTransaction({
              payment_method_id: selectedPaymentMethodId,
              restaurant_id: parseInt(restaurantId),
              id_table_order: null,
              id_tap_orders_and_pay: firstTapOrderId,
              base_amount: baseAmount,
              tip_amount: tipAmount,
              iva_tip: ivaTip,
              xquisito_commission_total: xquisitoCommissionTotal,
              xquisito_commission_client: xquisitoCommissionClient,
              xquisito_commission_restaurant: xquisitoCommissionRestaurant,
              iva_xquisito_client: ivaXquisitoClient,
              iva_xquisito_restaurant: ivaXquisitoRestaurant,
              xquisito_client_charge: xquisitoClientCharge,
              xquisito_restaurant_charge: xquisitoRestaurantCharge,
              xquisito_rate_applied: xquisitoRateApplied,
              total_amount_charged: totalAmount,
              subtotal_for_commission: subtotalForCommission,
              currency: "MXN",
            });
            console.log("✅ Payment transaction recorded successfully");
          } catch (transactionError) {
            console.error("❌ Error recording payment transaction:", transactionError);
            // Don't throw - continue with payment flow even if transaction recording fails
          }
        }
      }

      // Guardar datos antes de limpiar el carrito
      setCompletedOrderItems([...cartState.items]);
      // Obtener nombre del usuario (de Clerk si está loggeado, o del estado si es guest)
      const userName =
        user?.firstName || user?.fullName || cartState.userName || "Usuario";
      setCompletedUserName(userName);

      // Limpiar el carrito después de completar la orden
      await clearCart();
      console.log("🧹 Cart cleared after successful order");

      // Guardar orderId y mostrar animación
      setCompletedOrderId(firstTapOrderId);
      setShowAnimation(true);
    } catch (error) {
      console.error("Payment/Order error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCard = (): void => {
    navigateWithTable(
      `/add-card?amount=${totalAmount}&baseAmount=${baseAmount}&scan=true`
    );
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
      return;
    }

    setDeletingCardId(paymentMethodId);
    try {
      await deletePaymentMethod(paymentMethodId);
    } catch (error) {
      alert("Error al eliminar la tarjeta. Intenta de nuevo.");
    } finally {
      setDeletingCardId(null);
    }
  };

  if (isLoadingInitial) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack />

      <div className="px-4 w-full fixed bottom-0 left-0 right-0">
        <div className="flex-1 flex flex-col relative">
          <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
            <div className="py-6 px-8 flex flex-col justify-center">
              <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                Selecciona tu método de pago
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8">
            {/* Resumen del pedido */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-black font-medium">Subtotal</span>
                <span className="text-black font-medium">
                  ${baseAmount.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Selección de propina */}
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-black font-medium">Propina</span>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 10, 15, 20].map((percentage) => (
                    <button
                      key={percentage}
                      onClick={() => handleTipPercentage(percentage)}
                      className={`py-1 rounded-full border border-[#8e8e8e]/40 text-black transition-colors cursor-pointer ${
                        tipPercentage === percentage
                          ? "bg-[#eab3f4] text-white"
                          : "bg-[#f9f9f9] hover:border-gray-400"
                      }`}
                    >
                      {percentage === 0 ? "0%" : `${percentage}%`}
                    </button>
                  ))}
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
                        $
                      </span>
                      <input
                        type="number"
                        value={customTip}
                        onChange={(e) => handleCustomTipChange(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-6 pr-1 py-1 border border-[#8e8e8e]/40 rounded-full focus:outline-none focus:ring focus:ring-gray-400 focus:border-transparent text-black"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {tipAmount > 0 && (
                <div className="flex justify-end items-center text-sm">
                  <span className="text-[#eab3f4] font-medium">
                    +${tipAmount.toFixed(2)} MXN
                  </span>
                </div>
              )}
            </div>

            {/* Comisión e IVA */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center border-t pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-black font-medium text-lg">
                    Total a pagar
                  </span>
                  <CircleAlert
                    className="size-4 cursor-pointer text-gray-500"
                    strokeWidth={2.3}
                    onClick={() => setShowTotalModal(true)}
                  />
                </div>
                <span className="font-medium text-black text-lg">
                  ${totalAmount.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Métodos de pago guardados */}
            {hasPaymentMethods && paymentMethods.length > 0 && (
              <div className="mb-4">
                <h3 className="text-black font-medium mb-3">Métodos de pago</h3>
                <div className="space-y-2.5">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center py-1.5 px-5 pl-10 border rounded-full transition-colors ${
                        selectedPaymentMethodId === method.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-black/50 bg-[#f9f9f9]"
                      }`}
                    >
                      <div
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className="flex items-center justify-center gap-3 mx-auto cursor-pointer"
                      >
                        <div>{getCardTypeIcon(method.cardBrand)}</div>
                        <div>
                          <p className="text-black">
                            **** **** **** {method.lastFourDigits}
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`w-4 h-4 rounded-full border-2 cursor-pointer ${
                          selectedPaymentMethodId === method.id
                            ? "border-teal-500 bg-teal-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedPaymentMethodId === method.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteCard(method.id)}
                        disabled={deletingCardId === method.id}
                        className="pl-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Eliminar tarjeta"
                      >
                        {deletingCardId === method.id ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <Trash2 className="size-5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón agregar tarjeta */}
            <div className="mb-4">
              <button
                onClick={handleAddCard}
                className="border border-black/50 flex justify-center items-center gap-1 w-full text-black py-3 rounded-full cursor-pointer transition-colors bg-[#f9f9f9] hover:bg-gray-100"
              >
                <Plus className="size-5" />
                Agregar método de pago
              </button>
            </div>

            {/* Botón de pago */}
            <button
              onClick={handlePayment}
              disabled={
                isProcessing || (hasPaymentMethods && !selectedPaymentMethodId)
              }
              className={`w-full text-white py-3 rounded-full cursor-pointer transition-colors ${
                isProcessing || (hasPaymentMethods && !selectedPaymentMethodId)
                  ? "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#34808C] to-[#173E44]"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Procesando pago...</span>
                </div>
              ) : hasPaymentMethods && !selectedPaymentMethodId ? (
                "Selecciona una tarjeta"
              ) : (
                "Pagar y ordenar"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de resumen del total */}
      {showTotalModal && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTotalModal(false)}
          ></div>
          <div className="relative bg-white rounded-t-4xl w-full mx-4">
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg font-semibold text-black">
                  Resumen del total
                </h3>
                <button
                  onClick={() => setShowTotalModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-black mb-4">
                El total se obtiene de la suma de:
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">+ Consumo</span>
                  <span className="text-black font-medium">
                    ${baseAmount.toFixed(2)} MXN
                  </span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Propina</span>
                    <span className="text-black font-medium">
                      ${tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
                {xquisitoClientCharge > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Comisión de servicio</span>
                    <span className="text-black font-medium">
                      ${xquisitoClientCharge.toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animación de orden completada */}
      {showAnimation && (
        <OrderAnimation
          userName={completedUserName}
          orderedItems={completedOrderItems}
          onContinue={() => {
            navigateWithTable(
              `/order-view?orderId=${completedOrderId}&success=true`
            );
          }}
        />
      )}
    </div>
  );
}
