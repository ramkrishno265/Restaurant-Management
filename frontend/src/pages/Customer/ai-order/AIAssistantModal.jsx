import React, { useState, useRef } from 'react';

export default function AIAssistantModal({ onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'হ্যালো! আমি আপনার কিচেন অ্যাসিস্ট্যান্ট। আজ কী খেতে ইচ্ছে করছে বলুন?' }
  ]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // রেকর্ডিং শুরু করা
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      alert('মাইক্রোফোন এক্সেস পাওয়া যায়নি!');
    }
  };

  // রেকর্ডিং বন্ধ করা
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ব্যাকএন্ডে অডিও পাঠানো
  const sendAudioToBackend = async (blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'voice-order.webm');

    // ইউজার মেসেজ সাময়িকভাবে দেখানো
    setMessages(prev => [...prev, { sender: 'user', text: '🎙️ ভয়েস মেসেজ পাঠানো হয়েছে...' }]);

    try {
      const response = await fetch('http://localhost:5000/api/voice-order', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      // এআই এর রিপ্লাই এবং অডিও প্লে করা
      setMessages(prev => [
        ...prev.filter(m => m.text !== '🎙️ ভয়েস মেসেজ পাঠানো হয়েছে...'),
        { sender: 'user', text: data.userSaid },
        { sender: 'ai', text: data.replyText }
      ]);

      // এআই এর ভয়েস অডিও প্লে করা
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audio.play();
      }
    } catch (error) {
      console.error("API Error:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121826] border border-[#2a3756] w-full max-w-md rounded-2xl flex flex-col h-[500px] overflow-hidden shadow-2xl">
        
        {/* মোডাল হেডার */}
        <div className="bg-[#1a233a] p-4 flex justify-between items-center border-b border-[#2a3756]">
          <h3 className="font-bold text-white flex items-center gap-2">🤖 AI Order Assistant</h3>
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
            {isRecording ? "🔴 শুনছি... কথা বলুন..." : "মাইক্রোফোন বাটনে চেপে ধরে বা ট্যাপ করে কথা বলুন"}
          </p>
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
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