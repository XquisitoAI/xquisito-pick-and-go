import { Mic, Plus, SendHorizontal } from "lucide-react";
import { useState } from "react";

export default function SupportTab() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "pepper"; content: string }>
  >([]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, { role: "user", content: message }]);
      setMessage("");
      // Aquí se podría conectará con Pepper
    }
  };

  return (
    <div className="h-full flex flex-1 flex-col">
      {/* Mensajes */}
      <div className="flex-1 space-y-3 md:space-y-4 lg:space-y-5 relative">
        {messages.length === 0 ? (
          <div className="flex-1 items-center justify-center h-full text-gray-400"></div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex mb-4 md:mb-5 lg:mb-6 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 text-black text-base md:text-lg lg:text-xl ${
                  msg.role === "user" ? "bg-[#ebb2f4]" : "bg-gray-100"
                }`}
              >
                <p>{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 md:gap-3 lg:gap-4 bg-gray-100 rounded-full px-6 md:px-8 lg:px-10 py-4 md:py-5 lg:py-6 border border-gray-200">
        <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <Plus className="size-6 md:size-7 lg:size-8" />
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pregunta lo que necesites..."
          className="flex-1 bg-transparent text-black text-base md:text-lg lg:text-xl placeholder-gray-500 focus:outline-none"
        />
        <button className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <Mic className="size-6 md:size-7 lg:size-8" />
        </button>
        <button
          onClick={handleSend}
          className="text-[#ebb2f4] rounded-full transition-colors disabled:text-gray-400"
          disabled={!message.trim()}
        >
          <SendHorizontal className="size-6 md:size-7 lg:size-8 -rotate-90" />
        </button>
      </div>
    </div>
  );
}
