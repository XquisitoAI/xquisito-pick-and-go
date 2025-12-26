import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useRestaurant } from "../context/RestaurantContext";
import { restaurantService } from "../services/restaurant.service";

/**
 * Hook para validar acceso a restaurante y sucursal en Pick & Go
 * Valida que el restaurante exista y tenga sucursales activas
 * La sucursal se maneja como query param (?branch=X)
 */
export function useValidateAccess() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { setRestaurantId } = useRestaurant();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const restaurantId = params?.restaurantId as string;
  const branchNumber = searchParams?.get("branch");

  useEffect(() => {
    const validateAndSetup = async () => {
      try {
        // Validar restaurantId
        if (!restaurantId || isNaN(parseInt(restaurantId))) {
          console.error("❌ Invalid restaurant ID");
          setValidationError("RESTAURANT_NOT_FOUND");
          setIsValidating(false);
          return;
        }

        // Establecer restaurantId en el contexto
        setRestaurantId(parseInt(restaurantId));

        // Validar que el restaurante y sucursal existan en el backend
        const validation = await restaurantService.validateRestaurantAndBranch(
          parseInt(restaurantId),
          branchNumber ? parseInt(branchNumber) : null
        );

        if (!validation.valid) {
          console.error("❌ Validation failed:", validation.error);
          setValidationError(validation.error || "VALIDATION_ERROR");
        } else {
          console.log("✅ Validation successful");
          setValidationError(null);
        }
      } catch (err) {
        console.error("❌ Validation error:", err);
        setValidationError("VALIDATION_ERROR");
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSetup();
  }, [restaurantId, branchNumber, setRestaurantId]);

  return {
    validationError,
    isValidating,
    restaurantId: parseInt(restaurantId || "0"),
    branchNumber: branchNumber ? parseInt(branchNumber) : null,
  };
}
