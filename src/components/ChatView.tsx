"use client";

import { ChevronLeft, Mic, Plus, SendHorizontal } from "lucide-react";
import { useState } from "react";

interface ChatViewProps {
  onBack: () => void;
}

export default function ChatView({ onBack }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "pepper"; content: string }>
  >([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      if (!hasStartedChat) {
        setHasStartedChat(true);
      }
      setMessages([...messages, { role: "user", content: message }]);
      setMessage("");
      // Aquí se podría conectará con Pepper
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      {hasStartedChat ? (
        <div className="bg-gray-100 border-b border-gray-200 backdrop-blur-sm p-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 rounded-full p-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full border border-black/20 size-10">
              {/*<img src="/logo-short-green.webp" alt="AI" className="p-1.5" />*/}
              <video
                src="/videos/video-icon-pepper.webm"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h2 className="text-black/90 font-medium text-lg">Pepper</h2>
              {/*<p className="text-black/80 text-sm">Siempre disponible</p>*/}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-700 rounded-full py-2 transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-6" />
          </button>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        {!hasStartedChat && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 p-8">
            <div className="text-center max-w-md">
              <div className="mb-8 flex justify-center">
                <div className="rounded-full h-28 w-28 overflow-hidden flex items-center justify-center">
                  <video
                    src="/videos/video-icon-pepper.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <h2 className="text-4xl font-semibold text-black mb-8">Pepper</h2>
              <p className="text-gray-600 text-lg">
                En qué te puedo ayudar hoy?
              </p>
            </div>
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
              className={`max-w-[80%] rounded-xl px-4 py-2 text-black ${
                msg.role === "user" ? "bg-[#ebb2f4]" : "bg-gray-100"
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center py-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-6 py-4 border border-gray-200 mx-4 w-full">
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <Plus className="size-6" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pregunta lo que necesites..."
            className="flex-1 bg-transparent text-black placeholder-gray-500 focus:outline-none"
          />
          <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <Mic className="size-6" />
          </button>
          <button
            onClick={handleSend}
            className="text-[#ebb2f4] rounded-full transition-colors disabled:text-gray-400"
            disabled={!message.trim()}
          >
            <SendHorizontal className="size-6 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
