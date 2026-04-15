"use client";

import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/hooks/useNavigation";
import { useRestaurant } from "@/context/RestaurantContext";
import { useEffect, useState } from "react";
import MenuHeaderBack from "@/components/headers/MenuHeaderBack";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { useBranch } from "@/context/BranchContext";
import BranchSelectionModal from "@/components/modals/BranchSelectionModal";
import Loader from "@/components/UI/Loader";
import { calculateCommissions } from "@/utils/commissionCalculator";
import { restaurantService } from "@/services/restaurant.service";
import { cartService } from "@/services/cart.service";
import PickupTimeSelector from "@/components/UI/PickupTimeSelector";

export default function OrderConfirmPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { state: cartState, refreshCart } = useCart();
  const { navigateWithRestaurantId, changeBranch } = useNavigation();
  const { branches, selectedBranchNumber, fetchBranches } = useBranch();

  const baseAmount = cartState.totalPrice;
  const MINIMUM_AMOUNT = 20;

  const [tipPercentage, setTipPercentage] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);
  const [scheduledPickupTime, setScheduledPickupTime] = useState<string | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showBranchChangeConfirmModal, setShowBranchChangeConfirmModal] = useState(false);
  const [pendingBranchChange, setPendingBranchChange] = useState<number | null>(null);
  const [itemsToRemove, setItemsToRemove] = useState<typeof cartState.items>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const calculateTipAmount = () => {
    if (customTip && parseFloat(customTip) > 0) {
      return parseFloat(customTip);
    }
    return (baseAmount * tipPercentage) / 100;
  };

  const tipAmount = calculateTipAmount();
  const commissions = calculateCommissions(baseAmount, tipAmount);
  const { totalAmountCharged: totalAmount } = commissions;

  const isUnderMinimum = totalAmount < MINIMUM_AMOUNT;

  useEffect(() => {
    if (!cartState.isLoading) {
      setIsLoadingInitial(false);
    }
  }, [cartState.isLoading]);

  useEffect(() => {
    if (restaurantId) {
      fetchBranches(parseInt(restaurantId));
    }
  }, [restaurantId, fetchBranches]);

  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    setCustomTip("");
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setTipPercentage(0);
  };

  const checkItemsAvailability = async (newBranchNumber: number) => {
    setIsCheckingAvailability(true);
    try {
      const menuData = await restaurantService.getRestaurantWithMenuByBranch(
        parseInt(restaurantId),
        newBranchNumber,
      );
      const availableMenuItemIds = new Set<number>();
      menuData.menu.forEach((section) => {
        section.items.forEach((item) => {
          availableMenuItemIds.add(item.id);
        });
      });
      const unavailableItems = cartState.items.filter(
        (cartItem) => !availableMenuItemIds.has(cartItem.id),
      );
      setItemsToRemove(unavailableItems);
      return unavailableItems;
    } catch (error) {
      console.error("Error checking items availability:", error);
      setItemsToRemove([]);
      return [];
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleContinue = () => {
    if (branches.length > 1 && !selectedBranchNumber) {
      setShowBranchModal(true);
      return;
    }
    const qs = new URLSearchParams();
    qs.set("tipAmount", tipAmount.toFixed(2));
    if (scheduledPickupTime) {
      qs.set("scheduledPickupTime", scheduledPickupTime);
    }
    navigateWithRestaurantId(`/card-selection?${qs.toString()}`);
  };

  if (isLoadingInitial) {
    return <Loader />;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      {/* Header fijo */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <MenuHeaderBack />
      </div>
      <div className="h-20" />

      {/* Tarjeta anclada al fondo */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
        <div className="flex flex-col relative w-full">
          <div className="bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
            <div className="py-6 px-8 flex flex-col justify-center">
              <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
                Confirmar pedido
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-t-4xl relative z-10 flex flex-col px-8 py-8 overflow-y-auto max-h-[calc(100dvh-8rem)]">
              {/* Sucursal */}
              {branches.length > 0 && (
                <div
                  className={`mb-4 flex items-center justify-between w-full ${branches.length > 1 ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                  onClick={() => branches.length > 1 && setShowBranchModal(true)}
                >
                  {selectedBranchNumber ? (
                    <p className="text-gray-600 text-base">
                      Sucursal:{" "}
                      <span className="font-medium text-black">
                        {branches.find((b) => b.branch_number === selectedBranchNumber)?.name || "Principal"}
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

              {/* Hora de recolección */}
              <PickupTimeSelector
                selectedTime={scheduledPickupTime}
                onTimeChange={setScheduledPickupTime}
                estimatedMinutes={25}
              />

              {/* Subtotal */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-black font-medium">Subtotal</span>
                  <span className="text-black font-medium">
                    ${baseAmount.toFixed(2)} MXN
                  </span>
                </div>
              </div>

              {/* Propina */}
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-black font-medium text-base md:text-lg lg:text-xl whitespace-nowrap">
                    Propina
                  </span>
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

              {/* Alerta mínimo */}
              {isUnderMinimum && totalAmount > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 px-6 py-3 -mx-8 rounded-lg">
                  <div className="flex justify-center items-center gap-3">
                    <X className="size-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 font-medium text-base md:text-lg">
                      ¡El mínimo de compra es de ${MINIMUM_AMOUNT.toFixed(2)}!
                    </p>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center border-t pt-4 mb-6">
                <span className="text-black font-medium text-base md:text-lg lg:text-xl">
                  Total a pagar
                </span>
                <span className="font-medium text-black text-base md:text-lg lg:text-xl">
                  ${totalAmount.toFixed(2)} MXN
                </span>
              </div>

              {/* Botón continuar */}
              <button
                onClick={handleContinue}
                disabled={isUnderMinimum || (branches.length > 1 && !selectedBranchNumber)}
                className={`w-full text-white py-3 rounded-full cursor-pointer transition-all active:scale-90 ${
                  isUnderMinimum || (branches.length > 1 && !selectedBranchNumber)
                    ? "bg-gradient-to-r from-[#34808C] to-[#173E44] opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#34808C] to-[#173E44]"
                }`}
              >
                {branches.length > 1 && !selectedBranchNumber
                  ? "Selecciona una sucursal"
                  : "Continuar"}
              </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de cambio de sucursal */}
      {showBranchChangeConfirmModal && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!isCheckingAvailability) {
                setShowBranchChangeConfirmModal(false);
                setPendingBranchChange(null);
                setItemsToRemove([]);
              }
            }}
          />
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
                            for (const item of itemsToRemove) {
                              if (item.cartItemId) {
                                try {
                                  await cartService.removeFromCart(item.cartItemId);
                                } catch (error) {
                                  console.error("Error removing unavailable item:", error);
                                }
                              }
                            }
                            changeBranch(pendingBranchChange);
                            await refreshCart();
                            setIsCheckingAvailability(false);
                            setShowBranchChangeConfirmModal(false);
                            setShowBranchModal(false);
                            setPendingBranchChange(null);
                            setItemsToRemove([]);
                          } catch (error) {
                            console.error("Error during branch change:", error);
                            setIsCheckingAvailability(false);
                            alert("Hubo un error al cambiar de sucursal. Por favor intenta de nuevo.");
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

      {/* Modal selección de sucursal */}
      <BranchSelectionModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onBranchChangeRequested={async (newBranchNumber) => {
          setPendingBranchChange(newBranchNumber);
          setShowBranchModal(false);
          setShowBranchChangeConfirmModal(true);
          setIsCheckingAvailability(true);
          await checkItemsAvailability(newBranchNumber);
        }}
      />
    </div>
  );
}
