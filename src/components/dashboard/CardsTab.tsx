"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayment } from "@/context/PaymentContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import {
  Plus,
  CreditCard,
  Trash2,
  Star,
  StarOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getCardTypeIcon } from "@/utils/cardIcons";

export default function CardsTab() {
  const router = useRouter();
  const { navigateWithTable } = useTableNavigation();
  const {
    paymentMethods,
    isLoading,
    hasPaymentMethods,
    setDefaultPaymentMethod,
    deletePaymentMethod,
  } = usePayment();

  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleAddNewCard = () => {
    navigateWithTable("/add-card");
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    setSettingDefaultId(paymentMethodId);
    try {
      await setDefaultPaymentMethod(paymentMethodId);
    } catch (error) {
      alert("Error al establecer tarjeta por defecto. Intenta de nuevo.");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
      return;
    }

    setDeletingCardId(paymentMethodId);
    try {
      await deletePaymentMethod(paymentMethodId);
    } catch (error) {
      alert("Error al eliminar la tarjeta. Intenta de nuevo.");
    } finally {
      setDeletingCardId(null);
    }
  };

  return (
    <div className="h-full flex flex-1 flex-col">
      <div className="flex-1"></div>
      <div className="flex flex-col flex-shrink-0">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {/* Payment Methods List */}
            {hasPaymentMethods ? (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`relative border rounded-full py-1.5 px-5 ${
                      method.isDefault
                        ? "border-teal-300 bg-teal-50"
                        : "border-black/50 bg-[#f9f9f9]"
                    }`}
                  >
                    {/* Default Badge */}
                    {method.isDefault && (
                      <div className="absolute -top-2 left-4 bg-teal-600 text-white text-xs px-2 py-1 rounded-full">
                        Por defecto
                      </div>
                    )}

                    <div className="flex items-center">
                      <div className="flex items-center gap-2 mx-auto">
                        <div>
                          <span className="text-2xl">
                            {getCardTypeIcon(method.cardBrand, "medium")}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-black">
                              **** **** **** {method.lastFourDigits}
                            </span>
                            <p className="text-xs text-gray-500">
                              {method.expiryMonth?.toString().padStart(2, "0")}/
                              {method.expiryYear?.toString().slice(-2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {/* Set Default Button */}
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            disabled={settingDefaultId === method.id}
                            className="text-gray-400 hover:text-teal-600 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Establecer como predeterminada"
                          >
                            {settingDefaultId === method.id ? (
                              <Loader2 className="size-5 animate-spin" />
                            ) : (
                              <StarOff className="size-5" />
                            )}
                          </button>
                        )}

                        {method.isDefault && (
                          <div
                            className="text-teal-600"
                            title="Tarjeta predeterminada"
                          >
                            <Star className="size-5 fill-current" />
                          </div>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCard(method.id)}
                          disabled={deletingCardId === method.id}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Eliminar tarjeta"
                        >
                          {deletingCardId === method.id ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <Trash2 className="size-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="size-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tienes tarjetas guardadas
                </h3>
                <p className="text-gray-500 mb-6">
                  Agrega una tarjeta para pagar más rápido en tus próximos
                  pedidos
                </p>
              </div>
            )}
          </>
        )}

        {/* Add New Card Button */}
        <button
          onClick={handleAddNewCard}
          className="mt-2 border border-black/50 flex justify-center items-center gap-1 w-full text-black py-3 rounded-full cursor-pointer transition-colors bg-[#f9f9f9] hover:bg-gray-100"
        >
          <Plus className="size-5" />
          Agregar nueva tarjeta
        </button>

        {/* Security Notice */}
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium text-sm">
                Seguridad garantizada
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Tus datos de tarjeta están protegidos con encriptación de nivel
                bancario. Solo almacenamos tokens seguros, nunca información
                sensible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
