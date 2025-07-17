import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CareerCrack from "./pages/CareerCrack";
import MoodMirror from "./pages/MoodMirror";
import ScholarshipScout from "./pages/ScholarshipScout";
import SmartNotes from "./pages/SmartNotes";
import VoiceFeedback from "./pages/VoiceFeedback"; // ✅ Add this line
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/careercrack" element={<CareerCrack />} />
        <Route path="/moodmirror" element={<MoodMirror />} />
        <Route path="/scholarships" element={<ScholarshipScout />} />
        <Route path="/smartnotes" element={<SmartNotes />} />
        <Route path="/voicefeedback" element={<VoiceFeedback />} /> {/* 🎤 VoiceMirror Route */}
      </Routes>
    </Router>
  );
}

export default App;
