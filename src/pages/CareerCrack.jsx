import React, { useEffect, useRef, useState } from "react";
import {
  doc, getDoc, setDoc, collection, addDoc,
  serverTimestamp, onSnapshot, query, orderBy, updateDoc
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebase";
import ChatBubble from "../components/ChatBubble";
import { SendHorizonal, Sun, Moon, PlusCircle } from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";

// 🧠 Memory extraction helper
const extractMemory = (text) => {
  const name = text.match(/(?:I am|My name is)\s+(\w+)/i)?.[1];
  const fav = text.match(/(?:I like|enjoy|love)\s+(.+?)(?=[.,]|$)/i)?.[1];
  const goal = text.match(/(?:want to be(?:come)?|dream of being)\s+(.+?)(?=[.,]|$)/i)?.[1];

  return {
    name: name || "friend",
    favSubject: fav || "design",
    goal: goal || "a designer",
  };
};

// 🔐 Login Modal
const LoginModal = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      onLogin(res.user.uid);
    } catch {
      setError("❌ Invalid email or password");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white">🔐 Login to CareerCrack</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            className="w-full border px-3 py-2 rounded-lg"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full border px-3 py-2 rounded-lg"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

function CareerCrack() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [useGroq, setUseGroq] = useState(true); // Toggle LLM source
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadMemory(user.uid);
        listenToHistory(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadMemory = async (uid) => {
    const docRef = doc(db, "memory", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const { name, favSubject, goal } = snap.data();
      setMessages([
        {
          role: "ai",
          text: `👋 Welcome back, ${name}! I remember you like ${favSubject} and dream of becoming ${goal}.`,
        },
      ]);
    }
  };

  const saveMemory = async (text) => {
    const mem = extractMemory(text);
    if (userId) await setDoc(doc(db, "memory", userId), mem);
  };

  const saveChatToFirestore = async (chatData) => {
    if (!userId) return;
    const firstMsg = chatData.find((m) => m.role === "user")?.text || "Untitled";
    const newDoc = await addDoc(collection(db, "chats", userId, "history"), {
      title: firstMsg.slice(0, 25),
      messages: chatData,
      createdAt: serverTimestamp(),
    });
    setSelectedChatId(newDoc.id);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    const typing = { role: "ai", text: "__typing__" };
    const currentChat = [...messages, userMsg, typing];
    setMessages(currentChat);
    setInput("");

    try {
      let aiReply = "";

      if (useGroq) {
        const res = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: "llama3-8b-8192",
            messages: [
              {
                role: "system",
                content: "You're CareerCrack, an AI mentor helping students pick careers. Always refer to their memory and speak like a friendly guide.",
              },
              { role: "user", content: input },
            ],
            temperature: 0.7,
          },
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        aiReply = res.data.choices[0].message.content;
      } else {
        const res = await axios.post("http://127.0.0.1:5000/ask", { prompt: input });
        aiReply = res.data.response;
      }

      await saveMemory(input);
      const updatedChat = [...currentChat.slice(0, -1), { role: "ai", text: aiReply }];
      setMessages(updatedChat);
      await saveChatToFirestore(updatedChat);
    } catch (err) {
      console.error("AI error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", text: "⚠️ Something went wrong. Try again!" },
      ]);
    }
  };

  const listenToHistory = (uid) => {
    const q = query(collection(db, "chats", uid, "history"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      const allChats = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(allChats);
    });
  };

  const renameChat = async (id, title) => {
    const ref = doc(db, "chats", userId, "history", id);
    await updateDoc(ref, { title });
  };

  const loadChat = (id) => {
    const chat = history.find((c) => c.id === id);
    if (chat) {
      setMessages(chat.messages || []);
      setSelectedChatId(id);
    }
  };

  const exportChatToPDF = () => {
  const doc = new jsPDF();
  let y = 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  messages.forEach(({ role, text }) => {
    const label = role === "user" ? "🧍 You:" : "🤖 CareerCrack:";
    const wrappedText = doc.splitTextToSize(`${label} ${text}`, 180); // Wrap to fit page width

    wrappedText.forEach((line) => {
      if (y > 280) {  // If page end reached
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 8;
    });

    y += 4; // Add spacing between messages
  });

  doc.save("CareerCrack_Chat.pdf");
};


  if (!userId) return <LoginModal onLogin={setUserId} />;

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="flex min-h-screen bg-gradient-to-br from-[#c7d2fe] via-[#e0c3fc] to-[#f9f9f9] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white font-[Poppins] transition-all">
        {/* Sidebar */}
        <div className="w-64 bg-white/40 dark:bg-gray-800/60 backdrop-blur-lg border-r border-white/20 p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">💬 Your Chats</h2>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 rounded hover:bg-white/20"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg mb-3">
            <span className="text-xs font-semibold text-gray-800 dark:text-white">🧠 Mode:</span>
            <button
              onClick={() => setUseGroq(!useGroq)}
              className="text-xs bg-white dark:bg-gray-700 px-3 py-1 rounded-md font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {useGroq ? "🌐 Groq" : "💻 Local"}
            </button>
          </div>

          <button
            onClick={() => {
              setMessages([]);
              setSelectedChatId(null);
            }}
            className="flex items-center gap-2 text-sm bg-indigo-600 text-white w-full py-2 px-3 rounded-md hover:bg-indigo-700"
          >
            <PlusCircle size={16} /> New Chat
          </button>

          {history.map((chat) => (
            <div
              key={chat.id}
              className={`p-2 rounded-md cursor-pointer hover:bg-white/20 ${
                selectedChatId === chat.id ? "bg-white/30" : ""
              }`}
              onClick={() => loadChat(chat.id)}
            >
              <input
                className="bg-transparent font-medium text-sm w-full"
                defaultValue={chat.title}
                onBlur={(e) => renameChat(chat.id, e.target.value)}
              />
              {chat.createdAt?.seconds && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  🕒 {new Date(chat.createdAt.seconds * 1000).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-4 text-center">🎓 CareerCrack</h1>
          <div className="h-96 overflow-y-auto space-y-4 p-4 bg-white/30 dark:bg-gray-800 rounded-2xl border border-white/20">
            {messages.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} text={msg.text} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 flex items-center bg-white/60 dark:bg-gray-700 border border-gray-300 rounded-xl px-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your strengths, fav subjects, hobbies?"
              className="flex-1 bg-transparent outline-none py-3 px-2 text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            <button onClick={handleSend} className="hover:text-indigo-600 transition">
              <SendHorizonal className="w-5 h-5" />
            </button>
          </div>

          <button
  onClick={exportChatToPDF}
  className="mt-6 flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
>
  📄 Export Chat
  <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
    PDF
  </span>
</button>

        </div>
      </div>
    </div>
  );
}

export default CareerCrack;
