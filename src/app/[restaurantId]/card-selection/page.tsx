"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/hooks/useNavigation";
import { usePayment } from "@/context/PaymentContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGuest } from "@/context/GuestContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { Plus, Trash2, Loader2, CircleAlert, X } from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";
import { useBranch } from "@/context/BranchContext";
import OrderAnimation from "@/components/UI/OrderAnimation";
import { pickAndGoService } from "@/services/pickandgo.service";
import { paymentService } from "@/services/payment.service";
import { calculateCommissions } from "@/utils/commissionCalculator";
import { usePaymentProvider } from "@/hooks/usePaymentProvider";

export default function CardSelectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;
  const { provider, isLoadingProvider } = usePaymentProvider(restaurantId);

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  // Tip y pickup time vienen de la página anterior vía URL params
  const tipAmountFromParam = parseFloat(searchParams.get("tipAmount") || "0");
  const scheduledPickupTime = searchParams.get("scheduledPickupTime") || null;

  const {
    state: cartState,
    clearCart,
    orderNotes,
    updateOrderNotes,
  } = useCart();
  const { navigateWithRestaurantId, branchNumber } = useNavigation();
  const { paymentMethods, deletePaymentMethod } = usePayment();
  const { user, profile } = useAuth();
  const { guestId } = useGuest();
  const { selectedBranchNumber } = useBranch();

  // Tarjeta por defecto del sistema para todos los usuarios
  /*const defaultSystemCard = {
    id: "system-default-card",
    lastFourDigits: "1234",
    cardBrand: "amex",
    cardType: "credit",
    isDefault: true,
    isSystemCard: true,
  };*/

  // Obtener monto base del carrito desde el contexto
  const baseAmount = cartState.totalPrice;

  // Validación de compra mínima
  const MINIMUM_AMOUNT = 20;

  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMSI, setSelectedMSI] = useState<number | null>(null);
  const [applePayReady, setApplePayReady] = useState(false);
  const [applePayUnavailable, setApplePayUnavailable] = useState(false);
  const [isApplePayProcessing, setIsApplePayProcessing] = useState(false);
  const [applePayPaymentId, setApplePayPaymentId] = useState<string | null>(
    null,
  );

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

  const tipAmount = tipAmountFromParam;

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

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    // Siempre hay al menos la tarjeta del sistema disponible
    if (!selectedPaymentMethodId && paymentMethods.length > 0) {
      const defaultMethod =
        paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0];
      setSelectedPaymentMethodId(defaultMethod.id);
      console.log("💳 Auto-seleccionando tarjeta:", defaultMethod.id);
    }
    // Solo marcar como cargado cuando el carrito también esté listo
    if (!cartState.isLoading) {
      setIsLoadingInitial(false);
    }
  }, [paymentMethods.length, selectedPaymentMethodId, cartState.isLoading]);

  // Cargar el SDK de Ecart Pay para Apple Pay
  useEffect(() => {
    if (!isLoadingProvider) {
      console.log(
        `[PaymentProvider] Proveedor activo: ${provider ?? "null"} (restaurantId: ${restaurantId})`,
      );
      if (provider === "clip") {
        console.warn(
          "[PaymentProvider] Clip seleccionado — flujo no implementado aún, usando eCartPay como fallback",
        );
      }
    }
  }, [provider, isLoadingProvider, restaurantId]);

  // Verificar soporte de Apple Pay y cargar el SDK solo si aplica
  useEffect(() => {
    if (isLoadingProvider) return; // esperar a que se resuelva el proveedor

    // Apple Pay solo aplica cuando el proveedor es eCartPay (o null como fallback)
    if (provider !== null && provider !== "ecartpay") return;

    const ApplePaySession = (window as any).ApplePaySession;
    if (!ApplePaySession || !ApplePaySession.canMakePayments?.()) {
      // Dispositivo/navegador no soporta Apple Pay — mantener oculto
      return;
    }

    // Dispositivo compatible y proveedor es eCartPay — revelar sección y cargar SDK
    setApplePayUnavailable(false);
    const src =
      process.env.NEXT_PUBLIC_ENV === "production"
        ? "https://ecartpay.com/sdk/pay.js"
        : "https://sandbox.ecartpay.com/sdk/pay.js";
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [provider, isLoadingProvider]);

  const handleInitiatePayment = (): void => {
    if (!selectedPaymentMethodId) {
      alert("Por favor selecciona una tarjeta de pago");
      return;
    }

    // Guardar datos antes de mostrar animación
    setCompletedOrderItems([...cartState.items]);
    const userName = profile?.firstName || cartState.userName || "Usuario";
    setCompletedUserName(userName);

    // Mostrar animación inmediatamente (sin procesar pago aún)
    setShowAnimation(true);
  };

  const handleCancelPayment = () => {
    console.log("❌ Payment cancelled by user");
    setShowAnimation(false);
    setCompletedOrderItems([]);
    setCompletedUserName("");
  };

  const getApplePaySDK = () =>
    new Promise<any>((resolve) => {
      if ((window as any).Pay?.ApplePay) {
        return resolve((window as any).Pay.ApplePay);
      }

      const interval = setInterval(() => {
        if ((window as any).Pay?.ApplePay) {
          clearInterval(interval);
          resolve((window as any).Pay.ApplePay);
        }
      }, 100);
    });

  // Inicializar Apple Pay SDK cuando los datos estén listos
  const initApplePay = useCallback(async () => {
    if (typeof window === "undefined" || !totalAmount) return;

    try {
      // Crear orden en Ecart Pay para obtener orderId
      const orderResult = await paymentService.createApplePayOrder({
        amount: totalAmount,
        currency: "MXN",
        tableNumber: undefined,
        restaurantId: restaurantId?.toString(),
      });

      const appleOrderId =
        (orderResult as any).orderId ?? orderResult.data?.orderId;
      if (!orderResult.success || !appleOrderId) {
        console.warn("⚠️ Apple Pay: no se pudo crear la orden", orderResult);
        return;
      }

      const applePaySDK = await getApplePaySDK();
      if (!applePaySDK) {
        console.warn("⚠️ Apple Pay SDK no disponible en window.Pay.ApplePay");
        return;
      }

      console.log("ORDER RESULT:", orderResult);

      // Register listeners before render (SDK dispatches to window, not returned object)
      applePaySDK.on("ready", () => {
        console.log("✅ Apple Pay botón listo");
        setApplePayReady(true);
      });
      applePaySDK.on("unavailable", () => {
        console.log("ℹ️ Apple Pay no disponible en este dispositivo/cuenta");
        setApplePayUnavailable(true);
      });
      applePaySDK.on("cancel", () => {
        console.log("🚫 Apple Pay cancelado por el usuario");
        setIsApplePayProcessing(false);
      });
      applePaySDK.on("error", (err: any) => {
        console.error("❌ Apple Pay error:", err);
        setIsApplePayProcessing(false);
        setApplePayUnavailable(true);
      });
      applePaySDK.on("success", async () => {
        console.log("💳 Apple Pay: pago autorizado");
        const applePayId = `apple-pay-${Date.now()}`;
        setApplePayPaymentId(applePayId);
        setIsApplePayProcessing(true);
        setCompletedOrderItems([...cartState.items]);
        const userName = profile?.firstName || cartState.userName || "Usuario";
        setCompletedUserName(userName);
        setShowAnimation(true);
      });

      applePaySDK.render({
        container: "#apple-pay-container",
        orderId: appleOrderId,
        amount: totalAmount,
        currency: "MXN",
        countryCode: "MX",
        supportedNetworks: ["visa", "masterCard", "amex"],
        merchantCapabilities: ["supports3DS"],
        buttonStyle: "black",
        buttonType: "pay",
      });
    } catch (err) {
      console.error("❌ Error inicializando Apple Pay:", err);
    }
  }, [totalAmount, restaurantId, cartState.items, cartState.userName, profile]);

  useEffect(() => {
    if (!isLoadingInitial && totalAmount > 0) {
      initApplePay();
    }
  }, [isLoadingInitial, totalAmount, initApplePay]);

  const handleConfirmPayment = async (): Promise<void> => {
    // Esta función se ejecuta después de que expira el período de cancelación
    if (!selectedPaymentMethodId) {
      console.error("Missing required data for payment confirmation");
      setShowAnimation(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Si se seleccionó la tarjeta del sistema, omitir EcartPay y procesar directamente
      if (selectedPaymentMethodId === "system-default-card") {
        console.log(
          "💳 Sistema: Procesando pago con tarjeta del sistema (sin EcartPay)",
        );

        // No necesitamos configurar token para tarjeta del sistema
        // La autenticación ya está gestionada por el AuthContext

        // Continuar con la creación directa de la orden Pick & Go
        let customerPhone: string | null = null;

        if (user?.id && user?.phone) {
          customerPhone = user.phone;
        }

        const customerName =
          profile?.firstName || cartState.userName || "Invitado";
        const customerEmail = user?.email || null;

        console.log("📦 Creating optimized Pick & Go order flow...");

        const userId = user?.id || guestId || null;

        if (!cartState.items || cartState.items.length === 0) {
          throw new Error("El carrito está vacío");
        }

        console.log("📦 Cart items to process:", cartState.items);

        // PASO 1: Crear la orden Pick & Go PRIMERO
        console.log("🚀 Creating Pick & Go order first...");

        const pickAndGoOrderData = {
          clerk_user_id: userId,
          customer_name: customerName,
          customer_email: customerEmail || undefined,
          customer_phone: customerPhone || undefined,
          restaurant_id: parseInt(restaurantId),
          branch_number: selectedBranchNumber || branchNumber || 1,
          total_amount: totalAmount,
          session_data: {
            source: "card-selection",
            payment_method_id: null, // null para tarjeta del sistema
            total_amount: totalAmount,
            base_amount: baseAmount,
            tip_amount: tipAmount,
          },
          prep_metadata: {
            estimated_minutes: 25,
            items_count: cartState.items.length,
            scheduled_pickup_time: scheduledPickupTime,
          },
          order_notes: orderNotes.trim() || null,
        };

        const pickAndGoOrderResult =
          await pickAndGoService.createOrder(pickAndGoOrderData);
        updateOrderNotes("");

        if (!pickAndGoOrderResult.success || !pickAndGoOrderResult.data) {
          console.error(
            "❌ Failed to create Pick & Go order:",
            pickAndGoOrderResult,
          );
          const errorMessage =
            typeof pickAndGoOrderResult.error === "string"
              ? pickAndGoOrderResult.error
              : (pickAndGoOrderResult.error as any)?.message ||
                "Error al crear la orden Pick & Go";
          throw new Error(errorMessage);
        }

        const pickAndGoOrderId = pickAndGoOrderResult.data.id;
        console.log(
          "✅ Pick & Go order created successfully:",
          pickAndGoOrderId,
        );

        // PASO 2: Crear dish orders vinculados a la orden Pick & Go
        for (const item of cartState.items) {
          const images =
            item.images && Array.isArray(item.images) && item.images.length > 0
              ? item.images.filter((img) => img && typeof img === "string")
              : [];

          const customFields =
            item.customFields &&
            Array.isArray(item.customFields) &&
            item.customFields.length > 0
              ? item.customFields
              : null;

          const dishOrderData: any = {
            item: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            userId: user?.id || null, // Solo enviar userId si es un usuario autenticado
            guestId: guestId || null,
            guestName: customerName,
            images: images,
            customFields: customFields,
            extraPrice: item.extraPrice || 0,
            pickAndGoOrderId: pickAndGoOrderId,
            menuItemId: item.id,
            specialInstructions: item.specialInstructions || null,
          };

          console.log("Creating dish order:", dishOrderData);

          const dishOrderResult = await pickAndGoService.createDishOrder(
            pickAndGoOrderId,
            dishOrderData,
          );

          if (!dishOrderResult.success) {
            console.error("❌ Failed to create dish order:", dishOrderResult);
            throw new Error("Error al crear el dish order");
          }

          console.log(
            "✅ Dish order created - Full response:",
            dishOrderResult,
          );
        }

        // Actualizar payment status y order status
        const paymentStatusResult = await pickAndGoService.updatePaymentStatus(
          pickAndGoOrderId,
          "paid",
        );

        if (!paymentStatusResult.success) {
          console.warn(
            "⚠️ Failed to update Pick & Go payment status:",
            paymentStatusResult.error,
          );
        } else {
          console.log("✅ Pick & Go payment status updated to 'paid'");
        }

        const orderStatusResult = await pickAndGoService.updateOrderStatus(
          pickAndGoOrderId,
          "confirmed",
        );

        if (!orderStatusResult.success) {
          console.warn(
            "⚠️ Failed to update Pick & Go order status:",
            orderStatusResult.error,
          );
        } else {
          console.log("✅ Pick & Go order status updated to 'confirmed'");
        }

        // Registrar transacción con payment_method_id null para la tarjeta del sistema
        try {
          const xquisitoRateApplied =
            subtotalForCommission > 0
              ? (xquisitoCommissionTotal / subtotalForCommission) * 100
              : 0;

          await pickAndGoService.recordPaymentTransaction({
            payment_method_id: null, // null para tarjeta del sistema
            restaurant_id: parseInt(restaurantId),
            id_table_order: null,
            id_tap_orders_and_pay: null,
            pick_and_go_order_id: pickAndGoOrderId,
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
          });
          console.log("✅ Payment transaction recorded successfully");
        } catch (transactionError) {
          console.error(
            "❌ Error recording payment transaction:",
            transactionError,
          );
        }

        // Preparar datos para guardar
        const userName = profile?.firstName || cartState.userName || "Usuario";
        const paymentDetailsForSuccess = {
          orderId: pickAndGoOrderId,
          paymentId: `pick-go-${pickAndGoOrderId}`,
          transactionId: pickAndGoOrderId,
          totalAmountCharged: totalAmount,
          amount: totalAmount,
          baseAmount: baseAmount,
          tipAmount: tipAmount,
          xquisitoCommissionClient: xquisitoCommissionClient || 0,
          ivaXquisitoClient: ivaXquisitoClient || 0,
          xquisitoCommissionTotal: xquisitoCommissionTotal || 0,
          userName: userName,
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          cardLast4: "1234",
          cardBrand: "visa",
          orderStatus: "confirmed",
          paymentStatus: "paid",
          createdAt: new Date().toISOString(),
          dishOrders: cartState.items.map((item) => ({
            dish_order_id: `item-${item.id}-${Date.now()}`,
            item: item.name,
            quantity: item.quantity || 1,
            price: item.price,
            extra_price: item.extraPrice || 0,
            total_price:
              item.price * (item.quantity || 1) + (item.extraPrice || 0),
            guest_name: userName,
            custom_fields: item.customFields || null,
            image_url: item.images?.[0] || null,
          })),
          restaurantId: parseInt(restaurantId),
          paymentMethodId: null,
          scheduledPickupTime: scheduledPickupTime,
          timestamp: Date.now(),
        };

        console.log(
          "💾 Saving payment details for payment-success:",
          paymentDetailsForSuccess,
        );
        localStorage.setItem(
          "xquisito-completed-payment",
          JSON.stringify(paymentDetailsForSuccess),
        );

        const uniqueKey = `xquisito-payment-success-${pickAndGoOrderId}`;
        sessionStorage.setItem(
          uniqueKey,
          JSON.stringify(paymentDetailsForSuccess),
        );

        // Guardar referencia al key actual para fácil acceso
        sessionStorage.setItem("xquisito-current-payment-key", uniqueKey);

        // IMPORTANTE: Guardar el orderId directamente en sessionStorage para la navegación
        sessionStorage.setItem("xquisito-current-order-id", pickAndGoOrderId);

        // Limpiar el carrito después de completar la orden
        await clearCart();
        console.log("🧹 Cart cleared after successful order");

        // Guardar orderId para la navegación después de la animación
        setCompletedOrderId(pickAndGoOrderId);
        console.log(
          "✅ Order processing completed, orderId saved:",
          pickAndGoOrderId,
        );

        // NO redirigir aquí - dejar que la animación continúe
        // El timer navigateTimer (9s) en OrderAnimation se encargará de la redirección
        return;
      }

      // Para tarjetas reales, continuar con el flujo normal de EcartPay
      // La autenticación ya está gestionada por el AuthContext
      console.log("🔑 User authenticated:", {
        userId: user?.id,
        hasProfile: !!profile,
      });

      // Paso 1: Procesar pago con endpoint existente
      const paymentData = {
        paymentMethodId: selectedPaymentMethodId!,
        amount: totalAmount,
        currency: "MXN",
        description: `Pick & Go Order - ${profile?.firstName || cartState.userName || "Invitado"}`,
        orderId: `order-${Date.now()}`,
        tableNumber: "PICKUP", // Pick & Go usa un valor especial
        restaurantId,
        installments: selectedMSI || undefined,
      };

      console.log("💳 Processing payment:", paymentData);

      const paymentResult = await paymentService.processPayment(paymentData);

      if (!paymentResult.success) {
        const errorMsg =
          (paymentResult as any).error?.message || "Error al procesar el pago";
        throw new Error(errorMsg);
      }

      console.log("✅ Payment successful:", paymentResult);

      let customerPhone: string | null = null;

      if (user?.id && user?.phone) {
        customerPhone = user.phone;
      }

      // Paso 3: Crear dish orders individuales para cada item del carrito
      const customerName =
        profile?.firstName || cartState.userName || "Invitado";
      const customerEmail = user?.email || null;

      console.log("📦 Creating optimized Pick & Go order flow...");

      // Obtener user_id (puede ser el ID de Supabase Auth o el guest_id)
      const userId = user?.id || guestId || null;

      // Validar que hay items en el carrito
      if (!cartState.items || cartState.items.length === 0) {
        throw new Error("El carrito está vacío");
      }

      console.log("📦 Cart items to process:", cartState.items);

      // PASO 3.1: Crear la orden Pick & Go PRIMERO
      console.log("🚀 Creating Pick & Go order first...");

      const pickAndGoOrderData = {
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        restaurant_id: parseInt(restaurantId),
        branch_number: selectedBranchNumber || branchNumber || 1,
        total_amount: totalAmount,
        session_data: {
          source: "card-selection",
          payment_method_id: selectedPaymentMethodId,
          total_amount: totalAmount,
          base_amount: baseAmount,
          tip_amount: tipAmount,
        },
        prep_metadata: {
          estimated_minutes: 25,
          items_count: cartState.items.length,
          scheduled_pickup_time: scheduledPickupTime,
        },
        order_notes: orderNotes.trim() || null,
      };

      const pickAndGoOrderResult =
        await pickAndGoService.createOrder(pickAndGoOrderData);
      updateOrderNotes("");

      if (!pickAndGoOrderResult.success || !pickAndGoOrderResult.data) {
        console.error(
          "❌ Failed to create Pick & Go order:",
          pickAndGoOrderResult,
        );
        const errorMessage =
          typeof pickAndGoOrderResult.error === "string"
            ? pickAndGoOrderResult.error
            : (pickAndGoOrderResult.error as any)?.message ||
              "Error al crear la orden Pick & Go";
        throw new Error(errorMessage);
      }

      const pickAndGoOrderId = pickAndGoOrderResult.data.id;
      console.log("✅ Pick & Go order created successfully:", pickAndGoOrderId);

      // PASO 3.2: Crear dish orders vinculados a la orden Pick & Go
      for (const item of cartState.items) {
        // Preparar images - filtrar solo strings válidos
        const images =
          item.images && Array.isArray(item.images) && item.images.length > 0
            ? item.images.filter((img) => img && typeof img === "string")
            : [];

        // Preparar custom_fields
        const customFields =
          item.customFields &&
          Array.isArray(item.customFields) &&
          item.customFields.length > 0
            ? item.customFields
            : null;

        const dishOrderData: any = {
          item: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          userId: user?.id || null, // Solo enviar userId si es un usuario autenticado
          guestId: guestId || null,
          guestName: customerName,
          images: images, // Array de strings
          customFields: customFields, // JSONB o null
          extraPrice: item.extraPrice || 0,
          pickAndGoOrderId: pickAndGoOrderId, // 🔑 VINCULACIÓN CON PICK & GO ORDER
          menuItemId: item.id,
          specialInstructions: item.specialInstructions || null,
        };

        console.log("Creating dish order:", dishOrderData);

        const dishOrderResult = await pickAndGoService.createDishOrder(
          pickAndGoOrderId,
          dishOrderData,
        );

        if (!dishOrderResult.success) {
          console.error("❌ Failed to create dish order:", dishOrderResult);
          throw new Error("Error al crear el dish order");
        }

        console.log("✅ Dish order created - Full response:", dishOrderResult);
        console.log("✅ Dish order data:", dishOrderResult.data);

        // Solo log del éxito de crear dish order (ya no necesitamos capturar IDs)
        console.log(
          "✅ Dish order created and linked to Pick & Go order:",
          pickAndGoOrderId,
        );
      }

      // Paso 4: Actualizar el payment status y order status de la orden Pick & Go
      console.log("📝 Updating Pick & Go order status...");

      // Actualizar payment status a 'paid'
      const paymentStatusResult = await pickAndGoService.updatePaymentStatus(
        pickAndGoOrderId,
        "paid",
      );

      if (!paymentStatusResult.success) {
        console.warn(
          "⚠️ Failed to update Pick & Go payment status:",
          paymentStatusResult.error,
        );
      } else {
        console.log("✅ Pick & Go payment status updated to 'paid'");
      }

      // Actualizar order status a 'confirmed' (no 'completed' aún, está en preparación)
      const orderStatusResult = await pickAndGoService.updateOrderStatus(
        pickAndGoOrderId,
        "confirmed",
      );

      if (!orderStatusResult.success) {
        console.warn(
          "⚠️ Failed to update Pick & Go order status:",
          orderStatusResult.error,
        );
      } else {
        console.log("✅ Pick & Go order status updated to 'confirmed'");
      }

      // Paso 5: Registrar transacción para trazabilidad
      if (selectedPaymentMethodId) {
        try {
          const xquisitoRateApplied =
            subtotalForCommission > 0
              ? (xquisitoCommissionTotal / subtotalForCommission) * 100
              : 0;

          await pickAndGoService.recordPaymentTransaction({
            payment_method_id: selectedPaymentMethodId,
            restaurant_id: parseInt(restaurantId),
            id_table_order: null,
            id_tap_orders_and_pay: null, // Para Pick & Go no hay tap_orders
            pick_and_go_order_id: pickAndGoOrderId, // Nueva columna para Pick & Go
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
          });
          console.log("✅ Payment transaction recorded successfully");
        } catch (transactionError) {
          console.error(
            "❌ Error recording payment transaction:",
            transactionError,
          );
          // Don't throw - continue with payment flow even if transaction recording fails
        }
      }

      // Preparar y guardar detalles del pago para payment-success
      const userName = profile?.firstName || cartState.userName || "Usuario";
      const paymentDetailsForSuccess = {
        orderId: pickAndGoOrderId,
        paymentId:
          paymentResult.data?.paymentId || `pick-go-${pickAndGoOrderId}`,
        transactionId: paymentResult.data?.transactionId || pickAndGoOrderId,
        totalAmountCharged: totalAmount,
        amount: totalAmount,
        baseAmount: baseAmount,
        tipAmount: tipAmount,
        xquisitoCommissionClient: xquisitoCommissionClient || 0,
        ivaXquisitoClient: ivaXquisitoClient || 0,
        xquisitoCommissionTotal: xquisitoCommissionTotal || 0,
        userName: userName,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        cardLast4:
          paymentMethods.find((pm) => pm.id === selectedPaymentMethodId)
            ?.lastFourDigits || "****",
        cardBrand:
          paymentMethods.find((pm) => pm.id === selectedPaymentMethodId)
            ?.cardBrand || "unknown",
        orderStatus: "confirmed",
        paymentStatus: "paid",
        createdAt: new Date().toISOString(),
        // Transform cart items to dishOrders format expected by payment-success
        dishOrders: cartState.items.map((item) => ({
          dish_order_id: `item-${item.id}-${Date.now()}`,
          item: item.name,
          quantity: item.quantity || 1,
          price: item.price,
          extra_price: item.extraPrice || 0,
          total_price:
            item.price * (item.quantity || 1) + (item.extraPrice || 0),
          guest_name: userName,
          custom_fields: item.customFields || null,
          image_url: item.images?.[0] || null,
        })),
        // Additional metadata
        restaurantId: parseInt(restaurantId),
        paymentMethodId: selectedPaymentMethodId,
        scheduledPickupTime: scheduledPickupTime,
        timestamp: Date.now(),
      };

      // Guardar en localStorage para payment-success
      console.log(
        "💾 Saving payment details for payment-success:",
        paymentDetailsForSuccess,
      );
      localStorage.setItem(
        "xquisito-completed-payment",
        JSON.stringify(paymentDetailsForSuccess),
      );

      // También guardarlo con ID único para evitar conflictos
      const uniqueKey = `xquisito-payment-success-${pickAndGoOrderId}`;
      sessionStorage.setItem(
        uniqueKey,
        JSON.stringify(paymentDetailsForSuccess),
      );

      // Guardar referencia al key actual para fácil acceso
      sessionStorage.setItem("xquisito-current-payment-key", uniqueKey);

      // IMPORTANTE: Guardar el orderId directamente en sessionStorage para la navegación
      sessionStorage.setItem("xquisito-current-order-id", pickAndGoOrderId);

      // Limpiar el carrito después de completar la orden
      await clearCart();
      console.log("🧹 Cart cleared after successful order");

      // Guardar orderId para la navegación después de la animación
      setCompletedOrderId(pickAndGoOrderId);
      console.log(
        "✅ Order processing completed, orderId saved:",
        pickAndGoOrderId,
      );

      // NO redirigir aquí - dejar que la animación continúe
      // El timer navigateTimer (9s) en OrderAnimation se encargará de la redirección
    } catch (error) {
      console.error("Payment/Order error:", error);
      // Limpiar IDs de orden para evitar navegación a payment-success con datos viejos
      sessionStorage.removeItem("xquisito-current-order-id");
      sessionStorage.removeItem("xquisito-current-payment-key");
      setCompletedOrderId(null);
      const errMsg =
        error instanceof Error ? error.message : "Error desconocido";
      setErrorMessage(errMsg);
      // Si hay error, ocultar la animación
      setShowAnimation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCard = (): void => {
    navigateWithRestaurantId(
      `/add-card?amount=${totalAmount}&baseAmount=${baseAmount}&scan=false`,
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

  // Calcular el total a mostrar según la opción MSI seleccionada
  const getDisplayTotal = () => {
    if (selectedMSI === null) {
      return totalAmount;
    }

    // Obtener el tipo de tarjeta seleccionada
    const selectedMethod = paymentMethods.find(
      (pm) => pm.id === selectedPaymentMethodId,
    );
    const cardBrand = selectedMethod?.cardBrand;

    // Configuración de Diferido según el tipo de tarjeta (tasas del portal EcartPay, pre-IVA)
    const msiOptions =
      cardBrand === "amex"
        ? [
            { months: 3, rate: 3.25 },
            { months: 6, rate: 6.25 },
            { months: 9, rate: 8.25 },
            { months: 12, rate: 10.25 },
            { months: 15, rate: 13.25 },
            { months: 18, rate: 15.25 },
            { months: 21, rate: 17.25 },
            { months: 24, rate: 19.25 },
          ]
        : [
            { months: 3, rate: 4.26 },
            { months: 6, rate: 7.3 },
            { months: 9, rate: 8.5 },
            { months: 12, rate: 13.0 },
            { months: 18, rate: 18.25 },
          ];

    // Encontrar la opción seleccionada
    const selectedOption = msiOptions.find((opt) => opt.months === selectedMSI);
    if (!selectedOption) return totalAmount;

    // Calcular total con financiamiento e IVA (fórmula EcartPay: markup sobre monto final)
    return totalAmount / (1 - (selectedOption.rate / 100) * 1.16);
  };

  const displayTotal = getDisplayTotal();

  // Calcular si está bajo el mínimo usando el total con propina, comisiones, etc.
  const isUnderMinimum = totalAmount < MINIMUM_AMOUNT;

  if (isLoadingInitial || isLoadingProvider) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-50">
          <MenuHeaderBack />
        </div>
        <div className="h-20" />

        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
          <div className="flex flex-col relative px-4 md:px-6 lg:px-8 w-full">
            {/* Título skeleton */}
            <div className="bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
              <div className="py-6 px-8 flex flex-col justify-center">
                <div className="h-8 w-3/4 bg-white/20 rounded-full mt-2 mb-6 animate-pulse" />
              </div>
            </div>

            {/* Cuerpo skeleton */}
            <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8 gap-4">
              {/* Subtotal row */}
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse" />
              </div>
              {/* Total row */}
              <div className="flex justify-between items-center border-t pt-3">
                <div className="h-5 w-28 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-5 w-28 bg-gray-200 rounded-full animate-pulse" />
              </div>

              {/* Label métodos de pago */}
              <div className="h-4 w-36 bg-gray-200 rounded-full animate-pulse mt-1" />

              {/* Card skeleton 1 */}
              <div className="h-12 w-full bg-gray-100 rounded-full animate-pulse" />
              {/* Card skeleton 2 */}
              <div className="h-12 w-full bg-gray-100 rounded-full animate-pulse" />

              {/* Botón agregar tarjeta */}
              <div className="h-12 w-full bg-gray-100 rounded-full animate-pulse" />

              {/* Botón pagar */}
              <div className="h-12 w-full bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Animación de orden completada - fuera del contenedor principal para Safari */}
      {showAnimation && (
        <OrderAnimation
          userName={completedUserName}
          orderedItems={completedOrderItems}
          onContinue={() => {
            console.log("🔍 DEBUG - completedOrderId state:", completedOrderId);

            // PRIORIDAD 1: Intentar obtener desde sessionStorage directamente
            let orderId = sessionStorage.getItem("xquisito-current-order-id");

            if (orderId) {
              console.log(
                "✅ Found orderId from sessionStorage (direct):",
                orderId,
              );
            } else {
              // PRIORIDAD 2: Usar el estado si está disponible
              orderId = completedOrderId;

              if (orderId) {
                console.log("✅ Using completedOrderId from state:", orderId);
              } else {
                // PRIORIDAD 3: Buscar en sessionStorage por payment-success keys
                console.log(
                  "⚠️ completedOrderId is null, searching in sessionStorage...",
                );
                for (let i = 0; i < sessionStorage.length; i++) {
                  const key = sessionStorage.key(i);
                  if (key && key.startsWith("xquisito-payment-success-")) {
                    try {
                      const data = sessionStorage.getItem(key);
                      if (data) {
                        const parsed = JSON.parse(data);
                        orderId = parsed.orderId;
                        console.log(
                          "📦 Found orderId from sessionStorage key:",
                          key,
                          "orderId:",
                          orderId,
                        );
                        break;
                      }
                    } catch (e) {
                      console.error("Error parsing sessionStorage data:", e);
                    }
                  }
                }

                // PRIORIDAD 4: Último intento en localStorage
                if (!orderId) {
                  console.log("⚠️ Still no orderId, trying localStorage...");
                  const paymentData = localStorage.getItem(
                    "xquisito-completed-payment",
                  );
                  if (paymentData) {
                    try {
                      const parsed = JSON.parse(paymentData);
                      orderId = parsed.orderId;
                      console.log(
                        "📦 Found orderId from localStorage:",
                        orderId,
                      );
                    } catch (e) {
                      console.error("Error parsing payment data:", e);
                    }
                  }
                }
              }
            }

            console.log("🔍 Final orderId for navigation:", orderId);

            // Si no hay orderId válido, no navegar (hubo un error en el proceso)
            if (!orderId || orderId === "unknown") {
              console.log(
                "❌ No valid orderId found, not navigating to payment-success",
              );
              return;
            }

            navigateWithRestaurantId(
              `/payment-success?orderId=${orderId}&success=true`,
            );
          }}
          onCancel={handleCancelPayment}
          onConfirm={handleConfirmPayment}
        />
      )}

      <div className="min-h-dvh bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        {/* Header fijo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <MenuHeaderBack />
        </div>
        <div className="h-20" />

        {/* Tarjeta anclada al fondo */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
          <div className="flex flex-col relative px-4 md:px-6 lg:px-8 w-full">
            <div className="bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
              <div className="py-6 px-8 flex flex-col justify-center">
                <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                  Selecciona tu método de pago
                </h1>
              </div>
            </div>

            <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8 overflow-y-auto max-h-[calc(100dvh-8rem)]">
              {/* Resumen compacto del pedido */}
              <div className="mb-3 space-y-2">
                <div className="flex justify-between items-center text-base font-medium text-black">
                  <span>Subtotal</span>
                  <span>${baseAmount.toFixed(2)} MXN</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between items-center text-base font-medium text-black">
                    <span>Propina</span>
                    <span>${tipAmount.toFixed(2)} MXN</span>
                  </div>
                )}
              </div>

              {/* Comisión e IVA */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center border-t pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      Total a pagar
                    </span>
                    <CircleAlert
                      className="size-4 cursor-pointer text-gray-500"
                      strokeWidth={2.3}
                      onClick={() => setShowTotalModal(true)}
                    />
                  </div>
                  <div className="text-right">
                    {selectedMSI !== null ? (
                      <>
                        <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                          ${(displayTotal / selectedMSI).toFixed(2)} MXN x{" "}
                          {selectedMSI} meses
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                        ${displayTotal.toFixed(2)} MXN
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Options - Solo mostrar si es tarjeta de crédito */}
                {(() => {
                  const selectedMethod = paymentMethods.find(
                    (pm) => pm.id === selectedPaymentMethodId,
                  );
                  return selectedMethod?.cardType === "credit" ? (
                    <div
                      className="py-2 cursor-pointer"
                      onClick={() => setShowPaymentOptionsModal(true)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                          Pago a meses
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedMSI !== null
                              ? "border-[#eab3f4] bg-[#eab3f4]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMSI !== null && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Métodos de pago guardados - Mostrar siempre (incluye tarjeta del sistema) */}
              <div className="space-y-2.5">
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
                        onClick={() => {
                          setSelectedPaymentMethodId(method.id);
                          setSelectedMSI(null);
                        }}
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
                        onClick={() => {
                          setSelectedPaymentMethodId(method.id);
                          setSelectedMSI(null);
                        }}
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

                      {/* Delete Button - No mostrar para tarjeta del sistema */}
                      {method.id !== "system-default-card" && (
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
                      )}
                    </div>
                  ))}

                  {/* Apple Pay Button */}
                  {!applePayUnavailable && (
                    <div
                      id="apple-pay-container"
                      className={`w-full rounded-full overflow-hidden${applePayReady ? " mb-2.5" : ""}`}
                    />
                  )}
                </div>
              </div>

              {/* Botón agregar tarjeta */}
              <div className="mb-2.5">
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
                onClick={handleInitiatePayment}
                disabled={isProcessing || !selectedPaymentMethodId}
                className={`w-full text-white py-3 rounded-full cursor-pointer transition-all active:scale-90 ${
                  isProcessing || !selectedPaymentMethodId
                    ? "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#34808C] to-[#173E44] animate-pulse-button"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Procesando pago...</span>
                  </div>
                ) : !selectedPaymentMethodId ? (
                  "Selecciona una tarjeta"
                ) : (
                  "Pagar y ordenar"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal de opciones de pago */}
        {showPaymentOptionsModal && (
          <div
            className="fixed inset-0 flex items-end justify-center backdrop-blur-sm"
            style={{ zIndex: 99999 }}
          >
            {/* Fondo */}
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setShowPaymentOptionsModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-t-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              {/* Titulo */}
              <div className="px-6 pt-4 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                  <h3 className="text-lg font-semibold text-black">
                    Opciones de pago
                  </h3>
                  <button
                    onClick={() => setShowPaymentOptionsModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="size-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="px-6 py-4">
                {(() => {
                  const selectedMethod = paymentMethods.find(
                    (pm) => pm.id === selectedPaymentMethodId,
                  );
                  const cardBrand = selectedMethod?.cardBrand;

                  // Configuración de Diferido según el tipo de tarjeta (tasas del portal EcartPay, pre-IVA)
                  const msiOptions =
                    cardBrand === "amex"
                      ? [
                          { months: 3, rate: 3.25, minAmount: 300 },
                          { months: 6, rate: 6.25, minAmount: 600 },
                          { months: 9, rate: 8.25, minAmount: 900 },
                          { months: 12, rate: 10.25, minAmount: 1200 },
                          { months: 15, rate: 13.25, minAmount: 1800 },
                          { months: 18, rate: 15.25, minAmount: 1800 },
                          { months: 21, rate: 17.25, minAmount: 1800 },
                          { months: 24, rate: 19.25, minAmount: 1800 },
                        ]
                      : [
                          // Visa/Mastercard — tasas configuradas en portal EcartPay
                          { months: 3, rate: 4.26, minAmount: 300 },
                          { months: 6, rate: 7.3, minAmount: 600 },
                          { months: 9, rate: 8.5, minAmount: 900 },
                          { months: 12, rate: 13.0, minAmount: 1200 },
                          { months: 18, rate: 18.25, minAmount: 1800 },
                        ];

                  return (
                    <div className="space-y-2.5">
                      {/* Opción: Pago completo */}
                      <div
                        onClick={() => setSelectedMSI(null)}
                        className={`py-2 px-5 border rounded-full cursor-pointer transition-colors ${
                          selectedMSI === null
                            ? "border-teal-500 bg-teal-50"
                            : "border-black/50 bg-[#f9f9f9] hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-black text-base md:text-lg">
                              Pago completo
                            </p>
                            <p className="text-xs md:text-sm text-gray-600">
                              ${totalAmount.toFixed(2)} MXN
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedMSI === null
                                ? "border-teal-500 bg-teal-500"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedMSI === null && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Separador */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">
                            Pago a meses
                          </span>
                        </div>
                      </div>

                      {/* Opciones MSI */}
                      {(() => {
                        const availableOptions = msiOptions.filter(
                          (option) => totalAmount >= option.minAmount,
                        );
                        const hasUnavailableOptions =
                          availableOptions.length < msiOptions.length;
                        const minAmountNeeded = msiOptions[0]?.minAmount || 0;

                        return (
                          <>
                            {availableOptions.map((option) => {
                              // Calcular total con financiamiento e IVA (fórmula EcartPay: markup sobre monto final)
                              const totalWithCommission =
                                totalAmount / (1 - (option.rate / 100) * 1.16);
                              const monthlyPayment =
                                totalWithCommission / option.months;

                              return (
                                <div
                                  key={option.months}
                                  onClick={() => setSelectedMSI(option.months)}
                                  className={`py-2 px-5 border rounded-full cursor-pointer transition-colors ${
                                    selectedMSI === option.months
                                      ? "border-teal-500 bg-teal-50"
                                      : "border-black/50 bg-[#f9f9f9] hover:border-gray-400"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-black text-base md:text-lg">
                                        ${monthlyPayment.toFixed(2)} MXN x{" "}
                                        {option.months} meses
                                      </p>
                                      <p className="text-xs md:text-sm text-gray-600">
                                        Total ${totalWithCommission.toFixed(2)}{" "}
                                        MXN
                                      </p>
                                    </div>
                                    <div
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                        selectedMSI === option.months
                                          ? "border-teal-500 bg-teal-500"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {selectedMSI === option.months && (
                                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {hasUnavailableOptions &&
                              totalAmount < minAmountNeeded && (
                                <p className="text-xs md:text-sm text-gray-500 text-center mt-2">
                                  Monto mínimo ${minAmountNeeded.toFixed(2)} MXN
                                  para pagos a meses
                                </p>
                              )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>

              {/* Footer con botón de confirmar */}
              <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowPaymentOptionsModal(false)}
                  className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 rounded-full cursor-pointer transition-colors text-base"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

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
                      <span className="text-black font-medium">
                        + Comisión de servicio
                      </span>
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
      </div>

      {/* Modal de error de pago */}
      {errorMessage && (
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50"
          onClick={() => setErrorMessage(null)}
        >
          <div
            className="bg-white rounded-t-4xl w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <CircleAlert
                    className="size-7 text-red-500"
                    strokeWidth={2}
                  />
                </div>
                <h2 className="text-xl font-semibold text-black text-center">
                  Error al procesar el pago
                </h2>
              </div>

              <div className="bg-[#f9f9f9] border border-[#bfbfbf]/50 rounded-xl p-4 mb-6">
                <p className="text-gray-700 text-sm text-center">
                  {errorMessage}
                </p>
              </div>

              <button
                onClick={() => setErrorMessage(null)}
                className="w-full bg-gradient-to-r from-[#34808C] to-[#173E44] text-white py-3 rounded-full text-base"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
