"use client";

import { ChevronLeft, Mic, Plus, SendHorizontal } from "lucide-react";
import { useState, useRef, useEffect, memo } from "react";
import { useRestaurant } from "../context/RestaurantContext";
import { useGuest } from "../context/GuestContext";
import { useAuth } from "../context/AuthContext";

interface ChatViewProps {
  onBack: () => void;
}

// Tipo para los eventos del stream
interface StreamEvent {
  type: "token" | "done" | "error" | "session";
  content?: string;
  session_id?: string;
}

// Función para streaming con el agente
async function streamFromAgent(
  message: string,
  sessionId: string | null = null,
  onToken: (token: string) => void,
  onSessionId: (sessionId: string) => void
): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/ai-agent/chat/stream`,
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

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No se pudo obtener el reader del stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));

          if (event.type === "token" && event.content) {
            onToken(event.content);
          } else if (event.type === "session" && event.session_id) {
            onSessionId(event.session_id);
          } else if (event.type === "error") {
            throw new Error(event.content || "Error del agente");
          }
        } catch (e) {
          // Si no es JSON válido, intentar extraer el contenido directamente
          console.warn("Error parseando evento:", line);
        }
      }
    }
  }
}

// Componente para los puntos de carga animados
const LoadingDots = () => (
  <p className="flex items-center gap-1">
    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
      .
    </span>
    <span className="animate-bounce" style={{ animationDelay: "100ms" }}>
      .
    </span>
    <span className="animate-bounce" style={{ animationDelay: "200ms" }}>
      .
    </span>
  </p>
);

// Componente para renderizar mensajes con imágenes (memoizado para evitar re-renders innecesarios)
const MessageContent = memo(({ content }: { content: string }) => {
  // Si el contenido está vacío, mostrar puntos de carga
  if (!content) {
    return <LoadingDots />;
  }

  // Regex para detectar imágenes en formato Markdown: ![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  // Regex para detectar URLs directas de imágenes
  const directImageRegex =
    /(?<![(\[])(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp|svg|avif)(?:\?[^\s)]*)?)/gi;

  // Procesar el contenido
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Primero, encontrar todas las imágenes Markdown
  const matches: Array<{ index: number; length: number; type: 'markdown' | 'direct'; url: string; alt?: string }> = [];

  let match;
  while ((match = markdownImageRegex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'markdown',
      alt: match[1],
      url: match[2]
    });
  }

  // Luego, encontrar URLs directas (que no estén dentro de Markdown)
  while ((match = directImageRegex.exec(content)) !== null) {
    // Verificar que no esté dentro de un match de Markdown
    const isInsideMarkdown = matches.some(
      m => match!.index >= m.index && match!.index < m.index + m.length
    );
    if (!isInsideMarkdown) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'direct',
        url: match[0]
      });
    }
  }

  // Ordenar por posición
  matches.sort((a, b) => a.index - b.index);

  // Construir los elementos
  for (const m of matches) {
    // Agregar texto antes de la imagen
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index);
      if (text.trim()) {
        elements.push(
          <p key={key++} className="whitespace-pre-wrap">
            {text}
          </p>
        );
      }
    }

    // Agregar la imagen
    elements.push(
      <img
        key={key++}
        src={m.url}
        alt={m.alt || "Imagen del agente"}
        className="rounded-lg max-w-full h-auto"
        loading="lazy"
      />
    );

    lastIndex = m.index + m.length;
  }

  // Agregar texto restante
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) {
      elements.push(
        <p key={key++} className="whitespace-pre-wrap">
          {text}
        </p>
      );
    }
  }

  // Si no hay elementos (solo espacios), mostrar el contenido original
  if (elements.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  return <div className="space-y-2">{elements}</div>;
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
        const contextualMessage = `[CONTEXT: restaurant_id=${restaurantId || "null"}, user_id=${userId || "null"}, guest_id=${currentGuestId || "null"}, branch_number="null"]
[USER_MESSAGE: ${userMessage}]`;

        // Ocultar loading ya que veremos el texto aparecer
        setIsLoading(false);

        // Agregar mensaje vacío de Pepper que se irá llenando con el stream
        setMessages((prev) => [...prev, { role: "pepper", content: "" }]);

        // Llamar al agente con streaming
        await streamFromAgent(
          contextualMessage,
          sessionId,
          // Callback para cada token recibido
          (token) => {
            setMessages((prev) => {
              const lastIndex = prev.length - 1;
              const lastMessage = prev[lastIndex];
              if (lastMessage && lastMessage.role === "pepper") {
                // Crear nuevo array con nuevo objeto para el último mensaje
                return [
                  ...prev.slice(0, lastIndex),
                  { ...lastMessage, content: lastMessage.content + token },
                ];
              }
              return prev;
            });
          },
          // Callback para el session_id
          (newSessionId) => {
            if (!sessionId) {
              setSessionId(newSessionId);
            }
          }
        );
      } catch (error) {
        console.error("Error al comunicarse con Pepper:", error);
        setIsLoading(false);
        // Reemplazar el último mensaje (que está vacío o incompleto) con el error
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          const lastMessage = prev[lastIndex];
          if (lastMessage && lastMessage.role === "pepper") {
            return [
              ...prev.slice(0, lastIndex),
              {
                ...lastMessage,
                content:
                  "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
              },
            ];
          }
          return prev;
        });
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
            className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-500 focus:outline-none text-base md:text-lg lg:text-xl"
            style={{
              textOverflow: "ellipsis",
            }}
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
