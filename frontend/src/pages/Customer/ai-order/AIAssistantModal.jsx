import React, { useState, useEffect, useRef } from 'react';
import API from '../../../services/api';

export default function AIAssistantModal({ onClose }) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'হ্যালো! আমি আপনার কিচেন অ্যাসিস্ট্যান্ট। আজ কী খেতে ইচ্ছে করছে বলুন?' }
  ]);

  const messagesEndRef = useRef(null);

  // নতুন মেসেজ আসলে বা চ্যাট আপডেট হলে অটোমেটিক নিচের দিকে স্ক্রোল করার জন্য
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ব্রাউজারের স্পিচ রিকগনিশন (ভয়েস কমান্ডের জন্য)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজার বা ডিভাইসে ভয়েস কমান্ড সাপোর্ট করে না। দয়া করে নিচের ইনপুট বক্সে লিখে টেস্ট করুন।');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      setIsRecording(false);
      sendTextToBackend(speechText);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
    } catch (error) {
      setIsRecording(false);
    }
  };

  // টেক্সট-টু-স্পিচ দিয়ে উত্তর শোনানো
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      window.speechSynthesis.speak(utterance);
    }
  };

  // ব্যাকএন্ডে টেক্সট পাঠানো (টাইপ করে বা ভয়েস থেকে)
  const sendTextToBackend = async (userText) => {
    if (!userText.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputText(''); // ইনপুট বক্স খালি করা

    try {
      const response = await API.post('/voice-order', { userText });
      const data = response.data;

      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: data.replyText }
      ]);

      speakText(data.replyText);

      if (data.isOrderConfirmed && data.orderItems) {
        console.log("Confirmed Order Items:", data.orderItems);
      }

    } catch (error) {
      console.error("API Error Details:", error.response || error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'দুঃখিত, কথাটি বুঝতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' }
      ]);
    }
  };

  // কিবোর্ডের এন্টার (Enter) বাটন প্রেস হ্যান্ডেল করার জন্য
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendTextToBackend(inputText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121826] border border-[#2a3756] w-full max-w-md rounded-2xl flex flex-col h-[550px] overflow-hidden shadow-2xl">
        
        {/* মোডাল হেডার */}
        <div className="bg-[#1a233a] p-4 flex justify-between items-center border-b border-[#2a3756]">
          <h3 className="font-bold text-white flex items-center gap-2">🤖 AI Order Assistant</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* চ্যাট কনভারসেশন লিস্ট (অটো স্ক্রোল সহ) */}
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
          {/* স্ক্রোল করার রেফারেন্স পয়েন্ট */}
          <div ref={messagesEndRef} />
        </div>

        {/* ইনপুট বক্স এবং ভয়েস কন্ট্রোল ফুটার */}
        <div className="p-4 bg-[#1a233a] border-t border-[#2a3756] flex flex-col gap-2">
          
          {/* টাইপ করার জন্য ইনপুট এবং সেন্ড বাটন */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="এখানে লিখুন বা ভয়েস ব্যবহার করুন..."
              className="flex-1 bg-[#121826] border border-[#2a3756] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={() => sendTextToBackend(inputText)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              পাঠান
            </button>
          </div>

          {/* ভয়েস বা মাইক্রোফোন অপশন */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-400">
              {isRecording ? "🔴 শুনছি... কথা বলুন..." : "বাটনে ট্যাপ করে ভয়েস কমান্ড দিন"}
            </span>
            <button
              onClick={startListening}
              disabled={isRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md transition-all ${
                isRecording ? 'bg-red-600 animate-pulse scale-110' : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              🎙️
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}