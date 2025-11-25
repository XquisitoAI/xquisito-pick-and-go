import { Mic, Plus, SendHorizontal } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  Dispatch,
  SetStateAction,
} from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useUser } from "@clerk/nextjs";

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

interface SupportTabProps {
  messages: Array<{ role: "user" | "pepper"; content: string }>;
  setMessages: Dispatch<
    SetStateAction<Array<{ role: "user" | "pepper"; content: string }>>
  >;
  sessionId: string | null;
  setSessionId: Dispatch<SetStateAction<string | null>>;
}

export default function SupportTab({
  messages,
  setMessages,
  sessionId,
  setSessionId,
}: SupportTabProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtener contextos
  const { restaurantId, restaurant } = useRestaurant();
  const { user } = useUser();

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
      const userMessage = message;
      setMessages([...messages, { role: "user", content: userMessage }]);
      setMessage("");
      setIsLoading(true);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      try {
        // Construir el mensaje con el contexto completo
        const userId = user?.id || null;
        const userName = user?.fullName || user?.firstName || null;

        const contextualMessage = `[CONTEXT: support_dashboard, restaurant_id=${restaurantId || "null"}, restaurant_name="${restaurant?.name || "unknown"}", user_id=${userId || "null"}, user_name="${userName || "unknown"}"]
[USER_MESSAGE: ${userMessage}]`;

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

        // Mostrar más detalles del error para debugging
        let errorMessage = "Lo siento, hubo un error al procesar tu mensaje.";
        if (error instanceof Error) {
          errorMessage += `\n\nDetalles técnicos: ${error.message}`;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "pepper",
            content: errorMessage,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-6">
      {/* Mensajes con scroll */}
      <div className="flex-1 overflow-y-auto px-1 min-h-0" style={{ maxHeight: '100%' }}>
        <div className="space-y-3 md:space-y-4 lg:space-y-5 py-2">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400">
              <div className="text-center max-w-md px-8">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full h-20 w-20 md:h-24 md:w-24 overflow-hidden flex items-center justify-center">
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
                <h3 className="text-2xl md:text-3xl font-semibold text-black mb-4">
                  Pepper
                </h3>
                <p className="text-gray-600 text-base md:text-lg">
                  ¿En qué te puedo ayudar hoy?
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-black text-base md:text-lg lg:text-xl ${
                      msg.role === "user" ? "bg-[#ebb2f4]" : "bg-gray-100"
                    }`}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-black text-base md:text-lg lg:text-xl bg-gray-100">
                    <p className="flex items-center gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce delay-100">.</span>
                      <span className="animate-bounce delay-200">.</span>
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input fijado en la parte inferior */}
      <div className="flex-shrink-0 pt-4">
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 bg-gray-100 rounded-full px-6 md:px-8 lg:px-10 py-4 md:py-5 lg:py-6 border border-gray-200">
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <Plus className="size-6 md:size-7 lg:size-8" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Pregunta lo que necesites..."
            className="flex-1 bg-transparent text-black text-base md:text-lg lg:text-xl placeholder-gray-500 focus:outline-none"
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
