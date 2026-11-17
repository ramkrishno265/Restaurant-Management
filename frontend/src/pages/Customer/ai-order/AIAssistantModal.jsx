import React, { useState } from 'react';
import API from '../../../services/api'; // আপনার প্রজেক্টের এপিআই সার্ভিস

export default function AIAssistantModal({ onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'হ্যালো! আমি আপনার কিচেন অ্যাসিস্ট্যান্ট। আজ কী খেতে ইচ্ছে করছে বলুন?' }
  ]);

  // ব্রাউজারের নিজস্ব Web Speech API দিয়ে ভয়েস রেকর্ড ও টেক্সট কনভার্ট করা
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজার ভয়েস কমান্ড সাপোর্ট করে না। দয়া করে Google Chrome ব্যবহার করুন।');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD'; // বাংলা ভাষা সেট করা
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event) => {
      const speechText = event.results[0][0].transcript;
      setIsRecording(false);
      
      // কাস্টমারের বলা কথাটি চ্যাটে যুক্ত করা এবং ব্যাকএন্ডে পাঠানো
      sendTextToBackend(speechText);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      alert('ভয়েস বুঝতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Recognition start error:", error);
      setIsRecording(false);
    }
  };

  // ব্রাউজারের টেক্সট-টু-স্পিচ দিয়ে এআই-এর উত্তর মুখে বলিয়ে শোনানো (১০০% ফ্রি)
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD'; // বাংলা উচ্চারণ
      utterance.rate = 1.0; // স্পিড স্বাভাবিক রাখা
      window.speechSynthesis.speak(utterance);
    }
  };

  // জেমিনির জন্য ব্যাকএন্ডে টেক্সট পাঠানো
  const sendTextToBackend = async (userText) => {
    // ইউজার মেসেজ সাময়িকভাবে চ্যাটে দেখানো
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);

    try {
      // ব্যাকএন্ডে রিকোয়েস্ট পাঠানো (যেখানে জেমিনি API কাজ করবে)
      const response = await API.post('/voice-order', { userText });
      const data = response.data;

      // এআই এর রিপ্লাই চ্যাটে যুক্ত করা
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: data.replyText }
      ]);

      // ব্রাউজারের মাধ্যমে এআই-এর উত্তর ভয়েসে বলিয়ে শোনানো
      speakText(data.replyText);

      // যদি অর্ডার কনফার্ম হয়ে যায়, তবে কার্ট বা অর্ডারে যুক্ত করতে পারেন
      if (data.isOrderConfirmed && data.orderItems) {
        console.log("Confirmed Order Items:", data.orderItems);
      }

    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'দুঃখিত, কথাটি বুঝতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' }
      ]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121826] border border-[#2a3756] w-full max-w-md rounded-2xl flex flex-col h-[500px] overflow-hidden shadow-2xl">
        
        {/* মোডাল হেডার */}
        <div className="bg-[#1a233a] p-4 flex justify-between items-center border-b border-[#2a3756]">
          <h3 className="font-bold text-white flex items-center gap-2">🤖 AI Order Assistant (Free)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* চ্যাট কনভারসেশন লিস্ট */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.sender === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-[#1f293d] text-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* ভয়েস কন্ট্রোল ফুটার */}
        <div className="p-4 bg-[#1a233a] border-t border-[#2a3756] flex flex-col items-center">
          <p className="text-xs text-gray-400 mb-3">
            {isRecording ? "🔴 শুনছি... কথা বলুন..." : "মাইক্রোফোন ট্যাপ করে কথা বলা শুরু করুন"}
          </p>
          <button
            onClick={startListening}
            disabled={isRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all ${
              isRecording ? 'bg-red-600 animate-pulse scale-110' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            🎙️
          </button>
        </div>

      </div>
    </div>
  );
}