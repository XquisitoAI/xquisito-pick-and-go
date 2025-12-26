"use client";

import MenuView from "@/components/menu/MenuView";
import Loader from "@/components/UI/Loader";
import ValidationError from "@/components/ValidationError";
import { useRestaurant } from "@/context/RestaurantContext";
import { usePickAndGoContext } from "@/context/PickAndGoContext";
import { useValidateAccess } from "@/hooks/useValidateAccess";
import React, { useEffect } from "react";

const MenuPage = () => {
  const { validationError, isValidating, restaurantId } = useValidateAccess();
  const { setRestaurantId: setPickAndGoRestaurantId } = usePickAndGoContext();
  const { restaurant, loading, error } = useRestaurant();

  useEffect(() => {
    if (restaurantId && !isNaN(restaurantId)) {
      setPickAndGoRestaurantId(restaurantId.toString());
      console.log("🥡 Pick & Go Menu Page:", { restaurantId });
    }
  }, [restaurantId, setPickAndGoRestaurantId]);

  // Mostrar loader mientras valida
  if (isValidating || loading) {
    return <Loader />;
  }

  // Mostrar error de validación
  if (validationError) {
    return <ValidationError errorType={validationError as any} />;
  }

  // Mostrar error si falla la carga del restaurante
  if (error) {
    return <ValidationError errorType="VALIDATION_ERROR" />;
  }

  // Verificar que tenemos los datos necesarios
  if (!restaurant || !restaurantId) {
    return <Loader />;
  }

  return <MenuView />;
};

export default MenuPage;
