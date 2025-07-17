import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

function SmartNotes() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Paste your class notes and I’ll summarize and tag them for you." },
  ]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Fake loading response
    setMessages((prev) => [...prev, { from: "bot", text: "Thinking..." }]);

    setTimeout(() => {
      const botResponse = {
        from: "bot",
        text: `✅ Summary:\n- ${input
          .split(".")
          .slice(0, 3)
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n- ")}\n\n🏷️ Tags: [Conceptual, Important, Notes]`,
      };

      setMessages((prev) => [...prev.slice(0, -1), botResponse]);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white flex flex-col">
      <header className="p-4 bg-[#12121c] text-center shadow-md text-xl font-bold text-purple-400">
        📝 Smart Notes AI
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-xl p-4 rounded-lg ${
              msg.from === "user"
                ? "ml-auto bg-purple-600 text-white"
                : "bg-[#1a1a2e] text-gray-200"
            }`}
          >
            {msg.text.split("\n").map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-[#0e0e1a] flex gap-2 border-t border-white/10">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste your class notes or questions..."
          className="flex-1 p-3 bg-[#12121c] rounded-lg resize-none text-white border border-white/10 outline-none"
          rows={2}
        />
        <button
          onClick={handleSend}
          className="bg-purple-600 hover:bg-purple-700 p-3 rounded-lg text-white flex items-center gap-2"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

export default SmartNotes;
