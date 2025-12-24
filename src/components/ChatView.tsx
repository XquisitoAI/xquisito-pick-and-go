"use client";

import { ChevronLeft, Mic, Plus, SendHorizontal } from "lucide-react";
import { useState, useRef, useEffect, useMemo, memo } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useGuest } from "@/context/GuestContext";
import { useAuth } from "@/context/AuthContext";

interface ChatViewProps {
  onBack: () => void;
}

// Función para comunicarse con el agente a través del backend
async function chatWithAgent(message: string, sessionId: string | null = null) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/ai-agent/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Error del servidor: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Componente para renderizar mensajes con imágenes (memoizado para evitar re-renders innecesarios)
const MessageContent = memo(({ content }: { content: string }) => {
  // Regex para detectar URLs de imágenes (incluyendo avif)
  const imageUrlRegex =
    /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|avif)(?:\?[^\s]*)?)/gi;

  // Dividir el contenido en partes (texto e imágenes) y memoizar el resultado
  const parts = useMemo(() => content.split(imageUrlRegex), [content]);

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        // Verificar si es una URL de imagen sin ejecutar match dos veces
        const isImage = imageUrlRegex.test(part);
        imageUrlRegex.lastIndex = 0; // Resetear el índice del regex

        if (isImage) {
          return (
            <img
              key={index}
              src={part}
              alt="Imagen del agente"
              className="rounded-lg max-w-full h-auto"
              loading="lazy"
            />
          );
        }
        return part ? (
          <p key={index} className="whitespace-pre-wrap">
            {part}
          </p>
        ) : null;
      })}
    </div>
  );
});

MessageContent.displayName = "MessageContent";

export default function ChatView({ onBack }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "pepper"; content: string }>
  >([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtener contextos
  const { restaurantId } = useRestaurant();
  const { guestId, isGuest } = useGuest();
  const { user } = useAuth();

  // Auto-scroll cuando cambian los mensajes (solo cuando hay nuevos mensajes)
  useEffect(() => {
    if (messages.length > 0) {
      // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      if (!hasStartedChat) {
        setHasStartedChat(true);
      }

      const userMessage = message;
      setMessages([...messages, { role: "user", content: userMessage }]);
      setMessage("");
      setIsLoading(true);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      try {
        // Determinar userId o guestId
        const userId = user?.id || null;
        const currentGuestId = isGuest ? guestId : null;

        // Construir el mensaje con el contexto separado
        const contextualMessage = `[CONTEXT: restaurant_id=${restaurantId || "null"}, user_id=${userId || "null"}, guest_id=${currentGuestId || "null"}]
[USER_MESSAGE: ${userMessage}]`;

        // Llamar al agente con el mensaje que incluye el contexto
        const result = await chatWithAgent(contextualMessage, sessionId);

        // Guardar el session_id si es la primera vez
        if (result.session_id && !sessionId) {
          setSessionId(result.session_id);
        }

        // Agregar la respuesta de Pepper
        setMessages((prev) => [
          ...prev,
          { role: "pepper", content: result.response },
        ]);
      } catch (error) {
        console.error("Error al comunicarse con Pepper:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "pepper",
            content:
              "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Header */}
      {hasStartedChat ? (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-100 border-b border-gray-200 backdrop-blur-sm p-4 md:p-5 lg:p-6 flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 rounded-full p-1 md:p-1.5 lg:p-2 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-6 md:size-7 lg:size-8" />
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-white rounded-full border border-black/20 size-10 md:size-12 lg:size-14">
              <video
                src="/videos/video-icon-pepper.webm"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                controls={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h2 className="text-black/90 font-medium text-lg md:text-xl lg:text-2xl">
                Pepper
              </h2>
              {/*<p className="text-black/80 text-sm md:text-base">Siempre disponible</p>*/}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 md:p-5 lg:p-6 flex items-center gap-3 md:gap-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 rounded-full py-2 md:py-2.5 lg:py-3 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-6 md:size-7 lg:size-8" />
          </button>
        </div>
      )}

      {/* Mensajes */}
      <div
        className={`${hasStartedChat ? "pt-[90px] md:pt-[115px] lg:pt-[130px] pb-[90px] md:pb-[110px] lg:pb-[130px] p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4 lg:space-y-5 overflow-y-auto" : "fixed inset-0 flex items-center justify-center"}`}
      >
        {!hasStartedChat && (
          <div className="text-center max-w-md px-8 md:px-10 lg:px-12">
            <div className="mb-8 md:mb-10 lg:mb-12 flex justify-center">
              <div className="rounded-full h-28 w-28 md:h-36 md:w-36 lg:h-40 lg:w-40 overflow-hidden flex items-center justify-center">
                <video
                  src="/videos/video-icon-pepper.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  disablePictureInPicture
                  controls={false}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-black mb-8 md:mb-10 lg:mb-12">
              Pepper
            </h2>
            <p className="text-gray-600 text-lg md:text-xl lg:text-2xl">
              En qué te puedo ayudar hoy?
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl md:rounded-2xl px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-black text-base md:text-lg lg:text-xl ${
                msg.role === "user" ? "bg-[#ebb2f4]" : "bg-gray-100"
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl md:rounded-2xl px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-black text-base md:text-lg lg:text-xl bg-gray-100">
              <p className="flex items-center gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center py-4 md:py-5 lg:py-6">
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 bg-gray-100 rounded-full px-6 md:px-8 lg:px-10 py-4 md:py-5 lg:py-6 border border-gray-200 mx-4 md:mx-6 lg:mx-8 w-full">
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <Plus className="size-6 md:size-7 lg:size-8" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pregunta lo que necesites..."
            className="flex-1 bg-transparent text-black placeholder-gray-500 focus:outline-none text-base md:text-lg lg:text-xl"
          />
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <Mic className="size-6 md:size-7 lg:size-8" />
          </button>
          <button
            onClick={handleSend}
            className="text-[#ebb2f4] rounded-full transition-colors disabled:text-gray-400"
            disabled={!message.trim() || isLoading}
          >
            <SendHorizontal className="size-6 md:size-7 lg:size-8 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
