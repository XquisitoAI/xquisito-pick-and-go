"use client";

import MenuHeader from "../headers/MenuHeader";
import MenuCategory from "./MenuCategory";
import { Search, ShoppingCart, Settings, MapPin } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "../../context/userDataContext";
import { useCart } from "../../context/CartContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { useBranch } from "../../context/BranchContext";
import { useRouter } from "next/navigation";
import { useNavigation } from "../../hooks/useNavigation";
import Loader from "../UI/Loader";
import BranchSelectionModal from "../modals/BranchSelectionModal";

export default function MenuView() {
  const [filter, setFilter] = useState("Todo");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const { user, isLoading, profile } = useAuth();
  const { signUpData } = useUserData();
  const { state, refreshCart } = useCart();
  const { restaurant, menu, loading, error } = useRestaurant();
  const { branches, selectedBranchId, fetchBranches } = useBranch();
  const router = useRouter();
  const { navigateWithRestaurantId, branchId } = useNavigation();

  useEffect(() => {
    refreshCart();
  }, []);

  // Cargar branches cuando el restaurante esté disponible
  useEffect(() => {
    if (restaurant?.id) {
      fetchBranches(restaurant.id);
    }
  }, [restaurant?.id, fetchBranches]);

  // Sincronizar branchId de la URL con el contexto
  useEffect(() => {
    if (branchId && branchId !== selectedBranchId) {
      // Si hay un branchId en la URL diferente al seleccionado, actualizarlo
      // El contexto ya maneja esto, solo lo documentamos
    }
  }, [branchId, selectedBranchId]);

  // Obtener categorías únicas del menú de la BD
  const categorias = useMemo(() => {
    const categories = ["Todo"];
    if (menu && menu.length > 0) {
      menu.forEach((section) => {
        if (section.name) {
          categories.push(section.name);
        }
      });
    }
    return categories;
  }, [menu]);

  // Get gender Clerk
  const gender = profile?.gender;
  const welcomeMessage = user
    ? gender === "female"
      ? "Bienvenida"
      : "Bienvenido"
    : "Bienvenido";

  // Total de items en el carrito
  const totalItems = state.totalItems;

  // Filtrar menú según la categoría seleccionada y búsqueda
  const filteredMenu = useMemo(() => {
    let filtered = menu;

    // Filtrar por categoría
    if (filter !== "Todo") {
      filtered = filtered.filter((section) => section.name === filter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query)
          ),
        }))
        .filter((section) => section.items.length > 0);
    }

    return filtered;
  }, [menu, filter, searchQuery]);

  // Mostrar loader mientras carga
  if (loading) {
    return <Loader />;
  }

  // Mostrar error si falla
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

  // Mostrar mensaje si no hay restaurante
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
        className="absolute top-0 left-0 w-full h-72 md:h-96 lg:h-[28rem] object-cover z-0"
      />

      <MenuHeader restaurant={restaurant} />

      <main className="mt-48 md:mt-64 lg:mt-80 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col items-center px-6 md:px-8 lg:px-10">
          <div className="mt-6 md:mt-8 flex items-start justify-between w-full">
            {/* Left side icons */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Settings Icon */}
              <div
                onClick={() => {
                  if (user && !isLoading) {
                    navigateWithRestaurantId("/dashboard");
                  } else {
                    sessionStorage.setItem("signInFromMenu", "true");
                    navigateWithRestaurantId("/auth");
                  }
                }}
                className="bg-white rounded-full p-1.5 md:p-2 lg:p-2.5 border border-gray-400 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Settings
                  className="size-5 md:size-6 lg:size-7 text-stone-800"
                  strokeWidth={1.5}
                />
              </div>

              {/* Branch Selection Icon - Solo mostrar si hay múltiples sucursales */}
              {branches.length > 1 && (
                <div
                  onClick={() => setShowBranchModal(true)}
                  className="bg-white rounded-full p-1.5 md:p-2 lg:p-2.5 border border-gray-400 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  title="Seleccionar sucursal"
                >
                  <MapPin
                    className="size-5 md:size-6 lg:size-7 text-stone-800"
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </div>

            {/* Assistent Icon */}
            <div
              onClick={() => navigateWithRestaurantId("/pepper")}
              className="bg-white rounded-full text-black border border-gray-400 size-10 md:size-12 lg:size-14 cursor-pointer shadow-sm"
            >
              <video
                src="/videos/video-icon-pepper.webm"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-full"
              />
            </div>
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
            <h1 className="text-black text-3xl md:text-4xl lg:text-5xl font-medium mt-3 md:mt-5 mb-6 md:mb-8">
              ¡{welcomeMessage}
              {profile?.firstName ? ` ${profile.firstName}` : ""}!
            </h1>
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
              <div
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 md:px-5 lg:px-6 py-1 md:py-2 text-sm md:text-base lg:text-lg rounded-full cursor-pointer whitespace-nowrap flex-shrink-0
                ${
                  filter === cat
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Items */}
          {filteredMenu.length > 0 ? (
            filteredMenu.map((section) => (
              <MenuCategory key={section.id} section={section} />
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
          <div
            onClick={() => navigateWithRestaurantId("/cart")}
            className="bg-gradient-to-r from-[#34808C] to-[#173E44] text-white rounded-full px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 shadow-lg flex items-center gap-3 md:gap-4 cursor-pointer transition-transform hover:scale-105 animate-bounce-in active:scale-95"
          >
            <ShoppingCart className="size-5 md:size-6 lg:size-7" />
            <span className="text-base md:text-lg lg:text-xl font-medium">
              Ver el carrito • {totalItems}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
