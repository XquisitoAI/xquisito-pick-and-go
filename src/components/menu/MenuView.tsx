"use client";

import MenuHeader from "../headers/MenuHeader";
import MenuCategory from "./MenuCategory";
import {
  Search,
  ShoppingCart,
  X,
  UserCircle,
  Utensils,
  RefreshCw,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { useBranch } from "../../context/BranchContext";
import { useNavigation } from "../../hooks/useNavigation";
import BranchSelectionModal from "../modals/BranchSelectionModal";
import {
  pickAndGoService,
  type ActiveOrderResponse,
} from "../../services/pickandgo.service";
import { useGuest } from "@/context/GuestContext";
import ChatView from "../ChatView";
import AuthView from "./../AuthView";
import DashboardView from "./../DashboardView";

// Pure functions — defined outside to avoid re-creation on every render
function getStatusColor(status: string) {
  switch (status) {
    case "preparing":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "ready":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "preparing":
      return "Preparando";
    case "ready":
      return "Listo";
    case "delivered":
      return "Entregado";
    default:
      return status;
  }
}

function lockScroll() {
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  const scrollY = parseInt(document.body.style.top || "0") * -1;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  window.scrollTo(0, scrollY);
}

// Reutilizable para el avatar del usuario en header normal y sticky bar
interface UserAvatarProps {
  isAuthenticated: boolean;
  profile: { photoUrl?: string; firstName?: string } | null;
  iconSize?: string;
  textSize?: string;
}

function UserAvatar({
  isAuthenticated,
  profile,
  iconSize = "size-6 md:size-7 lg:size-8",
  textSize = "text-base md:text-lg lg:text-xl",
}: UserAvatarProps) {
  if (isAuthenticated && profile?.photoUrl) {
    return (
      <img
        src={profile.photoUrl}
        alt="Perfil"
        className="w-full h-full object-cover"
      />
    );
  }
  if (isAuthenticated && profile?.firstName) {
    return (
      <span className={`text-stone-800 font-semibold select-none ${textSize}`}>
        {profile.firstName.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <UserCircle className={`text-stone-500 ${iconSize}`} strokeWidth={1.2} />
  );
}

export default function MenuView() {
  const [filter, setFilter] = useState("Todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [activeOrder, setActiveOrder] =
    useState<ActiveOrderResponse["data"]>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, profile, isAuthenticated } = useAuth();
  const { state, refreshCart } = useCart();
  const { restaurant, menu, error } = useRestaurant();
  const { branches, selectedBranchNumber, fetchBranches } = useBranch();
  const { navigateWithRestaurantId } = useNavigation();
  const { guestId } = useGuest();
  const [showPepperChat, setShowPepperChat] = useState(false);
  const [isPepperClosing, setIsPepperClosing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const stickyTriggerRef = useRef<HTMLDivElement>(null);

  const closePepperChat = () => {
    setIsPepperClosing(true);
    setTimeout(() => {
      setShowPepperChat(false);
      setIsPepperClosing(false);
    }, 380);
  };

  const closeSettingsModal = () => {
    setIsSettingsClosing(true);
    setTimeout(() => {
      setShowSettingsModal(false);
      setIsSettingsClosing(false);
    }, 380);
  };

  // Scroll lock unificado para todos los modales
  useEffect(() => {
    if (showPepperChat || showSettingsModal || showStatusModal) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return unlockScroll;
  }, [showPepperChat, showSettingsModal, showStatusModal]);

  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkActiveOrder = useCallback(async () => {
    const clientId = user?.id || guestId;
    if (!clientId || !restaurant?.id) return;
    try {
      const response: any = await pickAndGoService.getActiveOrderByUser(
        clientId,
        restaurant.id,
      );
      if (response.hasActiveOrder && response.data) {
        setActiveOrder(response.data);
      } else {
        setActiveOrder(null);
      }
    } catch (error) {
      console.error("Error checking active order:", error);
    }
  }, [user?.id, guestId, restaurant?.id]);

  useEffect(() => {
    checkActiveOrder();
  }, [checkActiveOrder]);

  const handleRefreshOrder = async () => {
    setIsRefreshing(true);
    await checkActiveOrder();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (restaurant?.id) {
      fetchBranches(restaurant.id);
    }
  }, [restaurant?.id, fetchBranches]);

  // Mostrar barra sticky al hacer scroll past el trigger
  useEffect(() => {
    const trigger = stickyTriggerRef.current;
    if (!trigger) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  // Obtener categorías únicas del menú de la BD
  const categorias = useMemo(() => {
    const categories = ["Todo"];
    if (menu && menu.length > 0) {
      menu.forEach((section) => {
        if (section.name) categories.push(section.name);
      });
    }
    return categories;
  }, [menu]);

  const gender = profile?.gender;
  const welcomeMessage = user
    ? gender === "female"
      ? "Bienvenida"
      : "Bienvenido"
    : "Bienvenido";

  const totalItems = state.totalItems;

  // Filtrar menú según la categoría seleccionada y búsqueda
  const filteredMenu = useMemo(() => {
    let filtered = menu;

    if (filter !== "Todo") {
      filtered = filtered.filter((section) => section.name === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query),
          ),
        }))
        .filter((section) => section.items.length > 0);
    }

    return filtered;
  }, [menu, filter, searchQuery]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Restaurante no encontrado
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <img
        src={
          restaurant.banner_url ||
          "https://w0.peakpx.com/wallpaper/531/501/HD-wallpaper-coffee-espresso-latte-art-cup-food.jpg"
        }
        alt=""
        className="absolute top-0 left-0 w-full h-[230px] md:h-96 lg:h-[28rem] object-cover banner-mobile z-0"
      />

      <MenuHeader restaurant={restaurant} />

      <main className="mt-[9rem] md:mt-64 lg:mt-80 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col items-center px-6 md:px-8 lg:px-10">
          {/* Trigger invisible para IntersectionObserver */}
          <div
            ref={stickyTriggerRef}
            className="absolute top-0 h-px w-px pointer-events-none"
          />
          <div className="mt-6 md:mt-8 flex items-start justify-between w-full">
            {/* Settings Icon */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-white rounded-full border border-gray-400 shadow-sm hover:bg-gray-50 transition-all active:scale-95 size-9 md:size-10 lg:size-12 overflow-hidden flex items-center justify-center"
            >
              <UserAvatar isAuthenticated={isAuthenticated} profile={profile} />
            </button>

            {/* Assistant Icon */}
            <button
              onClick={() => setShowPepperChat(true)}
              className="bg-white rounded-full text-black border border-gray-400 size-10 md:size-12 lg:size-14 shadow-sm overflow-hidden"
            >
              <video
                src="/videos/video-icon-pepper.webm"
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
                disablePictureInPicture
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover rounded-full"
              />
            </button>
          </div>

          {/* Name and photo */}
          <div className="mb-4 md:mb-6 flex flex-col items-center">
            <div className="size-28 md:size-36 lg:size-40 rounded-full bg-gray-200 overflow-hidden border border-gray-400 shadow-sm">
              <img
                src={
                  restaurant.logo_url ||
                  "https://t4.ftcdn.net/jpg/02/15/84/43/360_F_215844325_ttX9YiIIyeaR7Ne6EaLLjMAmy4GvPC69.jpg"
                }
                alt="Profile Pic"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-black text-3xl md:text-4xl lg:text-5xl font-medium mt-3 md:mt-5 mb-2 md:mb-3">
              ¡{welcomeMessage}
              {profile?.firstName ? ` ${profile.firstName}` : ""}!
            </h1>

            {/* Sucursal seleccionada */}
            {branches.length > 0 && (
              <div
                className={`mb-4 md:mb-6 inline-flex items-center gap-1 ${branches.length > 1 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                onClick={() => branches.length > 1 && setShowBranchModal(true)}
              >
                {selectedBranchNumber ? (
                  <>
                    <p className="text-gray-600 text-sm md:text-base">
                      Sucursal:{" "}
                      <span className="font-medium text-black">
                        {branches.find(
                          (b) => b.branch_number === selectedBranchNumber,
                        )?.name || "Principal"}
                      </span>
                    </p>
                    {branches.length > 1 && (
                      <ChevronRight className="size-4 md:size-5 text-gray-600" />
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm md:text-base font-medium">
                      Selecciona una sucursal
                    </p>
                    {branches.length > 1 && (
                      <ChevronRight className="size-4 md:size-5 text-gray-600" />
                    )}
                  </>
                )}
              </div>
            )}

            {/* Link para ver estatus de pedido activo */}
            {activeOrder && (
              <button
                onClick={() => setTimeout(() => setShowStatusModal(true), 400)}
                className="bg-[#f9f9f9] border border-[#8e8e8e] rounded-full px-3 md:px-4 lg:px-5 py-1 md:py-1.5 text-sm md:text-lg lg:text-xl font-medium text-black w-fit mx-auto active:scale-90 transition-all"
              >
                Estatus de pedido
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="w-full">
            <div className="flex items-center justify-center border-b border-black">
              <Search
                className="text-black size-5 md:size-6 lg:size-7"
                strokeWidth={1}
              />
              <input
                type="text"
                placeholder="Buscar artículo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-black text-base md:text-lg lg:text-xl px-3 md:px-4 py-2 md:py-3 focus:outline-none"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 md:gap-3 mt-3 md:mt-5 mb-3 md:mb-5 w-full overflow-x-auto scrollbar-hide">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 md:px-5 lg:px-6 py-1 md:py-2 text-sm md:text-base lg:text-lg rounded-full whitespace-nowrap flex-shrink-0
                ${
                  filter === cat
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items */}
          {filteredMenu.length > 0 ? (
            filteredMenu.map((section) => (
              <MenuCategory
                key={section.id}
                section={section}
                showSectionName={filter === "Todo"}
              />
            ))
          ) : (
            <div className="text-center py-10 md:py-16">
              <p className="text-gray-500 text-base md:text-lg lg:text-xl">
                {searchQuery.trim()
                  ? `No se encontraron resultados para "${searchQuery}"`
                  : "No hay items disponibles"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Carrito flotante */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 md:bottom-8 lg:bottom-10 left-0 right-0 z-50 flex justify-center">
          <button
            onClick={() => navigateWithRestaurantId("/cart")}
            className="bg-gradient-to-r from-[#34808C] to-[#173E44] text-white rounded-full px-6 md:px-8 lg:px-10 py-4 md:py-5 lg:py-6 shadow-lg flex items-center gap-3 md:gap-4 transition-all hover:scale-105 animate-bounce-in active:scale-90"
          >
            <ShoppingCart className="size-5 md:size-6 lg:size-7" />
            <span className="text-base md:text-lg lg:text-xl font-medium">
              Ver el carrito • {totalItems}
            </span>
          </button>
        </div>
      )}

      {/* Modal de selección de sucursal */}
      <BranchSelectionModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
      />

      {/* Status Modal */}
      {showStatusModal && activeOrder && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-[999] flex items-center justify-center"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="bg-[#173E44]/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] w-full mx-4 md:mx-12 lg:mx-28 rounded-4xl z-[999] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0">
              <div className="w-full flex justify-end">
                <button
                  onClick={() => setShowStatusModal(false)}
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
                      alt={restaurant.name}
                      className="size-20 md:size-24 lg:size-28 object-cover rounded-lg md:rounded-xl"
                    />
                  ) : (
                    <Utensils className="size-20 md:size-24 lg:size-28 text-white" />
                  )}
                  <div className="flex flex-col items-center justify-center">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl text-white font-semibold">
                      Pedido #{activeOrder.pick_and_go_order?.folio || "---"}
                    </h2>
                    <p className="text-sm md:text-base lg:text-lg text-white/80 mt-1">
                      Pick & Go
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 md:px-8 lg:px-10 border-t border-white/20 pt-4 md:pt-5 lg:pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-xl md:text-2xl lg:text-3xl text-white">
                    Items ordenados
                  </h3>
                  <button
                    onClick={handleRefreshOrder}
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
              ) : activeOrder.dishes && activeOrder.dishes.length > 0 ? (
                <div className="space-y-3 md:space-y-4 lg:space-y-5">
                  {activeOrder.dishes.map((dish, index) => (
                    <div
                      key={dish.id || index}
                      className="flex items-start gap-3 md:gap-4 lg:gap-5 bg-white/5 rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-5 border border-white/10"
                    >
                      <div className="flex-shrink-0">
                        <div className="size-16 md:size-20 lg:size-24 bg-gray-300 rounded-sm flex items-center justify-center overflow-hidden">
                          {dish.images &&
                          dish.images.length > 0 &&
                          dish.images[0] ? (
                            <img
                              src={dish.images[0]}
                              alt={dish.item}
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
                          {dish.item}
                        </h3>
                        <div className="mt-1 md:mt-1.5 lg:mt-2">
                          <span
                            className={`inline-block px-2 md:px-3 lg:px-4 py-0.5 md:py-1 lg:py-1.5 text-xs md:text-sm lg:text-base font-medium rounded-full border ${getStatusColor(dish.status)}`}
                          >
                            {getStatusText(dish.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-xs md:text-sm lg:text-base text-white/60">
                          Cant: {dish.quantity}
                        </p>
                        <p className="text-base md:text-lg lg:text-xl text-white font-medium">
                          ${(Number(dish.price) * dish.quantity).toFixed(2)}
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

      {/* Sticky Bar — aparece al hacer scroll down */}
      <div
        className="fixed top-0 inset-x-0 z-40 flex justify-center px-4 pt-4 pb-3"
        style={{
          opacity: showStickyBar ? 1 : 0,
          transition: "opacity 120ms ease",
          pointerEvents: showStickyBar ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-4 md:gap-5 rounded-full px-6 md:px-7 py-3 md:py-3.5 shadow-lg border border-white/40"
          style={{
            background: "rgba(255, 255, 255, 0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="size-11 md:size-12 rounded-full overflow-hidden flex items-center justify-center bg-white/60 border border-gray-200 hover:bg-white transition-colors active:scale-95"
          >
            <UserAvatar
              isAuthenticated={isAuthenticated}
              profile={profile}
              iconSize="size-6 md:size-7"
              textSize="text-base md:text-lg"
            />
          </button>

          {/* Carrito */}
          <div className="relative">
            <button
              onClick={() => navigateWithRestaurantId("/cart")}
              className="size-11 md:size-12 rounded-full flex items-center justify-center bg-white/60 border border-gray-200 hover:bg-white transition-colors active:scale-95"
            >
              <ShoppingCart
                className="size-5 md:size-6 text-stone-700"
                strokeWidth={1.5}
              />
            </button>
            {state.totalItems > 0 && (
              <div className="absolute -top-1 -right-1 bg-[#eab3f4] text-white rounded-full size-5 flex items-center justify-center text-xs font-normal">
                {state.totalItems}
              </div>
            )}
          </div>

          {/* Pepper */}
          <button
            onClick={() => setShowPepperChat(true)}
            className="size-11 md:size-12 rounded-full border border-gray-200 bg-white/60 overflow-hidden hover:bg-white transition-colors active:scale-95"
          >
            <video
              src="/videos/video-icon-pepper.webm"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              disablePictureInPicture
              controls={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>

      {/* Pepper Chat Modal */}
      {showPepperChat && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            style={{
              animation: isPepperClosing
                ? "fadeOut 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards"
                : "fadeIn 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            onClick={closePepperChat}
          />
          <div
            className="fixed inset-x-0 z-50 flex flex-col rounded-t-3xl overflow-hidden shadow-2xl border-t border-white/30"
            style={{
              top: "12%",
              bottom: 0,
              paddingBottom: "env(safe-area-inset-bottom)",
              background: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              animation: isPepperClosing
                ? "slideDown 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards"
                : "slideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300/80" />
            </div>
            <ChatView onBack={closePepperChat} />
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            style={{
              animation: isSettingsClosing
                ? "fadeOut 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards"
                : "fadeIn 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            onClick={closeSettingsModal}
          />
          <div
            className="fixed inset-x-0 z-50 flex flex-col rounded-t-3xl shadow-2xl border-t border-white/20"
            style={{
              top: "5%",
              bottom: 0,
              paddingBottom: "env(safe-area-inset-bottom)",
              background: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              animation: isSettingsClosing
                ? "slideDown 0.38s cubic-bezier(0.32, 0.72, 0, 1) forwards"
                : "slideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>
            {isAuthenticated ? (
              <div className="flex-1 min-h-0">
                <DashboardView
                  onClose={closeSettingsModal}
                  onLogout={closeSettingsModal}
                />
              </div>
            ) : (
              <AuthView onClose={closeSettingsModal} />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
