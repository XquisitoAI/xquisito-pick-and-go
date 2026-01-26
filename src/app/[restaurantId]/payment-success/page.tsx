"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useNavigation } from "../../../hooks/useNavigation";
import { useGuest, useIsGuest } from "../../../context/GuestContext";
import { useRestaurant } from "../../../context/RestaurantContext";
import { useBranch } from "../../../context/BranchContext";
import { authService } from "../../../services/auth.service";
import {
  Receipt,
  X,
  Calendar,
  Utensils,
  CircleAlert,
  ChevronDown,
  LogIn,
  UserCircle2,
  Clock,
} from "lucide-react";
import { getCardTypeIcon } from "../../../utils/cardIcons";
import { useAuth } from "../../../context/AuthContext";
import { pickAndGoService } from "../../../services/pickandgo.service";

export default function PaymentSuccessPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { navigateWithRestaurantId, branchNumber } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = useIsGuest();
  const { guestId } = useGuest();
  const { branches, selectedBranchNumber, fetchBranches } = useBranch();
  const { isAuthenticated } = useAuth();

  // Get payment details from URL or localStorage
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("orderId");
  const urlAmount = parseFloat(searchParams.get("amount") || "0");

  // Try to get stored payment details
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [ordersMarkedAsPaid, setOrdersMarkedAsPaid] = useState(false);
  const [rating, setRating] = useState(0); // Rating de 1 a 5 (solo enteros)
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false); // Track if user has already rated
  const [isDeliveryDetailsExpanded, setIsDeliveryDetailsExpanded] =
    useState(false); // Control para detalles de entrega
  const [isRegisterModalOpen, setIsRegisterModalOpen] =
    useState(!isAuthenticated);
  const { restaurant } = useRestaurant();

  // Handler for sign up navigation
  const handleSignUp = () => {
    // Save the current URL to redirect back after registration
    const currentUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem("xquisito-post-auth-redirect", currentUrl);

    // Navigate to auth page
    navigateWithRestaurantId("/auth");
  };

  // Block scroll when any modal is open
  useEffect(() => {
    if (
      isTicketModalOpen ||
      isBreakdownModalOpen ||
      isStatusModalOpen ||
      isRegisterModalOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    isTicketModalOpen,
    isBreakdownModalOpen,
    isStatusModalOpen,
    isRegisterModalOpen,
  ]);

  // Cargar branches cuando el restaurante esté disponible
  useEffect(() => {
    if (restaurantId) {
      fetchBranches(parseInt(restaurantId));
    }
  }, [restaurantId, fetchBranches]);

  // Order progress simulation
  const [orderTime] = useState(new Date()); // Tiempo cuando se creó el pedido
  const [currentTime, setCurrentTime] = useState(new Date());
  const [orderProgress, setOrderProgress] = useState(0); // Progress percentage (0-100)

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log(
        "🔍 Payment success page - checking storage for payment data",
      );

      // Get payment ID from URL to identify this specific payment
      const urlPaymentId = paymentId || searchParams.get("transactionId");

      // First check sessionStorage with payment ID (persistent on reload)
      const sessionKey = urlPaymentId
        ? `xquisito-payment-success-${urlPaymentId}`
        : "xquisito-payment-success";

      let storedPayment = sessionStorage.getItem(sessionKey);
      let storageKey = sessionKey;
      let fromSession = true;

      // If not in sessionStorage, check localStorage (first time)
      if (!storedPayment) {
        fromSession = false;

        // Check for completed payment first (most recent flow)
        storedPayment = localStorage.getItem("xquisito-completed-payment");
        storageKey = "xquisito-completed-payment";

        // Check for pending payment (EcartPay redirect flow)
        if (!storedPayment) {
          storedPayment = localStorage.getItem("xquisito-pending-payment");
          storageKey = "xquisito-pending-payment";
        }

        // Check for payment intent (SDK flow)
        if (!storedPayment) {
          storedPayment = localStorage.getItem("xquisito-payment-intent");
          storageKey = "xquisito-payment-intent";
        }
      }

      console.log("📦 Found payment data in:", storageKey);
      console.log("📦 Raw stored data:", storedPayment);

      if (storedPayment) {
        try {
          const parsed = JSON.parse(storedPayment);
          console.log("📦 Parsed payment details:", parsed);
          setPaymentDetails(parsed);

          // If from localStorage (first time), save to sessionStorage for persistence
          if (!fromSession) {
            // Save with unique key based on payment/transaction ID
            const paymentIdentifier =
              parsed.paymentId ||
              parsed.transactionId ||
              urlPaymentId ||
              Date.now().toString();
            const uniqueKey = `xquisito-payment-success-${paymentIdentifier}`;

            sessionStorage.setItem(uniqueKey, storedPayment);

            // Also save the current payment key reference
            sessionStorage.setItem("xquisito-current-payment-key", uniqueKey);

            // Clean up localStorage
            localStorage.removeItem("xquisito-pending-payment");
            localStorage.removeItem("xquisito-payment-intent");
            localStorage.removeItem("xquisito-completed-payment");

            // Clear all session data after successful payment
            clearGuestSession();
          }
        } catch (e) {
          console.error("Failed to parse stored payment details:", e);
        }
      } else {
        console.log("📦 No payment data found in storage");
      }
    }
  }, [paymentId, searchParams]);

  // useEffect para simular el progreso del pedido
  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      setCurrentTime(now);

      // Calcular minutos transcurridos desde que se hizo el pedido
      const minutesElapsed = Math.floor(
        (now.getTime() - orderTime.getTime()) / (1000 * 60),
      );
      const totalMinutes = 20; // 20 minutos total para completar el pedido

      // Calcular el progreso como porcentaje (0-100)
      let progress = (minutesElapsed / totalMinutes) * 100;
      progress = Math.min(progress, 100); // No exceder 100%

      setOrderProgress(progress);
    };

    // Actualizar inmediatamente
    updateProgress();

    // Actualizar cada 60 segundos (1 minuto)
    const interval = setInterval(updateProgress, 60000);

    return () => clearInterval(interval);
  }, [orderTime]);

  const clearGuestSession = async () => {
    if (typeof window !== "undefined") {
      // Use authService to clear all session data (auth + guest)
      authService.clearAllSessionData();

      // Also clear any additional payment-related data
      localStorage.removeItem("xquisito-pending-payment");

      // For guest users, also cleanup eCartPay data
      if (isGuest && guestId) {
        try {
          await fetch("/api/payments/cleanup-guest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              guestId: guestId,
            }),
          });
          console.log("🧹 Guest eCartPay data cleanup requested");
        } catch (error) {
          console.error("Failed to cleanup guest eCartPay data:", error);
        }
      }

      console.log("🧹 Guest session cleared after successful payment");
    }
  };

  // Calculate total amount charged to client
  const amount =
    paymentDetails?.totalAmountCharged || paymentDetails?.amount || urlAmount;

  // Estado para dish orders (obtenidos del backend)
  const [dishOrders, setDishOrders] = useState<any[]>([]);
  // Estado para la fecha de creación del pedido
  const [orderCreatedAt, setOrderCreatedAt] = useState<Date | null>(null);

  // Obtener dish orders desde el backend usando el orderId
  useEffect(() => {
    const fetchDishOrders = async () => {
      const orderId = paymentId || paymentDetails?.orderId;
      if (!orderId) {
        // Fallback a los datos del storage si no hay orderId
        setDishOrders(paymentDetails?.dishOrders || []);
        if (paymentDetails?.createdAt) {
          setOrderCreatedAt(new Date(paymentDetails.createdAt));
        }
        return;
      }

      try {
        console.log("🔍 Fetching order details from backend:", orderId);
        const response = await pickAndGoService.getOrder(orderId);

        if (response.success && response.data) {
          // Guardar la fecha de creación del pedido
          if (response.data.created_at) {
            setOrderCreatedAt(new Date(response.data.created_at));
          }

          if (response.data.items) {
            console.log("✅ Order items fetched:", response.data.items);
            // Transformar los items del backend al formato esperado
            const transformedItems = response.data.items.map((item: any) => ({
              dish_order_id: item.id,
              item: item.item,
              quantity: item.quantity,
              price: item.price,
              extra_price: item.extra_price || 0,
              total_price: item.price * item.quantity + (item.extra_price || 0),
              guest_name: item.guest_name,
              custom_fields: item.custom_fields,
              image_url: item.images?.[0] || null,
            }));
            setDishOrders(transformedItems);
          }
        } else {
          // Fallback a los datos del storage
          console.log("⚠️ Could not fetch from backend, using storage data");
          setDishOrders(paymentDetails?.dishOrders || []);
          if (paymentDetails?.createdAt) {
            setOrderCreatedAt(new Date(paymentDetails.createdAt));
          }
        }
      } catch (error) {
        console.error("❌ Error fetching order details:", error);
        // Fallback a los datos del storage
        setDishOrders(paymentDetails?.dishOrders || []);
        if (paymentDetails?.createdAt) {
          setOrderCreatedAt(new Date(paymentDetails.createdAt));
        }
      }
    };

    fetchDishOrders();
  }, [paymentId, paymentDetails]);

  // Función para determinar el estado de cada paso basado en el progreso
  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 1) return "completed"; // Siempre completado (Recibido)
    if (stepNumber === 2) return orderProgress > 25 ? "active" : "pending";
    if (stepNumber === 3)
      return orderProgress > 75
        ? "completed"
        : orderProgress > 50
          ? "active"
          : "pending";
    if (stepNumber === 4) return orderProgress >= 100 ? "completed" : "pending";
    return "pending";
  };

  // Función para calcular el ancho de las líneas de progreso
  const getProgressLineWidth = (lineNumber: number) => {
    if (lineNumber === 1) return Math.min(orderProgress * 4, 100); // 0-25% del progreso total
    if (lineNumber === 2)
      return Math.max(0, Math.min((orderProgress - 25) * 4, 100)); // 25-50%
    if (lineNumber === 3)
      return Math.max(0, Math.min((orderProgress - 50) * 4, 100)); // 50-75%
    return 0;
  };

  const handleBackToMenu = () => {
    // Clear payment success data from sessionStorage
    const currentKey = sessionStorage.getItem("xquisito-current-payment-key");
    if (currentKey) {
      sessionStorage.removeItem(currentKey);
      sessionStorage.removeItem("xquisito-current-payment-key");
    }
    // Fallback: also remove generic key
    sessionStorage.removeItem("xquisito-payment-success");

    // Since session is cleared, redirect to home page to select table again
    router.push("/");
  };

  const handleGoHome = () => {
    // Clear payment success data from sessionStorage
    const currentKey = sessionStorage.getItem("xquisito-current-payment-key");
    if (currentKey) {
      sessionStorage.removeItem(currentKey);
      sessionStorage.removeItem("xquisito-current-payment-key");
    }
    // Fallback: also remove generic key
    sessionStorage.removeItem("xquisito-payment-success");

    // Complete exit - go to menu for Pick & Go
    navigateWithRestaurantId("/menu");
  };

  // Handle rating selection
  const handleRatingClick = (starRating: number) => {
    if (hasRated) {
      console.log("⚠️ User has already rated");
      return;
    }
    setRating(starRating);
  };

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (hasRated || rating === 0) {
      return;
    }

    if (!restaurantId) {
      console.error("❌ No restaurant ID available");
      return;
    }

    try {
      console.log("🔍 Submitting restaurant review:", {
        restaurant_id: parseInt(restaurantId),
        rating: rating,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/restaurants/restaurant-reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
            rating: rating,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        console.log("✅ Restaurant review submitted successfully");
        setHasRated(true);
      } else {
        console.error("❌ Failed to submit restaurant review:", data.message);
      }
    } catch (error) {
      console.error("❌ Error submitting restaurant review:", error);
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      {/* Success Icon */}
      <div className="flex-1 flex justify-center items-center">
        <img
          src="/logos/logo-short-green.webp"
          alt="Xquisito Logo"
          className="size-20 md:size-28 lg:size-32 animate-logo-fade-in"
        />
      </div>

      <div className="px-4 md:px-6 lg:px-8 w-full animate-slide-up">
        <div className="flex-1 flex flex-col">
          <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
            <div className="py-6 md:py-8 lg:py-10 px-8 md:px-10 lg:px-12 flex flex-col justify-center items-center mb-6 md:mb-8 lg:mb-10 mt-2 md:mt-4 lg:mt-6 gap-2 md:gap-3 lg:gap-4">
              <h1 className="font-medium text-white text-3xl md:text-4xl lg:text-5xl leading-7 md:leading-9 lg:leading-tight">
                ¡Gracias por tu pedido!
              </h1>
              <p className="text-white text-base md:text-lg lg:text-xl">
                Hemos recibido tu pago y tu orden está en proceso.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-t-4xl relative z-10 flex flex-col min-h-96 justify-center px-6 md:px-8 lg:px-10 flex-1 py-8 md:py-10 lg:py-12">
            {/* Rating Prompt */}
            <div className="text-center mb-8 md:mb-10 lg:mb-12">
              <p className="text-xl md:text-2xl lg:text-3xl font-medium text-black mb-2 md:mb-3 lg:mb-4">
                {hasRated
                  ? "¡Gracias por tu calificación!"
                  : "Califica tu experiencia en el restaurante"}
              </p>
              <div className="flex flex-col items-center gap-3 md:gap-3.5 lg:gap-4">
                {/* Stars container */}
                <div className="flex gap-1 md:gap-1.5 lg:gap-2">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const currentRating = hoveredRating || rating;
                    const isFilled = currentRating >= starIndex;

                    return (
                      <div
                        key={starIndex}
                        className={`relative ${
                          hasRated ? "cursor-default" : "cursor-pointer"
                        }`}
                        onMouseEnter={() =>
                          !hasRated && setHoveredRating(starIndex)
                        }
                        onMouseLeave={() => !hasRated && setHoveredRating(0)}
                        onClick={() =>
                          !hasRated && handleRatingClick(starIndex)
                        }
                      >
                        {/* Estrella */}
                        <svg
                          className={`size-8 md:size-10 lg:size-12 transition-all ${
                            isFilled ? "text-yellow-400" : "text-white"
                          }`}
                          fill="currentColor"
                          stroke={isFilled ? "#facc15" : "black"}
                          strokeWidth="1"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    );
                  })}
                </div>

                {/* Submit button - appears when a rating is selected */}
                {rating > 0 && !hasRated && (
                  <button
                    onClick={handleSubmitRating}
                    className="px-5 md:px-6 py-1.5 md:py-2 bg-gradient-to-r from-[#34808C] to-[#173E44] hover:from-[#2a6d77] hover:to-[#12323a] text-white text-sm md:text-base font-medium rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in"
                    aria-label="Enviar calificación"
                  >
                    Enviar
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="space-y-3 md:space-y-4 lg:space-y-5"
              style={{
                paddingBottom: "max(0rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                onClick={handleGoHome}
                className="w-full text-white py-3 md:py-4 lg:py-5 rounded-full cursor-pointer transition-all active:scale-90 bg-gradient-to-r from-[#34808C] to-[#173E44] text-base md:text-lg lg:text-xl"
              >
                Ir al menú
              </button>

              {/* Ticket btn */}
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="text-base md:text-lg lg:text-xl w-full flex items-center justify-center gap-2 md:gap-3 lg:gap-4 text-black border border-black py-3 md:py-4 lg:py-5 rounded-full cursor-pointer transition-all active:scale-90 bg-white hover:bg-stone-100"
              >
                <Receipt
                  className="size-5 md:size-6 lg:size-7"
                  strokeWidth={1.5}
                />
                Ver ticket de compra
              </button>

              {/* Status btn */}
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="text-base md:text-lg lg:text-xl w-full flex items-center justify-center gap-2 md:gap-3 lg:gap-4 text-black border border-black py-3 md:py-4 lg:py-5 rounded-full cursor-pointer transition-all active:scale-90 bg-white hover:bg-stone-100"
              >
                <Calendar
                  className="size-5 md:size-6 lg:size-7"
                  strokeWidth={1.5}
                />
                Ver Estatus
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-999 flex items-center justify-center"
          onClick={() => setIsTicketModalOpen(false)}
        >
          <div
            className="bg-[#173E44]/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl z-999 max-h-[77vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-2 md:p-3 lg:p-4 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors justify-end flex items-end mt-3 md:mt-4 lg:mt-5 mr-3 md:mr-4 lg:mr-5"
              >
                <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 md:px-8 lg:px-10 flex items-center justify-center mb-4 md:mb-5 lg:mb-6 flex-shrink-0">
              <div className="flex flex-col justify-center items-center gap-3 md:gap-4 lg:gap-5">
                {restaurant?.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="size-20 md:size-24 lg:size-28 object-cover rounded-lg md:rounded-xl"
                  />
                ) : (
                  <Receipt className="size-20 md:size-24 lg:size-28 text-white" />
                )}
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-xl md:text-2xl lg:text-3xl text-white font-bold">
                    {restaurant?.name}
                  </h2>
                  <p className="text-sm md:text-base lg:text-lg text-white/80">
                    Pick & Go
                  </p>
                  <p className="text-xs md:text-sm text-white/70 mt-1">
                    {(orderCreatedAt || new Date()).toLocaleTimeString(
                      "es-MX",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 md:px-8 lg:px-10 space-y-4 md:space-y-5 lg:space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Order Info */}
              <div className="border-t border-white/20 pt-4 md:pt-5 lg:pt-6">
                <h3 className="font-medium text-xl md:text-2xl lg:text-3xl text-white mb-3 md:mb-4 lg:mb-5">
                  Detalles del pago
                </h3>
                <div className="space-y-2 md:space-y-3 lg:space-y-4">
                  {paymentDetails?.userName && (
                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-white/90">
                      <div className="bg-orange-100 p-2 md:p-2.5 lg:p-3 rounded-xl flex items-center justify-center">
                        <Utensils className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-orange-600" />
                      </div>
                      <span className="text-sm md:text-base lg:text-lg">
                        {paymentDetails.userName}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-white/90">
                    <div className="bg-blue-100 p-2 md:p-2.5 lg:p-3 rounded-xl flex items-center justify-center">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-600" />
                    </div>
                    <span className="text-sm md:text-base lg:text-lg">
                      {(orderCreatedAt || new Date())
                        .toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
                        .replace(/\//g, "/")}
                    </span>
                  </div>
                  {paymentDetails?.cardLast4 && (
                    <div className="flex items-center gap-2 md:gap-3 lg:gap-4 text-white/90">
                      <div className="bg-green-100 p-2 md:p-2.5 lg:p-3 rounded-xl flex items-center justify-center">
                        <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center scale-150">
                          {getCardTypeIcon(
                            paymentDetails.cardBrand || "unknown",
                            "medium",
                          )}
                        </div>
                      </div>
                      <span className="text-sm md:text-base lg:text-lg">
                        **** {paymentDetails.cardLast4.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              {dishOrders.length > 0 && (
                <div className="border-t border-white/20 py-4 md:py-5 lg:py-6">
                  <h3 className="font-medium text-xl md:text-2xl lg:text-3xl text-white mb-3 md:mb-4 lg:mb-5">
                    Items de la orden
                  </h3>
                  <div className="space-y-3 md:space-y-4 lg:space-y-5">
                    {dishOrders.map((dish: any, index: number) => (
                      <div
                        key={dish.dish_order_id || index}
                        className="flex items-center gap-3 md:gap-4 lg:gap-5"
                      >
                        {dish.image_url && (
                          <img
                            src={dish.image_url}
                            alt={dish.item}
                            className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-white font-medium text-base md:text-lg lg:text-xl">
                            {dish.quantity}x {dish.item}
                          </p>
                          {dish.guest_name && (
                            <p className="text-xs md:text-sm lg:text-base text-white/60 uppercase">
                              {dish.guest_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium text-base md:text-lg lg:text-xl">
                            ${dish.total_price?.toFixed(2) || "0.00"} MXN
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Propina como item */}
                    {paymentDetails?.tipAmount > 0 && (
                      <div className="flex justify-between items-start gap-3 md:gap-4 lg:gap-5 pt-3 md:pt-4 lg:pt-5">
                        <div className="flex-1">
                          <p className="text-white font-medium text-base md:text-lg lg:text-xl">
                            Propina
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium text-base md:text-lg lg:text-xl">
                            ${paymentDetails.tipAmount.toFixed(2)} MXN
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary with Info Button */}
            <div className="px-6 md:px-8 lg:px-10 flex-shrink-0">
              <div className="flex justify-between items-center border-t border-white/20 pt-4 md:pt-5 lg:pt-6 mb-6 md:mb-8 lg:mb-10">
                <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                  <span className="text-lg md:text-xl lg:text-2xl font-medium text-white">
                    Total
                  </span>
                  <button
                    onClick={() => setIsBreakdownModalOpen(true)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Ver desglose"
                  >
                    <CircleAlert
                      className="size-4 md:size-5 lg:size-6 cursor-pointer text-white/70"
                      strokeWidth={2.3}
                    />
                  </button>
                </div>
                <span className="text-lg md:text-xl lg:text-2xl font-medium text-white">
                  ${amount.toFixed(2)} MXN
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {isBreakdownModalOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setIsBreakdownModalOpen(false)}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-t-4xl w-full mx-4 md:mx-6 lg:mx-8">
            {/* Titulo */}
            <div className="px-6 md:px-8 lg:px-10 pt-4 md:pt-6 lg:pt-8">
              <div className="flex items-center justify-between pb-4 md:pb-5 lg:pb-6 border-b border-[#8e8e8e]">
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-black">
                  Desglose del pago
                </h3>
                <button
                  onClick={() => setIsBreakdownModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 md:size-6 lg:size-7 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="px-6 md:px-8 lg:px-10 py-4 md:py-6 lg:py-8">
              <p className="text-black text-base md:text-lg lg:text-xl mb-4 md:mb-5 lg:mb-6">
                El total se obtiene de la suma de:
              </p>
              <div className="space-y-3 md:space-y-4 lg:space-y-5">
                {paymentDetails?.baseAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      + Consumo
                    </span>
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      ${paymentDetails.baseAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}

                {paymentDetails?.tipAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      + Propina
                    </span>
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      ${paymentDetails.tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}

                {(paymentDetails?.xquisitoCommissionClient || 0) +
                  (paymentDetails?.ivaXquisitoClient || 0) >
                  0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      + Comisión de servicio
                    </span>
                    <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                      $
                      {(
                        (paymentDetails?.xquisitoCommissionClient || 0) +
                        (paymentDetails?.ivaXquisitoClient || 0)
                      ).toFixed(2)}{" "}
                      MXN
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {isStatusModalOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-999 flex items-center justify-center"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div
            className="bg-[#173E44]/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 md:px-8 lg:px-10 pt-6 md:pt-8 lg:pt-10 pb-4 md:pb-5 lg:pb-6">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  Pedido creado
                </h2>
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="p-2 md:p-3 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
                </button>
              </div>

              {/* Estimated time */}
              <div className="mb-8 md:mb-10">
                {paymentDetails?.scheduledPickupTime ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
                      <Clock className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
                      <p className="text-white/80 text-base md:text-lg lg:text-xl">
                        Recolección programada:
                      </p>
                    </div>
                    <p className="font-semibold text-white text-lg md:text-xl lg:text-2xl">
                      {new Date(
                        paymentDetails.scheduledPickupTime,
                      ).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-white/80 text-base md:text-lg lg:text-xl mb-2 flex items-center justify-center gap-2 md:gap-3">
                    Entrega estimada:
                    <span className="font-semibold text-white">
                      {orderTime.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}{" "}
                      -{" "}
                      {new Date(
                        orderTime.getTime() + 20 * 60 * 1000,
                      ).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-8 md:mb-10">
                <div className="flex items-center justify-between">
                  {/* Step 1: Order received */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        getStepStatus(1) === "completed"
                          ? "bg-green-500 ring-4 ring-green-500/30"
                          : "bg-white/10"
                      }`}
                    >
                      <svg
                        className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-xs md:text-sm text-white/90 font-medium">
                      Recibido
                    </span>
                  </div>

                  {/* Progress line */}
                  <div className="flex-1 h-1.5 bg-white/10 mx-2 md:mx-3 relative rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000"
                      style={{ width: `${getProgressLineWidth(1)}%` }}
                    ></div>
                  </div>

                  {/* Step 2: Cooking */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        getStepStatus(2) === "active"
                          ? "bg-orange-500 ring-4 ring-orange-500/30 animate-pulse"
                          : getStepStatus(2) === "completed"
                            ? "bg-green-500 ring-4 ring-green-500/30"
                            : "bg-white/10"
                      }`}
                    >
                      <Utensils className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <span className="text-xs md:text-sm text-white/90 font-medium">
                      Preparando
                    </span>
                  </div>

                  {/* Progress line */}
                  <div className="flex-1 h-1.5 bg-white/10 mx-2 md:mx-3 relative rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000"
                      style={{ width: `${getProgressLineWidth(2)}%` }}
                    ></div>
                  </div>

                  {/* Step 3: Ready for pickup */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        getStepStatus(3) === "active"
                          ? "bg-blue-500 ring-4 ring-blue-500/30 animate-pulse"
                          : getStepStatus(3) === "completed"
                            ? "bg-green-500 ring-4 ring-green-500/30"
                            : "bg-white/10"
                      }`}
                    >
                      <div className="text-2xl md:text-3xl">📦</div>
                    </div>
                    <span className="text-xs md:text-sm text-white/90 font-medium">
                      Listo
                    </span>
                  </div>

                  {/* Progress line */}
                  <div className="flex-1 h-1.5 bg-white/10 mx-2 md:mx-3 relative rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000"
                      style={{ width: `${getProgressLineWidth(3)}%` }}
                    ></div>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        getStepStatus(4) === "completed"
                          ? "bg-green-500 ring-4 ring-green-500/30"
                          : "bg-white/10"
                      }`}
                    >
                      <div className="text-2xl md:text-3xl">🏠</div>
                    </div>
                    <span className="text-xs md:text-sm text-white/90 font-medium">
                      Entregado
                    </span>
                  </div>
                </div>
              </div>

              {/* Order details - Collapsible */}
              <div className="border-t border-white/20 pt-6 md:pt-8">
                {/* Header clickeable */}
                <button
                  onClick={() =>
                    setIsDeliveryDetailsExpanded(!isDeliveryDetailsExpanded)
                  }
                  className="w-full flex items-center justify-between text-left hover:bg-white/5 rounded-lg md:rounded-xl p-3 md:p-4 -mx-3 md:-mx-4 transition-all duration-300"
                >
                  <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">
                    Detalles de la entrega
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 md:w-6 md:h-6 text-white transition-transform duration-300 ${
                      isDeliveryDetailsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Contenido expandible con animación */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isDeliveryDetailsExpanded
                      ? "max-h-96 opacity-100 mt-4 md:mt-5"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 space-y-2.5 md:space-y-3">
                    <p className="text-white/90 text-sm md:text-base lg:text-lg">
                      <span className="font-medium text-white">
                        Restaurante:
                      </span>{" "}
                      {restaurant?.name}
                    </p>
                    <p className="text-white/90 text-sm md:text-base lg:text-lg">
                      <span className="font-medium text-white">
                        Dirección de entrega:
                      </span>{" "}
                      {branches.find(
                        (b) => b.branch_number === selectedBranchNumber,
                      )?.address || restaurant?.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-8 md:mt-10 pb-6 md:pb-8">
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="w-full text-white py-3 md:py-4 lg:py-5 rounded-full cursor-pointer transition-all active:scale-90 bg-gradient-to-r from-[#34808C] to-[#173E44] text-base md:text-lg lg:text-xl"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-999 flex items-center justify-center animate-fade-in"
          onClick={() => setIsRegisterModalOpen(false)}
        >
          <div
            className="bg-[#173E44]/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl z-999 flex flex-col justify-center py-12 md:py-16 lg:py-20 min-h-[70vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="absolute top-3 md:top-4 lg:top-5 right-3 md:right-4 lg:right-5">
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-2 md:p-3 lg:p-4 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors"
              >
                <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
              </button>
            </div>

            {/* Logo */}
            <div className="px-6 md:px-8 lg:px-10 flex items-center justify-center mb-6 md:mb-8 lg:mb-10">
              <img
                src="/logos/logo-short-white.webp"
                alt="Xquisito Logo"
                className="size-20 md:size-24 lg:size-28"
              />
            </div>

            {/* Title */}
            <div className="px-6 md:px-8 lg:px-10 text-center mb-6 md:mb-8 lg:mb-10">
              <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-medium mb-2 md:mb-3 lg:mb-4">
                ¡Tu pedido fue creado con éxito!
              </h1>
              <p className="text-white/80 text-sm md:text-base lg:text-lg">
                Crea una cuenta para hacer pedidos más rápido la próxima vez
              </p>
            </div>

            {/* Options */}
            <div className="px-6 md:px-8 lg:px-10 space-y-3 md:space-y-4 lg:space-y-5">
              {/* Sign Up Option */}
              <button
                onClick={handleSignUp}
                className="w-full bg-white hover:bg-gray-50 text-black py-4 md:py-5 lg:py-6 px-4 md:px-5 lg:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-3 md:gap-4 lg:gap-5 active:scale-95"
              >
                <div className="bg-gradient-to-r from-[#34808C] to-[#173E44] p-2 md:p-2.5 lg:p-3 rounded-full group-hover:scale-110 transition-transform">
                  <LogIn className="size-5 md:size-6 lg:size-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base md:text-lg lg:text-xl font-medium mb-0.5 md:mb-1">
                    Crear cuenta
                  </h2>
                  <p className="text-xs md:text-sm lg:text-base text-gray-600">
                    Registrate y ahorra tiempo en futuros pedidos
                  </p>
                </div>
              </button>

              {/* Continue as Guest Option */}
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-full bg-white/10 hover:bg-white/20 border-2 border-white text-white py-4 md:py-5 lg:py-6 px-4 md:px-5 lg:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-3 md:gap-4 lg:gap-5 group active:scale-95"
              >
                <div className="bg-white/20 p-2 md:p-2.5 lg:p-3 rounded-full group-hover:scale-110 transition-transform">
                  <UserCircle2 className="size-5 md:size-6 lg:size-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base md:text-lg lg:text-xl font-medium mb-0.5 md:mb-1">
                    Continuar sin registrarme
                  </h2>
                  <p className="text-xs md:text-sm lg:text-base text-white/80">
                    Ver el estado de mi pedido
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
