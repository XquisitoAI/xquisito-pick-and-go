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
      <div className="flex-1 space-y-3 relative">
        {messages.length === 0 ? (
          <div className="flex-1 items-center justify-center h-full text-gray-400"></div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex mb-4 ${
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
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-6 py-4 border border-gray-200">
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
  );
}
