"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTable } from "@/context/TableContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import { ChevronDown, X } from "lucide-react";
import MenuHeaderDish from "@/components/headers/MenuHeaderDish";
import Loader from "@/components/UI/Loader";
import RestaurantClosedModal from "@/components/RestaurantClosedModal";
import {
  MenuItem as MenuItemDB,
  MenuItemData,
  CustomField,
} from "@/interfaces/menuItemData";
import { reviewsApi, Review, ReviewStats } from "@/services/reviewsApi";
import { useUser } from "@clerk/nextjs";

export default function DishDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dishId = parseInt(params.id as string);
  const restaurantId = params.restaurantId as string;
  const { state, dispatch } = useTable();
  const { tableNumber, goBack, navigateWithTable } = useTableNavigation();
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
    [fieldId: string]: string | string[];
  }>({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredReviewRating, setHoveredReviewRating] = useState(0);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [dishStats, setDishStats] = useState<ReviewStats | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const { isLoaded, user } = useUser();

  // Buscar el dish en el menú del contexto
  const dishData = useMemo(() => {
    if (!menu || menu.length === 0) return null;

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
          rawItem: foundItem,
        };
      }
    }
    return null;
  }, [menu, dishId]);

  // Inicializar selecciones por defecto para dropdown fields
  useEffect(() => {
    if (dishData?.customFields) {
      const defaultSelections: { [key: string]: string[] } = {};
      dishData.customFields.forEach((field) => {
        if (
          field.type === "dropdown" &&
          field.options &&
          field.options.length > 0
        ) {
          defaultSelections[field.id] = [field.options[0].id];
        }
      });
      setCustomFieldSelections((prev) => {
        const merged = { ...defaultSelections, ...prev };
        return merged;
      });

      // Abrir la primera sección por defecto
      if (dishData.customFields.length > 0) {
        setOpenSections((prev) => ({
          ...prev,
          [dishData.customFields[0].id]: true,
        }));
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

  const handleCheckboxChange = (fieldId: string, optionId: string) => {
    setCustomFieldSelections((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      const isSelected = current.includes(optionId);
      return {
        ...prev,
        [fieldId]: isSelected
          ? current.filter((item) => item !== optionId)
          : [...current, optionId],
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
    if (!tableNumber) {
      router.push("/");
      return;
    }

    if (isNaN(parseInt(tableNumber))) {
      router.push("/");
      return;
    }

    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });
  }, [tableNumber, dispatch, router]);

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
      const response = await reviewsApi.getMenuItemStats(dishId);
      console.log("stats response ", response);
      if (response.success && response.data) {
        setDishStats(response.data.data);
      }
    } catch (error) {
      console.error("Error loading dish stats:", error);
    }
  };

  const loadMyReview = async () => {
    if (!dishId || isNaN(dishId)) return;

    try {
      // Determinar si el usuario está autenticado
      const isAuthenticated = isLoaded && user;
      const userId = isAuthenticated ? user.id : null;

      // Solo usar guestId si NO está autenticado
      const guestId =
        !isAuthenticated && typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      const response = await reviewsApi.getMyReview(dishId, userId, guestId);
      console.log("My review response:", response);

      if (response.success) {
        if (response.data?.data) {
          // Usuario tiene una review existente
          setMyReview(response.data.data);
          setReviewRating(response.data.data.rating);
        } else {
          // Usuario no tiene review aún (esto es normal)
          setMyReview(null);
          setReviewRating(0);
        }
      } else if (response.error?.type === "http_error") {
        // Si es error 401 u otro error HTTP, simplemente no mostrar review
        console.log("No review found or no auth:", response.error.message);
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
      const isAuthenticated = isLoaded && user;
      const userId = isAuthenticated ? user.id : null;

      // Solo usar guestId si NO está autenticado
      const guestId =
        !isAuthenticated && typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      console.log(dishId, reviewRating, userId, guestId);

      if (myReview) {
        response = await reviewsApi.updateReview(
          myReview.id,
          reviewRating,
          userId,
          guestId
        );
      } else {
        response = await reviewsApi.createReview({
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
      } else {
        throw new Error(response.error?.message || "Error al enviar reseña");
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
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options?.filter((opt) => selectedIds.includes(opt.id)) || [];
        selectedOptions.forEach((opt) => {
          extraPrice += opt.price;
        });
      });
    }
    return basePrice + extraPrice;
  };

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!dishData) return;

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
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options
            ?.filter((opt) => selectedIds.includes(opt.id))
            .map((opt) => ({
              optionId: opt.id,
              optionName: opt.name,
              price: opt.price,
            })) || [];

        return {
          fieldId: field.id,
          fieldName: field.name,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum + field.selectedOptions.reduce((s, opt) => s + opt.price, 0),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    dispatch({
      type: "ADD_ITEM_TO_CURRENT_USER",
      payload: {
        ...dishData.dish,
        price: basePrice,
        customFields: customFieldsData,
        extraPrice,
      },
    });
  };

  const handleAddToCartAndReturn = () => {
    if (!dishData) return;

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
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options
            ?.filter((opt) => selectedIds.includes(opt.id))
            .map((opt) => ({
              optionId: opt.id,
              optionName: opt.name,
              price: opt.price,
            })) || [];

        return {
          fieldId: field.id,
          fieldName: field.name,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum + field.selectedOptions.reduce((s, opt) => s + opt.price, 0),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    dispatch({
      type: "ADD_ITEM_TO_CURRENT_USER",
      payload: {
        ...dishData.dish,
        price: basePrice,
        customFields: customFieldsData,
        extraPrice,
      },
    });

    setTimeout(() => {
      navigateWithTable("/menu");
    }, 200);
  };

  const handleRemoveFromCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dishData) return;

    setLocalQuantity((prev) => Math.max(0, prev - 1));

    const cartItem = state.currentUserItems.find(
      (cartItem) => cartItem.id === dishData.dish.id
    );
    if (cartItem && cartItem.quantity > 1) {
      dispatch({
        type: "UPDATE_QUANTITY_CURRENT_USER",
        payload: { id: dishData.dish.id, quantity: cartItem.quantity - 1 },
      });
    } else if (cartItem && cartItem.quantity === 1) {
      dispatch({
        type: "REMOVE_ITEM_FROM_CURRENT_USER",
        payload: dishData.dish.id,
      });
    }
  };

  const currentQuantity = dishData
    ? state.currentUserItems.find(
        (cartItem) => cartItem.id === dishData.dish.id
      )?.quantity || 0
    : 0;

  const displayQuantity = Math.max(localQuantity, currentQuantity);

  useEffect(() => {
    if (isPulsing) {
      const timer = setTimeout(() => setIsPulsing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  if (loading) {
    return <Loader />;
  }

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-800 mb-4">
            Mesa Inválida
          </h1>
          <p className="text-gray-600">Por favor escanee el código QR</p>
        </div>
      </div>
    );
  }

  if (!dishData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-2xl font-medium text-white mb-4">
            Platillo no encontrado
          </h1>
          <button
            onClick={() => goBack()}
            className="bg-white text-[#0a8b9b] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Volver al menú
          </button>
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
      <div className="absolute top-0 left-0 w-full h-96 z-0">
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
                src="/logo-short-green.webp"
                alt="Logo"
                className="w-32 h-32 object-contain"
              />
            </div>
          )}
        </div>

        {/* Indicadores */}
        {dish.images.length > 1 && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-10">
            {dish.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-2.5 rounded-full transition-all duration-300 border border-white cursor-pointer ${
                  index === currentImageIndex
                    ? "w-2.5 bg-white"
                    : "w-2.5 bg-white/10"
                }`}
                aria-label={`Ver imagen ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <MenuHeaderDish />

      <main className="mt-72 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col px-6">
          <div className="mt-8">
            <div className="flex justify-between items-center text-black mb-6">
              {isLoadingReviews ? (
                <>
                  {/* Skeleton para el rating */}
                  <div className="flex items-center gap-1.5">
                    <div className="size-6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                  {/* Skeleton para el botón */}
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="size-6 text-black"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {dishStats && dishStats.total_reviews > 0 ? (
                      <>
                        <span className="text-lg">
                          {dishStats.average_rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600">
                          ({dishStats.total_reviews})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-600">Sin reseñas</span>
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
                    className="underline text-black"
                  >
                    {myReview ? "Editar mi reseña" : "Comparte tu reseña"}
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-col justify-between items-start mb-4">
              <h2 className="text-3xl font-medium text-black capitalize">
                {dish.name}
              </h2>
              {dish.discount > 0 ? (
                <div>
                  <h2 className="text-black line-through text-sm">
                    ${dish.price} MXN
                  </h2>
                  <span className="text-black text-xl">
                    ${(dish.price * (1 - dish.discount / 100)).toFixed(2)}{" "}
                    MXN{" "}
                  </span>
                </div>
              ) : (
                <div>
                  <h2 className="text-black text-xl">${dish.price} MXN</h2>
                </div>
              )}
            </div>

            {dish.features.length > 0 && (
              <div className="flex gap-1 mt-1 mb-3">
                {dish.features.map((feature, index) => (
                  <div
                    key={index}
                    className="text-sm text-black font-medium border border-[#bfbfbf]/50 rounded-3xl px-3 py-1 shadow-sm"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            )}

            <p className="text-black text-base leading-relaxed mb-8">
              {dish.description}
            </p>

            {/* Custom Fields Dinámicos */}
            {dishData.customFields && dishData.customFields.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {dishData.customFields.map((field) => (
                  <div key={field.id}>
                    <div
                      className="flex justify-between items-center pb-2 border-b border-[#8e8e8e] cursor-pointer"
                      onClick={() => toggleSection(field.id)}
                    >
                      <h3 className="font-medium text-black text-xl">
                        {field.name}
                      </h3>
                      <div className="size-7 bg-[#f9f9f9] rounded-full flex items-center justify-center border border-[#8e8e8e]/50">
                        <ChevronDown
                          className={`size-5 text-black transition-transform duration-250 ${openSections[field.id] ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {openSections[field.id] && (
                      <div>
                        {field.type === "dropdown" && field.options && (
                          <div className="divide-y divide-[#8e8e8e]">
                            {field.options.map((option) => {
                              const currentSelection = customFieldSelections[
                                field.id
                              ] as string[] | undefined;
                              const isSelected =
                                currentSelection?.includes(option.id) || false;
                              return (
                                <label
                                  key={option.id}
                                  className="flex items-center justify-between gap-2 cursor-pointer py-6"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-black">
                                      {option.name}
                                    </span>
                                    {option.price > 0 && (
                                      <span className="text-[#eab3f4] font-medium text-sm">
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
                                    className="myradio"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {field.type === "checkboxes" && field.options && (
                          <div className="divide-y divide-[8e8e8e]">
                            {field.options.map((option) => (
                              <label
                                key={option.id}
                                className="flex items-center justify-between gap-2 cursor-pointer py-6"
                              >
                                <div className="flex flex-col">
                                  <span className="text-black">
                                    {option.name}
                                  </span>
                                  {option.price > 0 && (
                                    <span className="text-[#eab3f4] font-medium text-sm">
                                      +${option.price}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={
                                    (
                                      customFieldSelections[field.id] as
                                        | string[]
                                        | undefined
                                    )?.includes(option.id) || false
                                  }
                                  onChange={() =>
                                    handleCheckboxChange(field.id, option.id)
                                  }
                                  className="w-4 h-4 rounded border-[#8e8e8e] text-[#eab3f4] focus:ring-[#eab3f4] accent-[#eab3f4]"
                                />
                              </label>
                            ))}
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
              <span className="font-medium text-xl">
                ¿Algo que debamos saber?
              </span>
              <textarea
                name=""
                id=""
                className="h-24 text-base w-full bg-[#f9f9f9] border border-[#bfbfbf] px-3 py-2 rounded-lg resize-none focus:outline-none mt-2"
                placeholder="Alergias, instrucciones especiales, comentarios..."
              ></textarea>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddToCartAndReturn}
                className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors mb-6 flex items-center justify-center gap-2"
              >
                <span>
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
            className="bg-white w-full rounded-t-4xl overflow-y-auto z-999 max-h-[85vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors justify-end flex items-end mt-3 mr-3"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 flex items-center justify-center mb-4">
              <div className="flex flex-col justify-center items-center gap-3">
                {dish.images.length > 0 ? (
                  <img
                    src={dish.images[0]}
                    alt={dish.name}
                    className="size-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="size-20 bg-gray-300 rounded-lg flex items-center justify-center">
                    <img
                      src="/logo-short-green.webp"
                      alt="Logo"
                      className="size-16 object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-xl text-black capitalize">{dish.name}</h2>
                  <p className="text-sm text-gray-600">{section}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 space-y-4">
              {/* Rating Section */}
              <div className="border-t border-[#8e8e8e] pt-4">
                <h3 className="font-normal text-lg text-black mb-3 text-center">
                  ¿Cómo calificarías este platillo?
                </h3>
                <div className="flex justify-center gap-2 mb-4">
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
                          className={`size-8 ${
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
              <div className="pt-4 pb-6">
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || isSubmittingReview}
                  className={`w-full text-white py-3 rounded-full transition-colors ${
                    reviewRating > 0 && !isSubmittingReview
                      ? "bg-black hover:bg-stone-950 cursor-pointer"
                      : "bg-stone-800 cursor-not-allowed"
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
