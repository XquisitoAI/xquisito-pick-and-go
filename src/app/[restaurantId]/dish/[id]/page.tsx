"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { usePickAndGoContext } from "@/context/PickAndGoContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import { ChevronDown, X, Home } from "lucide-react";
import MenuHeaderDish from "@/components/headers/MenuHeaderDish";
import Loader from "@/components/UI/Loader";
import RestaurantClosedModal from "@/components/RestaurantClosedModal";
import {
  MenuItem as MenuItemDB,
  MenuItemData,
  CustomField,
} from "@/interfaces/menuItemData";
import {
  reviewsService,
  Review,
  ReviewStats,
} from "@/services/reviews.service";
import { useAuth } from "@/context/AuthContext";

export default function DishDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dishId = parseInt(params.id as string);
  const restaurantId = params.restaurantId as string;
  const { state: cartState, addItem, updateQuantity } = useCart();
  const { setRestaurantId: setPickAndGoRestaurantId } = usePickAndGoContext();
  const { navigateWithRestaurantId } = useNavigation();
  const { restaurant, menu, loading, isOpen } = useRestaurant();
  const [localQuantity, setLocalQuantity] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [customFieldSelections, setCustomFieldSelections] = useState<{
    [fieldId: string]: string | string[] | Record<string, number>;
  }>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredReviewRating, setHoveredReviewRating] = useState(0);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [dishStats, setDishStats] = useState<ReviewStats | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const { isLoading, user } = useAuth();

  // Intentar cargar datos del menú del contexto de forma sincrónica (precarga instantánea)
  const initialDishData = useMemo(() => {
    if (!menu || menu.length === 0 || !dishId) return null;

    // Buscar el platillo en el menú del contexto
    for (const section of menu) {
      const foundItem = section.items.find((item) => item.id === dishId);
      if (foundItem) {
        // Parsear custom_fields si es string JSON
        let parsedCustomFields: CustomField[] = [];
        if (foundItem.custom_fields) {
          if (typeof foundItem.custom_fields === "string") {
            try {
              const parsed = JSON.parse(foundItem.custom_fields);
              parsedCustomFields = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error("Error parsing custom_fields:", e);
            }
          } else {
            parsedCustomFields = foundItem.custom_fields;
          }
        }

        // Adaptar el item de BD al formato esperado
        const adaptedDish: MenuItemData = {
          id: foundItem.id,
          name: foundItem.name,
          description: foundItem.description || "",
          price: Number(foundItem.price),
          images: foundItem.image_url ? [foundItem.image_url] : [],
          features: [],
          discount: foundItem.discount || 0,
        };

        return {
          dish: adaptedDish,
          section: section.name,
          customFields: parsedCustomFields,
        };
      }
    }
    return null;
  }, [menu, dishId]);

  const [dishLoading, setDishLoading] = useState(!initialDishData);
  const [dishError, setDishError] = useState<string | null>(null);
  const [dishData, setDishData] = useState<{
    dish: MenuItemData;
    section: string;
    customFields: CustomField[];
  } | null>(initialDishData);

  // Obtener datos del platillo directamente de la API (para recargas o si no está en caché)
  useEffect(() => {
    const fetchDish = async () => {
      if (!dishId) return;

      // Si ya tenemos datos del menú, no mostrar skeleton
      const hasDataFromMenu = dishData !== null;

      if (!hasDataFromMenu) {
        setDishLoading(true);
      }
      setDishError(null);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${API_URL}/menu/items/${dishId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setDishError("not_found");
          } else {
            setDishError("error");
          }
          setDishLoading(false);
          return;
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          setDishError("error");
          setDishLoading(false);
          return;
        }

        const foundItem = result.data;

        // Buscar la sección en el menú del contexto si está disponible
        let sectionName = "Menú";
        if (menu && menu.length > 0) {
          for (const section of menu) {
            if (section.items.some((item) => item.id === dishId)) {
              sectionName = section.name;
              break;
            }
          }
        }

        // Parsear custom_fields si es string JSON
        let parsedCustomFields: CustomField[] = [];
        if (foundItem.custom_fields) {
          if (typeof foundItem.custom_fields === "string") {
            try {
              const parsed = JSON.parse(foundItem.custom_fields);
              parsedCustomFields = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error("Error parsing custom_fields:", e);
            }
          } else {
            parsedCustomFields = foundItem.custom_fields;
          }
        }

        // Adaptar el item de BD al formato esperado
        const adaptedDish: MenuItemData = {
          id: foundItem.id,
          name: foundItem.name,
          description: foundItem.description || "",
          price: Number(foundItem.price),
          images: foundItem.image_url ? [foundItem.image_url] : [],
          features: [],
          discount: foundItem.discount || 0,
        };

        setDishData({
          dish: adaptedDish,
          section: sectionName,
          customFields: parsedCustomFields,
        });
        setDishLoading(false);
      } catch (error) {
        console.error("Error fetching dish:", error);
        setDishError("error");
        setDishLoading(false);
      }
    };

    fetchDish();
  }, [dishId]);

  // Inicializar secciones abiertas por defecto
  useEffect(() => {
    if (dishData?.customFields) {
      // Abrir todas las secciones por defecto
      if (dishData.customFields.length > 0) {
        const allSectionsOpen: { [key: string]: boolean } = {};
        dishData.customFields.forEach((field) => {
          allSectionsOpen[field.id] = true;
        });
        setOpenSections(allSectionsOpen);
      }
    }
  }, [dishData?.customFields]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDropdownChange = (fieldId: string, optionId: string) => {
    setCustomFieldSelections((prev) => ({
      ...prev,
      [fieldId]: [optionId],
    }));
  };

  const handleCheckboxChange = (
    fieldId: string,
    optionId: string,
    field?: CustomField
  ) => {
    setCustomFieldSelections((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      const isSelected = current.includes(optionId);

      // Si ya está seleccionado, siempre permitir desmarcar
      if (isSelected) {
        return {
          ...prev,
          [fieldId]: current.filter((item) => item !== optionId),
        };
      }

      // Si no está seleccionado, verificar límite de selecciones
      const maxSelections = field?.maxSelections || 1;
      if (current.length >= maxSelections) {
        // Mostrar feedback visual o sonoro si se excede el límite
        console.log(
          `Máximo ${maxSelections} opción${maxSelections > 1 ? "es" : ""} permitida${maxSelections > 1 ? "s" : ""}`
        );
        return prev; // No agregar la nueva selección
      }

      // Agregar la nueva selección
      return {
        ...prev,
        [fieldId]: [...current, optionId],
      };
    });
  };

  const handleQuantityChange = (
    fieldId: string,
    optionId: string,
    quantity: number
  ) => {
    setCustomFieldSelections((prev) => {
      const current = (prev[fieldId] as Record<string, number>) || {};
      const updatedSelections = { ...current };

      if (quantity > 0) {
        updatedSelections[optionId] = quantity;
      } else {
        delete updatedSelections[optionId];
      }

      return {
        ...prev,
        [fieldId]: updatedSelections,
      };
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!dishData) return;

    const minSwipeDistance = 50;
    const distance = touchStart - touchEnd;

    if (Math.abs(distance) < minSwipeDistance) return;

    if (distance > 0) {
      // Swipe left - siguiente imagen
      setCurrentImageIndex((prev) =>
        prev < dishData.dish.images.length - 1 ? prev + 1 : prev
      );
    } else {
      // Swipe right - imagen anterior
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  useEffect(() => {
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      router.push("/");
      return;
    }

    setPickAndGoRestaurantId(restaurantId);
    console.log("🥡 Pick & Go Dish Page:", { restaurantId, dishId });
  }, [restaurantId, dishId, setPickAndGoRestaurantId, router]);

  // Cargar estadísticas de reviews al montar
  useEffect(() => {
    if (dishId && !isNaN(dishId)) {
      console.log("🔄 Loading reviews for dish:", dishId);
      setIsLoadingReviews(true);
      Promise.all([loadDishStats(), loadMyReview()]).finally(() => {
        setIsLoadingReviews(false);
      });
    }
  }, [dishId]);

  const loadDishStats = async () => {
    if (!dishId || isNaN(dishId)) return;

    try {
      const response = await reviewsService.getMenuItemStats(dishId);
      console.log("stats response ", response);
      if (response.success && response.data) {
        setDishStats(response.data);
      }
    } catch (error) {
      console.error("Error loading dish stats:", error);
    }
  };

  const loadMyReview = async () => {
    if (!dishId || isNaN(dishId)) return;

    try {
      // Determinar si el usuario está autenticado
      const isAuthenticated = !isLoading && user;
      const userId = isAuthenticated ? user.id : null;

      // Solo usar guestId si NO está autenticado
      const guestId =
        !isAuthenticated && typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      const response = await reviewsService.getMyReview(
        dishId,
        userId,
        guestId
      );
      console.log("My review response:", response);

      if (response.success) {
        if (response.data) {
          // Usuario tiene una review existente
          setMyReview(response.data);
          setReviewRating(response.data.rating);
        } else {
          // Usuario no tiene review aún (esto es normal)
          setMyReview(null);
          setReviewRating(0);
        }
      } else if (response.error === "http_error") {
        // Si es error 401 u otro error HTTP, simplemente no mostrar review
        console.log("No review found or no auth:", response.error);
        setMyReview(null);
        setReviewRating(0);
      }
    } catch (error) {
      console.error("Error loading my review:", error);
      setMyReview(null);
      setReviewRating(0);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || !dishId || isNaN(dishId)) return;

    setIsSubmittingReview(true);

    try {
      let response;

      // Determinar si el usuario está autenticado
      const isAuthenticated = !isLoading && user;
      const userId = isAuthenticated ? user.id : null;

      // Solo usar guestId si NO está autenticado
      const guestId =
        !isAuthenticated && typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      console.log(dishId, reviewRating, userId, guestId);

      if (myReview) {
        response = await reviewsService.updateReview(
          myReview.id,
          reviewRating,
          userId,
          guestId
        );
      } else {
        response = await reviewsService.createReview({
          menu_item_id: dishId,
          rating: reviewRating,
          user_id: userId,
          guest_id: guestId,
        });
      }

      if (response?.success) {
        alert(myReview ? "¡Reseña actualizada!" : "¡Gracias por tu reseña!");
        setIsReviewModalOpen(false);

        // Recargar estadísticas
        await loadDishStats();
        await loadMyReview();
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);

      if (error.message.includes("already reviewed")) {
        alert("Ya has calificado este platillo");
      } else {
        alert("Error al enviar la reseña. Intenta de nuevo.");
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Calcular precio total con extras
  const calculateTotalPrice = () => {
    if (!dishData) return 0;

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    let extraPrice = 0;
    if (dishData.customFields) {
      dishData.customFields.forEach((field) => {
        const fieldSelection = customFieldSelections[field.id];

        if (
          field.type === "dropdown-quantity" &&
          fieldSelection &&
          typeof fieldSelection === "object" &&
          !Array.isArray(fieldSelection)
        ) {
          // Manejar dropdown-quantity (Record<string, number>)
          const quantitySelections = fieldSelection as Record<string, number>;
          Object.entries(quantitySelections).forEach(([optionId, quantity]) => {
            const option = field.options?.find((opt) => opt.id === optionId);
            if (option && quantity > 0) {
              extraPrice += option.price * quantity;
            }
          });
        } else if (Array.isArray(fieldSelection)) {
          // Manejar dropdown y checkboxes (string[])
          const selectedOptions =
            field.options?.filter((opt) => fieldSelection.includes(opt.id)) ||
            [];
          selectedOptions.forEach((opt) => {
            extraPrice += opt.price;
          });
        }
      });
    }
    return basePrice + extraPrice;
  };

  // Validar que todos los dropdowns obligatorios tengan una opción seleccionada
  const isFormValid = () => {
    if (!dishData?.customFields) return true;

    for (const field of dishData.customFields) {
      if (field.type === "dropdown" && field.required) {
        const selection = customFieldSelections[field.id] as
          | string[]
          | undefined;
        if (!selection || selection.length === 0) {
          return false;
        }
      }
    }
    return true;
  };

  const handleAddToCart = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!dishData) return;

    // Validar que todos los dropdowns tengan selección
    if (!isFormValid()) {
      return;
    }

    // Verificar si el restaurante está abierto
    if (!isOpen) {
      setShowClosedModal(true);
      return;
    }

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    // Calcular precio extra y preparar custom fields
    const customFieldsData = dishData.customFields
      ?.map((field) => {
        const fieldSelection = customFieldSelections[field.id];
        let selectedOptions: Array<{
          optionId: string;
          optionName: string;
          price: number;
          quantity?: number;
        }> = [];

        if (
          field.type === "dropdown-quantity" &&
          fieldSelection &&
          typeof fieldSelection === "object" &&
          !Array.isArray(fieldSelection)
        ) {
          // Manejar dropdown-quantity (Record<string, number>)
          const quantitySelections = fieldSelection as Record<string, number>;
          selectedOptions = Object.entries(quantitySelections)
            .filter(([_, quantity]) => quantity > 0)
            .map(([optionId, quantity]) => {
              const option = field.options?.find((opt) => opt.id === optionId);
              return option
                ? {
                    optionId: option.id,
                    optionName: option.name,
                    price: option.price,
                    quantity,
                  }
                : null;
            })
            .filter(Boolean) as Array<{
            optionId: string;
            optionName: string;
            price: number;
            quantity: number;
          }>;
        } else if (Array.isArray(fieldSelection)) {
          // Manejar dropdown y checkboxes (string[])
          selectedOptions =
            field.options
              ?.filter((opt) => fieldSelection.includes(opt.id))
              .map((opt) => ({
                optionId: opt.id,
                optionName: opt.name,
                price: opt.price,
              })) || [];
        }

        return {
          fieldId: field.id,
          fieldName: field.name,
          fieldType: field.type,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum +
          field.selectedOptions.reduce(
            (s, opt) => s + opt.price * (opt.quantity || 1),
            0
          ),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    await addItem({
      ...dishData.dish,
      price: basePrice,
      customFields: customFieldsData,
      extraPrice,
    });
  };

  const handleAddToCartAndReturn = async () => {
    if (!dishData) return;

    // Validar que todos los dropdowns tengan selección
    if (!isFormValid()) {
      return;
    }

    // Verificar si el restaurante está abierto
    if (!isOpen) {
      setShowClosedModal(true);
      return;
    }

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    // Calcular precio extra y preparar custom fields
    const customFieldsData = dishData.customFields
      ?.map((field) => {
        const fieldSelection = customFieldSelections[field.id];
        let selectedOptions: Array<{
          optionId: string;
          optionName: string;
          price: number;
          quantity?: number;
        }> = [];

        if (
          field.type === "dropdown-quantity" &&
          fieldSelection &&
          typeof fieldSelection === "object" &&
          !Array.isArray(fieldSelection)
        ) {
          // Manejar dropdown-quantity (Record<string, number>)
          const quantitySelections = fieldSelection as Record<string, number>;
          selectedOptions = Object.entries(quantitySelections)
            .filter(([_, quantity]) => quantity > 0)
            .map(([optionId, quantity]) => {
              const option = field.options?.find((opt) => opt.id === optionId);
              return option
                ? {
                    optionId: option.id,
                    optionName: option.name,
                    price: option.price,
                    quantity,
                  }
                : null;
            })
            .filter(Boolean) as Array<{
            optionId: string;
            optionName: string;
            price: number;
            quantity: number;
          }>;
        } else if (Array.isArray(fieldSelection)) {
          // Manejar dropdown y checkboxes (string[])
          selectedOptions =
            field.options
              ?.filter((opt) => fieldSelection.includes(opt.id))
              .map((opt) => ({
                optionId: opt.id,
                optionName: opt.name,
                price: opt.price,
              })) || [];
        }

        return {
          fieldId: field.id,
          fieldName: field.name,
          fieldType: field.type,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum +
          field.selectedOptions.reduce(
            (s, opt) => s + opt.price * (opt.quantity || 1),
            0
          ),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    await addItem({
      ...dishData.dish,
      price: basePrice,
      customFields: customFieldsData,
      extraPrice,
    });

    setTimeout(() => {
      navigateWithRestaurantId("/menu");
    }, 200);
  };

  const handleRemoveFromCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dishData) return;

    setLocalQuantity((prev) => Math.max(0, prev - 1));

    const cartItem = cartState.items.find(
      (cartItem) => cartItem.id === dishData.dish.id
    );
    if (cartItem) {
      await updateQuantity(dishData.dish.id, cartItem.quantity - 1);
    }
  };

  const currentQuantity = dishData
    ? cartState.items.find((cartItem) => cartItem.id === dishData.dish.id)
        ?.quantity || 0
    : 0;

  const displayQuantity = Math.max(localQuantity, currentQuantity);

  useEffect(() => {
    if (isPulsing) {
      const timer = setTimeout(() => setIsPulsing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  if (loading || dishLoading) {
    return <Loader />;
  }

  if (!restaurantId || isNaN(parseInt(restaurantId))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6 md:px-8 lg:px-10">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-white mb-4 md:mb-5 lg:mb-6">
            Restaurante Inválido
          </h1>
          <p className="text-white/80 text-base md:text-lg lg:text-xl mb-6 md:mb-8 lg:mb-10">
            ID de restaurante no válido
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-white text-[#0a8b9b] px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors text-base md:text-lg lg:text-xl"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (dishError === "not_found" || !dishData) {
    return (
      <div className="h-[100dvh] bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-8 lg:px-10 pb-12 md:py-10 lg:py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-6 md:mb-8 lg:mb-10 text-center">
              <img
                src="/logos/logo-short-green.webp"
                alt="Xquisito Logo"
                className="size-16 md:size-20 lg:size-24 mx-auto mb-4 md:mb-5 lg:mb-6"
              />
              <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-medium mb-2 md:mb-3 lg:mb-4">
                Platillo no encontrado
              </h1>
              <p className="text-white/80 text-sm md:text-base lg:text-lg">
                Este platillo no está disponible
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 md:space-y-4 lg:space-y-5">
              {/* Go to Menu Option */}
              <button
                onClick={() => navigateWithRestaurantId("/menu")}
                className="w-full bg-white hover:bg-gray-50 text-black py-4 md:py-5 lg:py-6 px-4 md:px-5 lg:px-6 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center gap-3 md:gap-4 lg:gap-5 active:scale-95"
              >
                <div className="bg-gradient-to-r from-[#34808C] to-[#173E44] p-2 md:p-2.5 lg:p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Home className="size-5 md:size-6 lg:size-7 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base md:text-lg lg:text-xl font-medium mb-0.5 md:mb-1">
                    Volver al menú
                  </h2>
                  <p className="text-xs md:text-sm lg:text-base text-gray-600">
                    Ver platillos disponibles
                  </p>
                </div>
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 md:mt-7 lg:mt-8 text-center">
              <p className="text-white/70 text-xs md:text-sm lg:text-base">
                Es posible que este platillo ya no esté disponible en el menú
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { dish, section } = dishData;

  return (
    <div className="min-h-screen bg-white relative">
      <RestaurantClosedModal
        isOpen={showClosedModal}
        onClose={() => setShowClosedModal(false)}
        openingHours={restaurant?.opening_hours}
        restaurantName={restaurant?.name}
        restaurantLogo={restaurant?.logo_url}
      />
      {/* Slider de imágenes */}
      <div className="absolute top-0 left-0 w-full h-96 md:h-[28rem] lg:h-[32rem] z-0">
        <div
          className="relative w-full h-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {dish.images.length > 0 ? (
            dish.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt=""
                className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${
                  index === currentImageIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          ) : (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-300 flex items-center justify-center">
              <img
                src="/logos/logo-short-green.webp"
                alt="Logo"
                className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
              />
            </div>
          )}
        </div>

        {/* Indicadores */}
        {dish.images.length > 1 && (
          <div className="absolute bottom-12 md:bottom-14 lg:bottom-16 left-0 right-0 flex justify-center gap-2 md:gap-2.5 lg:gap-3 z-10">
            {dish.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-2.5 md:h-3 lg:h-3.5 rounded-full transition-all duration-300 border border-white cursor-pointer ${
                  index === currentImageIndex
                    ? "w-2.5 md:w-3 lg:w-3.5 bg-white"
                    : "w-2.5 md:w-3 lg:w-3.5 bg-white/10"
                }`}
                aria-label={`Ver imagen ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <MenuHeaderDish />

      <main className="mt-64 md:mt-80 lg:mt-96 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col px-6 md:px-8 lg:px-10 pb-[100px] md:pb-[120px] lg:pb-[140px]">
          <div className="mt-8 md:mt-10 lg:mt-12">
            <div className="flex justify-between items-center text-black mb-6 md:mb-7 lg:mb-8">
              {isLoadingReviews ? (
                <>
                  {/* Skeleton para el rating */}
                  <div className="flex items-center gap-1.5 md:gap-2 lg:gap-2.5">
                    <div className="size-6 md:size-7 lg:size-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 md:h-6 lg:h-7 w-8 md:w-10 lg:w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                  {/* Skeleton para el botón */}
                  <div className="h-5 md:h-6 lg:h-7 w-32 md:w-36 lg:w-40 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 md:gap-2 lg:gap-2.5">
                    <svg
                      className="size-6 md:size-7 lg:size-8 text-black"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {dishStats && dishStats.total_reviews > 0 ? (
                      <>
                        <span className="text-lg md:text-xl lg:text-2xl">
                          {dishStats.average_rating.toFixed(1)}
                        </span>
                        <span className="text-xs md:text-sm lg:text-base text-gray-600">
                          ({dishStats.total_reviews})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm md:text-base lg:text-lg text-gray-600">
                        Sin reseñas
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Si ya hay una review, pre-llenar el rating
                      if (myReview) {
                        setReviewRating(myReview.rating);
                      } else {
                        setReviewRating(0);
                      }
                      setIsReviewModalOpen(true);
                    }}
                    className="underline text-black text-sm md:text-base lg:text-lg"
                  >
                    {myReview ? "Editar mi reseña" : "Comparte tu reseña"}
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-col justify-between items-start mb-4 md:mb-5 lg:mb-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-black capitalize">
                {dish.name}
              </h2>
              {dish.discount > 0 ? (
                <div>
                  <h2 className="text-black line-through text-sm md:text-base lg:text-lg">
                    ${dish.price} MXN
                  </h2>
                  <span className="text-black text-xl md:text-2xl lg:text-3xl">
                    ${(dish.price * (1 - dish.discount / 100)).toFixed(2)}{" "}
                    MXN{" "}
                  </span>
                </div>
              ) : (
                <div>
                  <h2 className="text-black text-xl md:text-2xl lg:text-3xl">
                    ${dish.price} MXN
                  </h2>
                </div>
              )}
            </div>

            {dish.features.length > 0 && (
              <div className="flex gap-1 md:gap-1.5 lg:gap-2 mt-1 md:mt-1.5 lg:mt-2 mb-3 md:mb-4 lg:mb-5">
                {dish.features.map((feature, index) => (
                  <div
                    key={index}
                    className="text-sm md:text-base lg:text-lg text-black font-medium border border-[#bfbfbf]/50 rounded-3xl px-3 md:px-4 lg:px-5 py-1 md:py-1.5 lg:py-2 shadow-sm"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            )}

            <p className="text-black text-base md:text-lg lg:text-xl leading-relaxed mb-8 md:mb-10 lg:mb-12">
              {dish.description}
            </p>

            {/* Custom Fields Dinámicos */}
            {dishData.customFields && dishData.customFields.length > 0 && (
              <div className="grid gap-6 md:gap-8 mb-6 md:mb-8">
                {dishData.customFields.map((field) => (
                  <div key={field.id}>
                    <div
                      className="flex justify-between items-center pb-2 md:pb-3 border-b border-[#8e8e8e] cursor-pointer"
                      onClick={() => toggleSection(field.id)}
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-black text-xl md:text-2xl lg:text-3xl mb-4">
                            {field.name}
                          </h3>
                          {field.type === "dropdown" &&
                            field.required &&
                            (() => {
                              const selection = customFieldSelections[
                                field.id
                              ] as string[] | undefined;
                              const hasSelection =
                                selection && selection.length > 0;
                              return (
                                <div
                                  className={`rounded px-2 py-1 ${hasSelection ? "bg-green-100" : "bg-gray-100"}`}
                                >
                                  <span
                                    className={`text-sm md:text-base lg:text-lg font-normal ${hasSelection ? "text-green-600" : "text-gray-500"}`}
                                  >
                                    Obligatorio
                                  </span>
                                </div>
                              );
                            })()}
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            {field.type === "dropdown" &&
                              !openSections[field.id] &&
                              (() => {
                                const selection = customFieldSelections[
                                  field.id
                                ] as string[] | undefined;
                                if (selection && selection.length > 0) {
                                  const selectedOption = field.options?.find(
                                    (opt) => opt.id === selection[0]
                                  );
                                  return (
                                    <span className="text-black text-sm md:text-base mt-1">
                                      {selectedOption?.name ||
                                        "Selecciona una opción"}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[#8e8e8e] text-sm md:text-base mt-1">
                                    Seleccionar opción
                                  </span>
                                );
                              })()}

                            {field.type === "dropdown" &&
                              openSections[field.id] && (
                                <span className="text-black text-sm md:text-base mt-1">
                                  Selecciona una opción
                                </span>
                              )}

                            {(() => {
                              const quantitySelection =
                                customFieldSelections[field.id];
                              const isValidQuantitySelection =
                                field.type === "dropdown-quantity" &&
                                quantitySelection &&
                                typeof quantitySelection === "object" &&
                                !Array.isArray(quantitySelection);

                              if (isValidQuantitySelection) {
                                const totalQuantity = Object.values(
                                  quantitySelection as Record<string, number>
                                ).reduce((sum, qty) => sum + qty, 0);
                                if (totalQuantity > 0) {
                                  return (
                                    <span className="text-[#eab3f4] text-sm md:text-base mt-1">
                                      {totalQuantity} producto(s)
                                      seleccionado(s)
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}

                            {(() => {
                              const quantitySelection =
                                customFieldSelections[field.id];
                              const shouldShowPlaceholder =
                                field.type === "dropdown-quantity" &&
                                (!quantitySelection ||
                                  Array.isArray(quantitySelection) ||
                                  typeof quantitySelection !== "object" ||
                                  Object.keys(
                                    quantitySelection as Record<string, number>
                                  ).length === 0);

                              if (shouldShowPlaceholder) {
                                return (
                                  <span className="text-[#8e8e8e] text-sm md:text-base mt-1">
                                    Personalizar productos adicionales
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {field.type === "checkboxes" &&
                              (() => {
                                const currentSelections =
                                  (customFieldSelections[
                                    field.id
                                  ] as string[]) || [];
                                const maxSelections = field.maxSelections || 1;
                                const selectedCount = currentSelections.length;

                                if (selectedCount > 0) {
                                  return (
                                    <span className="text-[#eab3f4] text-sm md:text-base mt-1">
                                      {selectedCount} producto(s)
                                      seleccionado(s)
                                    </span>
                                  );
                                }

                                return (
                                  <span className="text-gray-600 text-sm md:text-base mt-1">
                                    Selecciona hasta {maxSelections}
                                  </span>
                                );
                              })()}
                          </div>

                          <div className="size-7 md:size-8 lg:size-9 bg-[#f9f9f9] rounded-full flex items-center justify-center border border-[#8e8e8e]/50">
                            <ChevronDown
                              className={`size-5 md:size-6 lg:size-7 text-black transition-transform duration-250 ${openSections[field.id] ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {openSections[field.id] && (
                      <div className="mt-3 md:mt-4">
                        {field.type === "dropdown" && field.options && (
                          <div className="bg-white rounded-lg border border-[#8e8e8e]/30 shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                            {field.options.map((option, index) => {
                              const currentSelection = customFieldSelections[
                                field.id
                              ] as string[] | undefined;
                              const isSelected =
                                currentSelection?.includes(option.id) || false;
                              return (
                                <label
                                  key={option.id}
                                  className={`flex items-center justify-between gap-2 md:gap-3 cursor-pointer py-4 md:py-5 px-4 md:px-6 hover:bg-[#f9f9f9] transition-colors duration-200 ${
                                    isSelected ? "bg-[#eab3f4]/10" : ""
                                  } ${index !== (field.options?.length ?? 0) - 1 ? "border-b border-[#8e8e8e]/20" : ""}`}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-black text-base md:text-lg lg:text-xl">
                                      {option.name}
                                    </span>
                                    {option.price > 0 && (
                                      <span className="text-[#eab3f4] font-medium text-sm md:text-base lg:text-lg">
                                        +${option.price}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="radio"
                                    checked={isSelected}
                                    onChange={() =>
                                      handleDropdownChange(field.id, option.id)
                                    }
                                    className="myradio md:scale-125 lg:scale-150"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {field.type === "dropdown-quantity" &&
                          field.options && (
                            <div className="bg-white rounded-lg border border-[#8e8e8e]/30 shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                              {field.options.map((option, index) => {
                                const fieldSelection =
                                  customFieldSelections[field.id];
                                const currentQuantity =
                                  (fieldSelection &&
                                  typeof fieldSelection === "object" &&
                                  !Array.isArray(fieldSelection)
                                    ? (
                                        fieldSelection as Record<string, number>
                                      )[option.id]
                                    : 0) || 0;

                                return (
                                  <div
                                    key={option.id}
                                    className={`flex items-center justify-between gap-2 md:gap-3 py-4 md:py-5 px-4 md:px-6 ${
                                      index !== (field.options?.length ?? 0) - 1
                                        ? "border-b border-[#8e8e8e]/20"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-black text-base md:text-lg lg:text-xl">
                                        {option.name}
                                      </span>
                                      {option.price > 0 && (
                                        <span className="text-[#eab3f4] font-medium text-sm md:text-base lg:text-lg">
                                          +${option.price}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() =>
                                          handleQuantityChange(
                                            field.id,
                                            option.id,
                                            Math.max(0, currentQuantity - 1)
                                          )
                                        }
                                        className="w-8 h-8 md:w-9 md:h-9 bg-[#f9f9f9] hover:bg-[#eab3f4]/20 rounded-full flex items-center justify-center border border-[#8e8e8e]/50 transition-colors duration-200"
                                        disabled={currentQuantity <= 0}
                                      >
                                        <span className="text-lg font-medium text-[#8e8e8e]">
                                          −
                                        </span>
                                      </button>
                                      <span className="text-lg md:text-xl font-medium text-black min-w-[2rem] text-center">
                                        {currentQuantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleQuantityChange(
                                            field.id,
                                            option.id,
                                            currentQuantity + 1
                                          )
                                        }
                                        className="w-8 h-8 md:w-9 md:h-9 bg-[#f9f9f9] hover:bg-[#eab3f4]/20 rounded-full flex items-center justify-center border border-[#8e8e8e]/50 transition-colors duration-200"
                                      >
                                        <span className="text-lg font-medium text-[#8e8e8e]">
                                          +
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        {field.type === "checkboxes" && field.options && (
                          <div>
                            <div className="divide-y divide-[8e8e8e]">
                              {field.options.map((option) => {
                                const currentSelections =
                                  (customFieldSelections[
                                    field.id
                                  ] as string[]) || [];
                                const maxSelections = field.maxSelections || 1;
                                const isSelected = currentSelections.includes(
                                  option.id
                                );
                                const isDisabled =
                                  !isSelected &&
                                  currentSelections.length >= maxSelections;

                                return (
                                  <label
                                    key={option.id}
                                    className={`flex items-center justify-between gap-2 md:gap-3 py-6 md:py-7 ${
                                      isDisabled
                                        ? "cursor-not-allowed opacity-50"
                                        : "cursor-pointer"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-black text-base md:text-lg lg:text-xl">
                                        {option.name}
                                      </span>
                                      {option.price > 0 && (
                                        <span className="text-[#eab3f4] font-medium text-sm md:text-base lg:text-lg">
                                          +${option.price}
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="checkbox"
                                      disabled={isDisabled}
                                      checked={isSelected}
                                      onChange={() =>
                                        handleCheckboxChange(
                                          field.id,
                                          option.id,
                                          field
                                        )
                                      }
                                      className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 rounded border-[#8e8e8e] focus:ring-[#eab3f4] accent-[#eab3f4] ${
                                        isDisabled
                                          ? "cursor-not-allowed opacity-50"
                                          : "text-[#eab3f4]"
                                      }`}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comentarios Textarea */}
            <div className="text-black">
              <span className="font-medium text-xl md:text-2xl lg:text-3xl">
                ¿Algo que debamos saber?
              </span>
              <textarea
                name=""
                id=""
                className="h-24 md:h-28 lg:h-32 text-base md:text-lg lg:text-xl w-full bg-[#f9f9f9] border border-[#bfbfbf] px-3 md:px-4 lg:px-5 py-2 md:py-3 lg:py-4 rounded-lg md:rounded-xl resize-none focus:outline-none mt-2 md:mt-3 lg:mt-4"
                placeholder="Alergias, instrucciones especiales, comentarios..."
              ></textarea>
            </div>

            <div className="fixed bottom-0 left-0 right-0 mx-4 md:mx-6 lg:mx-8 px-6 md:px-8 lg:px-10 p-6 md:p-7 lg:p-8 z-10">
              <button
                onClick={handleAddToCartAndReturn}
                disabled={!isFormValid()}
                className={`w-full text-white py-3 md:py-4 lg:py-5 rounded-full transition-colors flex items-center justify-center gap-2 ${
                  isFormValid()
                    ? "bg-gradient-to-r from-[#34808C] to-[#173E44] cursor-pointer animate-pulse-button"
                    : "bg-gray-400 cursor-not-allowed opacity-60"
                }`}
              >
                <span className="text-base md:text-lg lg:text-xl font-medium">
                  Agregar al carrito • ${calculateTotalPrice().toFixed(2)} MXN
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-999 flex items-end justify-center"
          onClick={() => setIsReviewModalOpen(false)}
        >
          <div
            className="bg-white w-full mx-4 md:mx-6 lg:mx-8 rounded-t-4xl overflow-y-auto z-999 max-h-[85vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 md:p-2.5 lg:p-3 hover:bg-gray-100 rounded-lg md:rounded-xl transition-colors justify-end flex items-end mt-3 md:mt-4 lg:mt-5 mr-3 md:mr-4 lg:mr-5"
              >
                <X className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-gray-600" />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 md:px-8 lg:px-10 flex items-center justify-center mb-4 md:mb-5 lg:mb-6">
              <div className="flex flex-col justify-center items-center gap-3 md:gap-4 lg:gap-5">
                {dish.images.length > 0 ? (
                  <img
                    src={dish.images[0]}
                    alt={dish.name}
                    className="size-20 md:size-24 lg:size-28 object-cover rounded-lg md:rounded-xl"
                  />
                ) : (
                  <div className="size-20 md:size-24 lg:size-28 bg-gray-300 rounded-lg md:rounded-xl flex items-center justify-center">
                    <img
                      src="/logos/logo-short-green.webp"
                      alt="Logo"
                      className="size-16 md:size-20 lg:size-24 object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-xl md:text-2xl lg:text-3xl text-black capitalize">
                    {dish.name}
                  </h2>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600">
                    {section}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 lg:px-10 space-y-4 md:space-y-5 lg:space-y-6">
              {/* Rating Section */}
              <div className="border-t border-[#8e8e8e] pt-4 md:pt-5 lg:pt-6">
                <h3 className="font-normal text-lg md:text-xl lg:text-2xl text-black mb-3 md:mb-4 lg:mb-5 text-center">
                  ¿Cómo calificarías este platillo?
                </h3>
                <div className="flex justify-center gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-5 lg:mb-6">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const currentRating = hoveredReviewRating || reviewRating;
                    const isFilled = currentRating >= starIndex;

                    return (
                      <div
                        key={starIndex}
                        className="relative cursor-pointer"
                        onMouseEnter={() => setHoveredReviewRating(starIndex)}
                        onMouseLeave={() => setHoveredReviewRating(0)}
                        onClick={() => setReviewRating(starIndex)}
                      >
                        <svg
                          className={`size-8 md:size-10 lg:size-12 ${
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
              </div>

              {/* Submit Button */}
              <div className="pt-4 md:pt-5 lg:pt-6 pb-6 md:pb-8 lg:pb-10">
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || isSubmittingReview}
                  className={`w-full text-white py-3 md:py-4 lg:py-5 rounded-full transition-colors text-base md:text-lg lg:text-xl ${
                    reviewRating > 0 && !isSubmittingReview
                      ? "bg-gradient-to-r from-[#34808C] to-[#173E44] cursor-pointer"
                      : "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isSubmittingReview
                    ? "Enviando..."
                    : myReview
                      ? "Actualizar reseña"
                      : "Enviar reseña"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
