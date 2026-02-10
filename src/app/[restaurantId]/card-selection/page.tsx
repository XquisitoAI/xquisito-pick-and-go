"use client";

import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/hooks/useNavigation";
import { usePayment } from "@/context/PaymentContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGuest } from "@/context/GuestContext";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import {
  Plus,
  Trash2,
  Loader2,
  CircleAlert,
  X,
  ChevronRight,
} from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";
import { useBranch } from "@/context/BranchContext";
import BranchSelectionModal from "@/components/modals/BranchSelectionModal";
import Loader from "@/components/UI/Loader";
import OrderAnimation from "@/components/UI/OrderAnimation";
import { pickAndGoService } from "@/services/pickandgo.service";
import { paymentService } from "@/services/payment.service";
import { calculateCommissions } from "@/utils/commissionCalculator";
import { restaurantService } from "@/services/restaurant.service";
import { cartService } from "@/services/cart.service";
import PickupTimeSelector from "@/components/UI/PickupTimeSelector";

export default function CardSelectionPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { state: cartState, clearCart, refreshCart } = useCart();
  const { navigateWithRestaurantId, branchNumber, changeBranch } =
    useNavigation();
  const { paymentMethods, deletePaymentMethod } = usePayment();
  const { user, profile } = useAuth();
  const { guestId } = useGuest();
  const { branches, selectedBranchNumber, fetchBranches } = useBranch();

  // Tarjeta por defecto del sistema para todos los usuarios
  const defaultSystemCard = {
    id: "system-default-card",
    lastFourDigits: "1234",
    cardBrand: "amex",
    cardType: "credit",
    isDefault: true,
    isSystemCard: true,
  };

  // Combinar tarjetas del sistema con las del usuario
  const allPaymentMethods = [defaultSystemCard, ...paymentMethods];

  // Obtener monto base del carrito desde el contexto
  const baseAmount = cartState.totalPrice;

  // Validación de compra mínima
  const MINIMUM_AMOUNT = 20; // Mínimo de compra requerido

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
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedMSI, setSelectedMSI] = useState<number | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showBranchChangeConfirmModal, setShowBranchChangeConfirmModal] =
    useState(false);
  const [pendingBranchChange, setPendingBranchChange] = useState<number | null>(
    null,
  );
  const [itemsToRemove, setItemsToRemove] = useState<typeof cartState.items>(
    [],
  );
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Estado para hora de recolección programada
  const [scheduledPickupTime, setScheduledPickupTime] = useState<string | null>(
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
    // Siempre hay al menos la tarjeta del sistema disponible
    if (!selectedPaymentMethodId && allPaymentMethods.length > 0) {
      const defaultMethod =
        allPaymentMethods.find((pm) => pm.isDefault) || allPaymentMethods[0];
      setSelectedPaymentMethodId(defaultMethod.id);
      console.log("💳 Auto-seleccionando tarjeta:", defaultMethod.id);
    }
    // Solo marcar como cargado cuando el carrito también esté listo
    if (!cartState.isLoading) {
      setIsLoadingInitial(false);
    }
  }, [allPaymentMethods.length, selectedPaymentMethodId, cartState.isLoading]);

  // Cargar branches cuando el restaurante esté disponible
  useEffect(() => {
    if (restaurantId) {
      fetchBranches(parseInt(restaurantId));
    }
  }, [restaurantId, fetchBranches]);

  const handleInitiatePayment = (): void => {
    if (!selectedPaymentMethodId) {
      alert("Por favor selecciona una tarjeta de pago");
      return;
    }

    if (branches.length > 1 && !selectedBranchNumber) {
      alert("Por favor selecciona una sucursal");
      setShowBranchModal(true);
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
        };

        const pickAndGoOrderResult =
          await pickAndGoService.createOrder(pickAndGoOrderData);

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
        description: `Pick & Go Order - ${profile?.firstName || "Invitado"}`,
        orderId: `order-${Date.now()}`,
        tableNumber: "PICKUP", // Pick & Go usa un valor especial
        restaurantId,
      };

      console.log("💳 Processing payment:", paymentData);

      const paymentResult = await paymentService.processPayment(paymentData);

      if (!paymentResult.success) {
        throw new Error("Error al procesar el pago");
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
      };

      const pickAndGoOrderResult =
        await pickAndGoService.createOrder(pickAndGoOrderData);

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
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      alert(`Error: ${errorMessage}`);
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

  // Función para verificar disponibilidad de items en nueva sucursal
  const checkItemsAvailability = async (newBranchNumber: number) => {
    setIsCheckingAvailability(true);
    try {
      // Obtener el menú de la nueva sucursal
      const menuData = await restaurantService.getRestaurantWithMenuByBranch(
        parseInt(restaurantId),
        newBranchNumber,
      );

      // Crear un Set con todos los menu_item_id disponibles en la nueva sucursal
      const availableMenuItemIds = new Set<number>();
      menuData.menu.forEach((section) => {
        section.items.forEach((item) => {
          availableMenuItemIds.add(item.id);
        });
      });

      // Verificar qué items del carrito NO están disponibles
      const unavailableItems = cartState.items.filter(
        (cartItem) => !availableMenuItemIds.has(cartItem.id),
      );

      setItemsToRemove(unavailableItems);
      return unavailableItems;
    } catch (error) {
      console.error("Error checking items availability:", error);
      // En caso de error, asumir que todos los items están disponibles
      setItemsToRemove([]);
      return [];
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Calcular el total a mostrar según la opción MSI seleccionada
  const getDisplayTotal = () => {
    if (selectedMSI === null) {
      return totalAmount;
    }

    // Obtener el tipo de tarjeta seleccionada
    const selectedMethod = allPaymentMethods.find(
      (pm) => pm.id === selectedPaymentMethodId,
    );
    const cardBrand = selectedMethod?.cardBrand;

    // Configuración de MSI según el tipo de tarjeta
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
            { months: 3, rate: 3.5 },
            { months: 6, rate: 5.5 },
            { months: 9, rate: 8.5 },
            { months: 12, rate: 11.5 },
            { months: 18, rate: 15.0 },
          ];

    // Encontrar la opción seleccionada
    const selectedOption = msiOptions.find((opt) => opt.months === selectedMSI);
    if (!selectedOption) return totalAmount;

    // Calcular comisión e IVA
    const commission = totalAmount * (selectedOption.rate / 100);
    const ivaCommission = commission * 0.16;
    return totalAmount + commission + ivaCommission;
  };

  const displayTotal = getDisplayTotal();

  // Calcular si está bajo el mínimo usando el total con propina, comisiones, etc.
  const isUnderMinimum = totalAmount < MINIMUM_AMOUNT;

  if (isLoadingInitial) {
    return <Loader />;
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
            navigateWithRestaurantId(
              `/payment-success?orderId=${orderId || "unknown"}&success=true`,
            );
          }}
          onCancel={handleCancelPayment}
          onConfirm={handleConfirmPayment}
        />
      )}

      <div className="min-h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <MenuHeaderBack />

      <div className="flex-1 flex flex-col justify-end overflow-y-auto">
        <div className="px-4 w-full">
          <div className="flex flex-col relative">
            <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
              <div className="py-6 px-8 flex flex-col justify-center">
                <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                  Selecciona tu método de pago
                </h1>
              </div>
            </div>

            <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8">
              {/* Sucursal seleccionada */}
              {branches.length > 0 && (
                <div
                  className={`mb-4 flex items-center justify-between w-full ${branches.length > 1 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                  onClick={() =>
                    branches.length > 1 && setShowBranchModal(true)
                  }
                >
                  {selectedBranchNumber ? (
                    <p className="text-gray-600 text-base">
                      Sucursal:{" "}
                      <span className="font-medium text-black">
                        {branches.find(
                          (b) => b.branch_number === selectedBranchNumber,
                        )?.name || "Principal"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-600 text-sm md:text-base font-medium">
                      Selecciona una sucursal
                    </p>
                  )}
                  {branches.length > 1 && (
                    <ChevronRight className="size-4 md:size-5 text-gray-600 flex-shrink-0" />
                  )}
                </div>
              )}
              {/* Selector de hora de recolección */}
              <PickupTimeSelector
                selectedTime={scheduledPickupTime}
                onTimeChange={setScheduledPickupTime}
                estimatedMinutes={25}
              />

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
                {/* Propina label y botones de porcentaje */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl whitespace-nowrap">
                    Propina
                  </span>
                  {/* Tip Percentage Buttons */}
                  <div className="grid grid-cols-5 gap-2 flex-1">
                    {[0, 10, 15, 20].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => {
                          handleTipPercentage(percentage);
                          setShowCustomTipInput(false);
                        }}
                        className={`py-1 md:py-1.5 lg:py-2 rounded-full border border-[#8e8e8e]/40 text-black transition-colors cursor-pointer ${
                          tipPercentage === percentage && !showCustomTipInput
                            ? "bg-[#eab3f4] text-white"
                            : "bg-[#f9f9f9] hover:border-gray-400"
                        }`}
                      >
                        {percentage === 0 ? "0%" : `${percentage}%`}
                      </button>
                    ))}
                    {/* Custom Tip Button */}
                    <button
                      onClick={() => {
                        setShowCustomTipInput(true);
                        setTipPercentage(0);
                      }}
                      className={`py-1 md:py-1.5 lg:py-2 rounded-full border border-[#8e8e8e]/40 text-black transition-colors cursor-pointer ${
                        showCustomTipInput
                          ? "bg-[#eab3f4] text-white"
                          : "bg-[#f9f9f9] hover:border-gray-400"
                      }`}
                    >
                      $
                    </button>
                  </div>
                </div>

                {/* Custom Tip Input - Solo se muestra cuando showCustomTipInput es true */}
                {showCustomTipInput && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="relative w-full">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={customTip}
                        onChange={(e) => handleCustomTipChange(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        autoFocus
                        className="w-full pl-8 pr-4 py-1 md:py-1.5 lg:py-2 border border-[#8e8e8e]/40 rounded-full focus:outline-none focus:ring focus:ring-gray-400 focus:border-transparent text-black text-center bg-[#f9f9f9] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                  </div>
                )}

                {tipAmount > 0 && (
                  <div className="flex justify-end items-center mt-2 text-sm">
                    <span className="text-[#eab3f4] font-medium">
                      +${tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>

              {/* Alerta de mínimo de compra */}
              {isUnderMinimum && totalAmount > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 px-6 py-3 -mx-8  rounded-lg">
                  <div className="flex justify-center items-center gap-3">
                    <X className="size-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 font-medium text-base md:text-lg">
                      ¡El mínimo de compra es de ${MINIMUM_AMOUNT.toFixed(2)}!
                    </p>
                  </div>
                </div>
              )}

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
                  const selectedMethod = allPaymentMethods.find(
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
              <div className="mb-4">
                <h3 className="text-black font-medium mb-3">Métodos de pago</h3>
                <div className="space-y-2.5">
                  {allPaymentMethods.map((method) => (
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
                </div>
              </div>

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
                onClick={handleInitiatePayment}
                disabled={
                  isProcessing ||
                  !selectedPaymentMethodId ||
                  (branches.length > 1 && !selectedBranchNumber) ||
                  isUnderMinimum
                }
                className={`w-full text-white py-3 rounded-full cursor-pointer transition-all active:scale-90 ${
                  isProcessing ||
                  !selectedPaymentMethodId ||
                  (branches.length > 1 && !selectedBranchNumber) ||
                  isUnderMinimum
                    ? "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#34808C] to-[#173E44]"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Procesando pago...</span>
                  </div>
                ) : !selectedPaymentMethodId ? (
                  "Selecciona una tarjeta"
                ) : branches.length > 1 && !selectedBranchNumber ? (
                  "Selecciona una sucursal"
                ) : (
                  "Pagar y ordenar"
                )}
              </button>
            </div>
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
                const selectedMethod = allPaymentMethods.find(
                  (pm) => pm.id === selectedPaymentMethodId,
                );
                const cardBrand = selectedMethod?.cardBrand;

                // Configuración de MSI según el tipo de tarjeta
                const msiOptions =
                  cardBrand === "amex"
                    ? [
                        { months: 3, rate: 3.25, minAmount: 0 },
                        { months: 6, rate: 6.25, minAmount: 0 },
                        { months: 9, rate: 8.25, minAmount: 0 },
                        { months: 12, rate: 10.25, minAmount: 0 },
                        { months: 15, rate: 13.25, minAmount: 0 },
                        { months: 18, rate: 15.25, minAmount: 0 },
                        { months: 21, rate: 17.25, minAmount: 0 },
                        { months: 24, rate: 19.25, minAmount: 0 },
                      ]
                    : [
                        // Visa/Mastercard
                        { months: 3, rate: 3.5, minAmount: 300 },
                        { months: 6, rate: 5.5, minAmount: 600 },
                        { months: 9, rate: 8.5, minAmount: 900 },
                        { months: 12, rate: 11.5, minAmount: 1200 },
                        { months: 18, rate: 15.0, minAmount: 1800 },
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
                            // Calcular comisión e IVA
                            const commission =
                              totalAmount * (option.rate / 100);
                            const ivaCommission = commission * 0.16;
                            const totalWithCommission =
                              totalAmount + commission + ivaCommission;
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

      {/* Modal de confirmación de cambio de sucursal */}
      {showBranchChangeConfirmModal && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!isCheckingAvailability) {
                setShowBranchChangeConfirmModal(false);
                setPendingBranchChange(null);
                setItemsToRemove([]);
              }
            }}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-t-4xl w-full mx-4">
            {isCheckingAvailability ? (
              <div className="px-6 py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
                <p className="text-gray-600 text-base">
                  Verificando disponibilidad...
                </p>
              </div>
            ) : (
              <>
                {/* Content */}
                <div className="px-6 py-4">
                  {itemsToRemove.length > 0 ? (
                    <>
                      <p className="text-gray-600 text-base mb-4">
                        Los siguientes items no están disponibles en la nueva
                        sucursal y serán eliminados del carrito:
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
                                <p className="font-medium text-gray-900">
                                  {item.name}
                                </p>
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
                    </>
                  ) : (
                    <p className="text-gray-600 text-base mb-4">
                      Todos los items de tu carrito están disponibles en la
                      nueva sucursal.
                    </p>
                  )}
                </div>

                {/* Footer con botones */}
                <div className="px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowBranchChangeConfirmModal(false);
                        setPendingBranchChange(null);
                        setItemsToRemove([]);
                      }}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-full text-black font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (pendingBranchChange !== null) {
                          try {
                            setIsCheckingAvailability(true);

                            // 1. Actualizar el branch_number en el cartService (en memoria)
                            //cartService.setBranchNumber(pendingBranchChange);

                            // 2. Eliminar solo los items no disponibles
                            for (const item of itemsToRemove) {
                              if (item.cartItemId) {
                                try {
                                  await cartService.removeFromCart(
                                    item.cartItemId,
                                  );
                                } catch (error) {
                                  console.error(
                                    "Error removing unavailable item:",
                                    error,
                                  );
                                }
                              }
                            }

                            // 3. Actualizar el branch_number en la base de datos
                            /*
                            const updateResult =
                              await cartService.updateCartBranch(
                                pendingBranchChange
                              );

                            if (updateResult.success) {
                              console.log(
                                `✅ Cart branch updated in DB: ${updateResult.data?.items_updated || 0} items updated`
                              );
                            } else {
                              console.error(
                                "⚠️ Error updating cart branch in DB:",
                                updateResult.error
                              );
                            }*/

                            // 4. Cambiar la sucursal
                            changeBranch(pendingBranchChange);

                            // 5. Refrescar el carrito
                            await refreshCart();

                            // 6. Cerrar modales y limpiar estados
                            setIsCheckingAvailability(false);
                            setShowBranchChangeConfirmModal(false);
                            setShowBranchModal(false);
                            setPendingBranchChange(null);
                            setItemsToRemove([]);
                          } catch (error) {
                            console.error("Error during branch change:", error);
                            setIsCheckingAvailability(false);
                            alert(
                              "Hubo un error al cambiar de sucursal. Por favor intenta de nuevo.",
                            );
                          }
                        }
                      }}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-[#34808C] to-[#173E44] rounded-full text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de selección de sucursal */}
      <BranchSelectionModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onBranchChangeRequested={async (newBranchNumber) => {
          // Guardar el cambio pendiente
          setPendingBranchChange(newBranchNumber);

          // Cerrar el modal de selección
          setShowBranchModal(false);

          // Mostrar modal de confirmación con loading
          setShowBranchChangeConfirmModal(true);
          setIsCheckingAvailability(true);

          // Verificar disponibilidad de items
          await checkItemsAvailability(newBranchNumber);

          // El loading se apaga en checkItemsAvailability
        }}
      />
    </div>
    </>
  );
}
