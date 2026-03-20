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
  LogIn,
  UserCircle2,
  RefreshCw,
  Loader2,
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
  const { fetchBranches } = useBranch();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  // No abrir el modal si el usuario viene de auth redirect
  const cameFromAuth =
    typeof window !== "undefined" &&
    sessionStorage.getItem("xquisito-post-auth-redirect");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(
    !isAuthenticated && !cameFromAuth,
  );
  const { restaurant } = useRestaurant();

  // Limpiar el flag de redirect después de cargar
  useEffect(() => {
    if (cameFromAuth) {
      sessionStorage.removeItem("xquisito-post-auth-redirect");
    }
  }, [cameFromAuth]);

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
  // Estado para el folio del pedido
  const [orderFolio, setOrderFolio] = useState<string | null>(null);

  // Función para obtener dish orders desde el backend
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

        // Guardar el folio del pedido
        if (response.data.folio) {
          setOrderFolio(response.data.folio);
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
            status: item.status || "pending",
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

  // Cargar dish orders al inicio
  useEffect(() => {
    fetchDishOrders();
  }, [paymentId, paymentDetails]);

  // Función para refrescar los dish orders
  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    await fetchDishOrders();
    setIsRefreshing(false);
  };

  // Función para calcular el estatus general del pedido basado en los items
  const getOverallStatus = (): "pending" | "ready" | "delivered" => {
    if (!dishOrders || dishOrders.length === 0) return "pending";

    const statuses = dishOrders.map((item) => item.status);

    // Si TODOS están entregados
    if (statuses.every((s) => s === "delivered")) return "delivered";

    // Si TODOS están en cooking (ninguno pending)
    if (statuses.every((s) => s === "cooking")) return "ready";

    // Al menos uno pending
    return "pending";
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
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-[999] flex items-center justify-center"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div
            className="bg-[#173E44]/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl z-[999] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0">
              <div className="w-full flex justify-end">
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="p-2 md:p-3 lg:p-4 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors justify-end flex items-end mt-3 md:mt-4 lg:mt-5 mr-3 md:mr-4 lg:mr-5"
                >
                  <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
                </button>
              </div>
              <div className="px-6 md:px-8 lg:px-10 flex items-center justify-center mb-4 md:mb-5 lg:mb-6">
                <div className="flex flex-col justify-center items-center gap-3 md:gap-4 lg:gap-5">
                  {restaurant?.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant?.name}
                      className="size-20 md:size-24 lg:size-28 object-cover rounded-lg md:rounded-xl"
                    />
                  ) : (
                    <Utensils className="size-20 md:size-24 lg:size-28 text-white" />
                  )}
                  <div className="flex flex-col items-center justify-center">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl text-white font-semibold">
                      Pedido #{orderFolio || "---"}
                    </h2>
                    {/*<p className="text-sm md:text-base lg:text-lg text-white/80 mt-1">
                      Pick & Go
                    </p>*/}
                  </div>
                </div>
              </div>

              {/* Estatus General - 3 pasos */}
              <div className="px-6 md:px-8 lg:px-10 mb-4 md:mb-5 lg:mb-6">
                <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
                  {/* Recibido - siempre activo porque el pedido ya fue recibido */}
                  <div className="flex flex-col items-center gap-1.5 md:gap-2">
                    <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-xs transition-all duration-300 bg-yellow-100 border border-yellow-300">
                      <Clock className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-yellow-800" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-yellow-100">
                      Recibido
                    </span>
                  </div>

                  {/* Línea de progreso - siempre llena porque recibido siempre está completo */}
                  <div className="flex-1 max-w-12 md:max-w-16 lg:max-w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-300"></div>
                  </div>

                  {/* Listo */}
                  <div className="flex flex-col items-center gap-1.5 md:gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-xs transition-all duration-300 ${
                        getOverallStatus() === "ready" ||
                        getOverallStatus() === "delivered"
                          ? "bg-orange-100 text-orange-800 border border-orange-300"
                          : "bg-white/10"
                      }`}
                    >
                      <Utensils
                        className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 ${
                          getOverallStatus() === "ready" ||
                          getOverallStatus() === "delivered"
                            ? "text-orange-800"
                            : "text-white"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs md:text-sm font-medium ${
                        getOverallStatus() === "ready" ||
                        getOverallStatus() === "delivered"
                          ? "text-orange-100"
                          : "text-white/60"
                      }`}
                    >
                      Listo
                    </span>
                  </div>

                  {/* Línea de progreso */}
                  <div className="flex-1 max-w-12 md:max-w-16 lg:max-w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getOverallStatus() === "delivered"
                          ? "w-full bg-gradient-to-r from-orange-300 to-green-300"
                          : "w-0"
                      }`}
                    ></div>
                  </div>

                  {/* Entregado */}
                  <div className="flex flex-col items-center gap-1.5 md:gap-2">
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-xs transition-all duration-300 ${
                        getOverallStatus() === "delivered"
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : "bg-white/10"
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 ${
                          getOverallStatus() === "delivered"
                            ? "text-green-800"
                            : "text-white"
                        }`}
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
                    <span
                      className={`text-xs md:text-sm font-medium ${
                        getOverallStatus() === "delivered"
                          ? "text-green-100"
                          : "text-white/60"
                      }`}
                    >
                      Entregado
                    </span>
                  </div>
                </div>
              </div>

              {/* Título con botón de refresh */}
              <div className="px-6 md:px-8 lg:px-10 border-t border-white/20 pt-4 md:pt-5 lg:pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-xl md:text-2xl lg:text-3xl text-white">
                    Items ordenados
                  </h3>
                  <button
                    onClick={handleRefreshOrders}
                    disabled={isRefreshing}
                    className="rounded-full hover:bg-white/10 p-1 md:p-1.5 lg:p-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-5 md:size-6 lg:size-7 text-white ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Order Items - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 lg:px-10 pt-4 md:pt-5 lg:pt-6 pb-6 md:pb-8 lg:pb-10">
              {isRefreshing ? (
                <div className="flex justify-center items-center py-12 md:py-16 lg:py-20">
                  <Loader2 className="size-8 md:size-10 lg:size-12 animate-spin text-white" />
                </div>
              ) : dishOrders && dishOrders.length > 0 ? (
                <div className="space-y-3 md:space-y-4 lg:space-y-5">
                  {dishOrders.map((item, index) => (
                    <div
                      key={item.dish_order_id || index}
                      className="flex items-start gap-3 md:gap-4 lg:gap-5 bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-5 border border-white/10"
                    >
                      <div className="flex-shrink-0">
                        <div className="size-16 md:size-20 lg:size-24 bg-gray-300 rounded-sm flex items-center justify-center overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src="/logos/logo-short-green.webp"
                              alt="Logo Xquisito"
                              className="size-12 md:size-14 lg:size-16 object-contain"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg lg:text-xl text-white font-medium capitalize">
                          {item.item}
                        </h3>
                        {/* Badge de estado */}
                        <div className="mt-1 md:mt-1.5 lg:mt-2">
                          <span
                            className={`inline-block px-2 md:px-3 lg:px-4 py-0.5 md:py-1 lg:py-1.5 text-xs md:text-sm lg:text-base font-medium rounded-full border ${
                              item.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                : item.status === "cooking"
                                  ? "bg-orange-100 text-orange-800 border-orange-300"
                                  : "bg-green-100 text-green-800 border-green-300"
                            }`}
                          >
                            {item.status === "pending"
                              ? "Recibido"
                              : item.status === "cooking"
                                ? "Listo"
                                : "Entregado"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-xs md:text-sm lg:text-base text-white/60">
                          Cant: {item.quantity}
                        </p>
                        <p className="text-base md:text-lg lg:text-xl text-white font-medium">
                          ${(Number(item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-10 lg:py-12">
                  <p className="text-white/70 text-base md:text-lg lg:text-xl">
                    No se encontró información de la orden
                  </p>
                </div>
              )}
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
