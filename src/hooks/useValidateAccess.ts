import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useGuest } from "../context/GuestContext";

/**
 * Hook simplificado para validar acceso a restaurante y sucursal en Pick & Go
 * No requiere validación de mesa como en tap-order-and-pay
 */
export function useValidateAccess() {
  const router = useRouter();
  const params = useParams();
  const { setRestaurantAndBranch } = useGuest();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const restaurantId = params?.restaurantId as string;
  const branchNumber = params?.branchNumber as string;

  useEffect(() => {
    const validateAndSetup = async () => {
      try {
        // Validar restaurantId
        if (!restaurantId || isNaN(parseInt(restaurantId))) {
          console.error("❌ Error en restaurant ID");
          setValidationError("INVALID_RESTAURANT_ID");
          router.push("/");
          return;
        }

        // Validar branchNumber
        if (!branchNumber || isNaN(parseInt(branchNumber))) {
          console.error("❌ Error en número de sucursal");
          setValidationError("INVALID_BRANCH_NUMBER");
          router.push("/");
          return;
        }

        // Establecer contexto de restaurante y sucursal
        setRestaurantAndBranch(parseInt(restaurantId), parseInt(branchNumber));

        console.log("✅ Validation successful:", {
          restaurantId: parseInt(restaurantId),
          branchNumber: parseInt(branchNumber),
        });
        setValidationError(null);
      } catch (err) {
        console.error("❌ Validation error:", err);
        setValidationError("VALIDATION_ERROR");
      } finally {
        setIsValidating(false);
      }
    };

    validateAndSetup();
  }, [restaurantId, branchNumber, setRestaurantAndBranch, router]);

  return {
    validationError,
    isValidating,
    restaurantId: parseInt(restaurantId || "0"),
    branchNumber: parseInt(branchNumber || "0"),
  };
}
