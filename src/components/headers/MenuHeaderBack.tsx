"use client";

import { Restaurant } from "@/interfaces/restaurant";
import { useTable } from "@/context/TableContext";
import { useTableNavigation } from "@/hooks/useTableNavigation";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { apiService } from "@/utils/api";

interface MenuHeaderProps {
  tableNumber?: string;
}

interface UserImageData {
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}

export default function MenuHeaderBack({ tableNumber }: MenuHeaderProps) {
  const router = useRouter();
  const { state } = useTable();
  const { navigateWithTable, goBack } = useTableNavigation();
  const pathname = usePathname();
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [usersImages, setUsersImages] = useState<Record<string, UserImageData>>(
    {}
  );
  const { user, isLoaded } = useUser();

  const handleBack = () => {
    router.back();
  };

  const handleCartClick = () => {
    navigateWithTable("/cart");
  };

  // Extraer user_ids únicos y memoizarlos
  const userIdsString = useMemo(() => {
    const userIds = new Set<string>();

    if (Array.isArray(state.activeUsers)) {
      state.activeUsers.forEach((u) => {
        if (u.user_id) userIds.add(u.user_id);
      });
    }

    if (Array.isArray(state.dishOrders)) {
      state.dishOrders.forEach((order) => {
        if (order.user_id) userIds.add(order.user_id);
      });
    }

    // Convertir a string ordenado para comparación estable
    return Array.from(userIds).sort().join(",");
  }, [state.activeUsers, state.dishOrders]);

  // Cargar imágenes de usuarios autenticados
  // IMPORTANTE: Esto funciona tanto para usuarios autenticados como invitados
  // Los invitados también pueden ver las fotos de usuarios autenticados en la mesa
  useEffect(() => {
    const loadUsersImages = async () => {
      if (!userIdsString) return;

      const userIdsArray = userIdsString.split(",").filter(Boolean);
      if (userIdsArray.length === 0) return;

      try {
        const response = await apiService.getUsersInfo(userIdsArray);

        if (response.success && response.data) {
          // El backend retorna { success: true, data: { userId: {...} } }
          // Pero la estructura real tiene doble data, así que usamos response.data directamente
          const usersData = (response.data as any).data || response.data;
          setUsersImages(usersData as Record<string, UserImageData>);
          console.log("✅ Imágenes cargadas:", usersData);
        }
      } catch (error) {
        console.error("❌ Error loading users images:", error);
      }
    };

    loadUsersImages();
  }, [userIdsString]);

  // Extraer participantes únicos con información completa (guest_name y user_id)
  const participantsMap = new Map<
    string,
    { guest_name: string; user_id: string | null }
  >();

  // Agregar de activeUsers
  if (Array.isArray(state.activeUsers)) {
    state.activeUsers.forEach((activeUser) => {
      if (activeUser.guest_name) {
        participantsMap.set(activeUser.guest_name, {
          guest_name: activeUser.guest_name,
          user_id: activeUser.user_id || null,
        });
      }
    });
  }

  // Agregar de dishOrders (solo si no existe ya)
  if (Array.isArray(state.dishOrders)) {
    state.dishOrders.forEach((order) => {
      if (order.guest_name && !participantsMap.has(order.guest_name)) {
        participantsMap.set(order.guest_name, {
          guest_name: order.guest_name,
          user_id: order.user_id || null,
        });
      }
    });
  }

  const participants = Array.from(participantsMap.values());
  const visibleParticipants = participants.slice(0, 2);
  const remainingCount = participants.length - 2;

  // Verificar si un participante es el usuario actual autenticado
  const isCurrentUser = (participant: {
    guest_name: string;
    user_id: string | null;
  }) => {
    return user && participant.user_id === user.id;
  };

  // Obtener el nombre a mostrar (nombre real si es usuario autenticado, o guest_name)
  const getDisplayName = (participant: {
    guest_name: string;
    user_id: string | null;
  }) => {
    // Si es el usuario actual, usar datos de Clerk directamente
    if (isCurrentUser(participant) && user) {
      return user.fullName || user.firstName || participant.guest_name;
    }

    // Si tiene user_id y tenemos sus datos cargados, usar el nombre real
    if (participant.user_id && usersImages[participant.user_id]) {
      const userData = usersImages[participant.user_id];
      return userData.fullName || userData.firstName || participant.guest_name;
    }

    // Si no, usar guest_name
    return participant.guest_name;
  };

  // Obtener imagen de usuario (para usuarios que no son el actual)
  const getUserImage = (participant: {
    guest_name: string;
    user_id: string | null;
  }) => {
    if (participant.user_id && usersImages[participant.user_id]) {
      return usersImages[participant.user_id].imageUrl;
    }
    return null;
  };

  // Generar inicial
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Generar colos segun el nombre (siempre el mismo color para ese nombre)
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-violet-500",
      "bg-rose-500",
      "bg-lime-500",
      "bg-amber-500",
      "bg-sky-500",
      "bg-fuchsia-500",
      "bg-slate-500",
      "bg-zinc-500",
      "bg-neutral-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <header className="container mx-auto px-5 pt-5 z-10">
      <div className="relative flex items-center justify-between z-10">
        {/* Back */}
        <div className="flex items-center z-10">
          <div
            onClick={handleBack}
            className="size-10 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="text-primary" />
          </div>
        </div>

        {/* Xquisito Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 size-10">
          <img src="/logo-short-green.webp" alt="Xquisito Logo" />
        </div>

        {/* Participantes */}
        {!isLoaded ? (
          // Loading
          <div className="flex items-center space-x-1">
            <div className="size-10 bg-gray-300 animate-pulse rounded-full border border-white shadow-sm"></div>
          </div>
        ) : participants.length > 0 ? (
          <div className="flex items-center space-x-1">
            {remainingCount > 0 && (
              <div
                onClick={() => setIsParticipantsModalOpen(true)}
                className="size-10 bg-white rounded-full flex items-center justify-center text-black text-base font-medium border border-[#8e8e8e] shadow-sm cursor-pointer"
              >
                +{remainingCount}
              </div>
            )}
            {visibleParticipants.map((participant, index) => {
              const isCurrent = isCurrentUser(participant);
              const displayName = getDisplayName(participant);
              const userImage =
                isCurrent && user?.imageUrl
                  ? user.imageUrl
                  : getUserImage(participant);
              const hasImage = !!userImage;

              return (
                <div
                  key={participant.guest_name}
                  onClick={() => setIsParticipantsModalOpen(true)}
                  className={`size-10 rounded-full flex items-center justify-center text-white text-base font-medium border border-white shadow-sm cursor-pointer overflow-hidden ${!hasImage ? getAvatarColor(displayName) : ""}`}
                  style={{
                    marginLeft: remainingCount > 0 || index > 0 ? "-12px" : "0",
                  }}
                >
                  {hasImage ? (
                    <img
                      src={userImage}
                      alt={displayName}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Cart and order buttons - Available if needed */}
      </div>

      {/* Modal participantes */}
      {isParticipantsModalOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsParticipantsModalOpen(false)}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-t-4xl w-full mx-4">
            {/* Titulo */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg font-semibold text-black">
                  Participantes
                </h3>
                <button
                  onClick={() => setIsParticipantsModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Lista de participantes */}
            <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
              {participants.map((participant) => {
                const isCurrent = isCurrentUser(participant);
                const displayName = getDisplayName(participant);
                const userImage =
                  isCurrent && user?.imageUrl
                    ? user.imageUrl
                    : getUserImage(participant);
                const hasImage = !!userImage;

                return (
                  <div
                    key={participant.guest_name}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`size-12 rounded-full flex items-center justify-center text-white text-base font-semibold overflow-hidden ${!hasImage ? getAvatarColor(displayName) : ""}`}
                    >
                      {hasImage ? (
                        <img
                          src={userImage}
                          alt={displayName}
                          className="size-12 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-black">
                        {displayName}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-primary">
                            (Tú)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[#8e8e8e]">
                        {(() => {
                          const userOrders = Array.isArray(state.dishOrders)
                            ? state.dishOrders.filter(
                                (order) =>
                                  order.guest_name === participant.guest_name
                              )
                            : [];

                          const dishCount = userOrders.length;
                          const totalValue = userOrders.reduce(
                            (sum, order) => sum + order.total_price,
                            0
                          );

                          // También mostrar información de activeUsers si está disponible
                          const activeUser = Array.isArray(state.activeUsers)
                            ? state.activeUsers.find(
                                (u) => u.guest_name === participant.guest_name
                              )
                            : null;

                          if (dishCount === 0 && activeUser) {
                            return "Usuario activo en mesa";
                          }

                          return `$${totalValue.toFixed(2)}`;
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
