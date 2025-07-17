import React, { useEffect, useState } from "react";
import { FaRobot, FaUserCircle } from "react-icons/fa";

const ChatBubble = ({ role, text }) => {
  const isUser = role === "user";
  const isTyping = text === "__typing__";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (isTyping) return;

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 8); // speed of typewriter
    return () => clearInterval(interval);
  }, [text, isTyping]);

  return (
    <div
      className={`flex items-start gap-3 mb-4 ${
        isUser ? "justify-end flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div className="mt-1">
        {isUser ? (
          <FaUserCircle className="w-6 h-6 text-indigo-500 drop-shadow" />
        ) : (
          <FaRobot className="w-6 h-6 text-gray-500 drop-shadow" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-3 text-sm font-medium whitespace-pre-wrap transition-all duration-300
        ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-2xl rounded-br-none shadow-lg"
            : "bg-white/20 text-gray-900 dark:text-white border border-white/30 backdrop-blur-lg rounded-2xl rounded-bl-none shadow-inner"
        }`}
      >
        {isTyping ? (
          <div className="flex items-center space-x-1 h-5">
            <span className="animate-bounce">•</span>
            <span className="animate-bounce delay-100">•</span>
            <span className="animate-bounce delay-200">•</span>
          </div>
        ) : (
          displayedText
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
