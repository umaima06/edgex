import React, { useEffect, useRef, useState } from "react";
import {
  doc, collection, addDoc, updateDoc,
  serverTimestamp, onSnapshot, query, orderBy, deleteDoc
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebase";
import ChatBubble from "../components/ChatBubble";
import { SendHorizonal, PlusCircle, Moon, Sun } from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";

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
    } catch (err) {
      setError("❌ Invalid email or password");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white">
          🔐 Login to MoodMirror
        </h2>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full border px-3 py-2 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border px-3 py-2 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

function MoodMirror() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        listenToHistory(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    const typing = { role: "ai", text: "__typing__" };
    const newMessages = [...messages, userMsg, typing];

    setMessages(newMessages);
    setInput("");

    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are MoodMirror by Mindmorph, a friendly Gen Z AI big sibling who reads chats and gives brutally honest but warm analysis of relationships: flirt, rizz, friendzone, manipulation, or overthinking. End with real advice.",
            },
            { role: "user", content: input },
          ],
          temperature: 0.75,
        },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiReply = res.data.choices[0].message.content;
      const updatedChat = [...newMessages.slice(0, -1), { role: "ai", text: aiReply }];
      setMessages(updatedChat);
      await saveChat(updatedChat);
    } catch (err) {
      console.error("Groq error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", text: "⚠️ Something went wrong. Try again!" },
      ]);
    }
  };

  const saveChat = async (chatData) => {
    if (!userId) return;
    if (!selectedChatId) {
      const firstMsg = chatData.find((m) => m.role === "user")?.text || "Untitled";
      const docRef = await addDoc(collection(db, "moodmirror", userId, "history"), {
        title: firstMsg.slice(0, 25),
        messages: chatData,
        createdAt: serverTimestamp(),
      });
      setSelectedChatId(docRef.id);
    } else {
      const docRef = doc(db, "moodmirror", userId, "history", selectedChatId);
      await updateDoc(docRef, {
        messages: chatData,
      });
    }
  };

  const renameChat = async (id, title) => {
    const ref = doc(db, "moodmirror", userId, "history", id);
    await updateDoc(ref, { title });
  };

  const listenToHistory = (uid) => {
    const q = query(collection(db, "moodmirror", uid, "history"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      const all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(all);
    });
  };

  const loadChat = (id) => {
    const chat = history.find((c) => c.id === id);
    if (chat) {
      setMessages(chat.messages || []);
      setSelectedChatId(id);
    }
  };

  const deleteChat = async (id) => {
  if (!userId) return;
  const confirmDelete = window.confirm("Are you sure you want to delete this chat?");
  if (!confirmDelete) return;

  await deleteDoc(doc(db, "moodmirror", userId, "history", id));

  // If you were viewing this chat, reset
  if (selectedChatId === id) {
    setSelectedChatId(null);
    setMessages([]);
  }
};


  const exportChatToPDF = () => {
    const pdf = new jsPDF();
    let y = 10;
    messages.forEach(({ role, text }) => {
      const label = role === "user" ? "🧍 You:" : "🫀 MoodMirror:";
      pdf.text(`${label} ${text}`, 10, y);
      y += 10;
    });
    pdf.save("MoodMirror_Chat.pdf");
  };

  if (!userId) return <LoginModal onLogin={(uid) => setUserId(uid)} />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-pink-100 via-indigo-100 to-white dark:from-gray-900 dark:to-black font-[Poppins] text-gray-900 dark:text-white">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white/40 dark:bg-white/10 backdrop-blur-lg border-r border-white/20 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">🫀 MoodMirror</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMessages([]);
                setSelectedChatId(null);
              }}
              title="New Chat"
              className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-800"
            >
              <PlusCircle size={20} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Dark Mode"
              className="text-gray-700 dark:text-white"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {history.map((chat) => (
          <div
            key={chat.id}
            className={`p-2 rounded-md cursor-pointer hover:bg-white/20 ${
              selectedChatId === chat.id ? "bg-white/30" : ""
            }`}
            onClick={() => loadChat(chat.id)}
          >
            <input
              className="bg-transparent font-medium text-sm w-full dark:text-white"
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

      {/* Main Chat */}
      <div className="flex-1 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">
          🫀 MoodMirror: Decode the Vibe
        </h1>

        <div className="h-[65vh] overflow-y-auto space-y-4 p-4 bg-white/30 dark:bg-white/10 rounded-2xl border border-white/20">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} text={msg.text} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 flex items-center bg-white/60 dark:bg-white/20 border border-gray-300 dark:border-gray-600 rounded-xl px-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste convo or type what happened..."
            className="flex-1 bg-transparent outline-none py-3 px-2 text-gray-800 dark:text-white placeholder:text-gray-500"
          />
          <button onClick={handleSend} className="hover:text-indigo-600 transition dark:text-white">
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
  );
}

export default MoodMirror;

