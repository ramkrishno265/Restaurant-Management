import React, { useState, useEffect, useRef } from 'react';
import API from '../../../services/api';
import { Utensils, Check, ShoppingCart } from 'lucide-react';

export default function AIAssistantModal({ onClose, onAddToCart, customerName, tableId }) {
  // নামের শেষে কমা/স্পেস থাকলে পরিষ্কার করে নেওয়া
  const displayName = (customerName || '').replace(/[,\s]+$/, '').trim();

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: displayName
        ? `হ্যালো ${displayName}! আমি আপনার কিচেন অ্যাসিস্ট্যান্ট। আজ কী খেতে ইচ্ছে করছে বলুন?`
        : 'হ্যালো! আমি আপনার কিচেন অ্যাসিস্ট্যান্ট। আজ কী খেতে ইচ্ছে করছে বলুন?'
    }
  ]);

  // প্রতিটি প্রোডাক্টের কোয়ান্টিটি (যেমন: { 1: 2, 3: 1 })
  const [productQuantities, setProductQuantities] = useState({});
  const [addedItems, setAddedItems] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // স্পিচ রিকগনিশন
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজার বা ডিভাইসে ভয়েস কমান্ড সাপোর্ট করে না।');
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
    recognition.start();
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendTextToBackend = async (userText) => {
    if (!userText.trim() || isLoading) return;

    const newMessages = [...messages, { sender: 'user', text: userText }];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true); // typing indicator শুরু

    try {
      const response = await API.post('/voice-order', {
        userText,
        chatHistory: newMessages,
        customerName: displayName || 'প্রিয় অতিথি',
        tableNumber: String(tableId)
      });

      const data = response.data;

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.replyText,
          products: data.products || []
        }
      ]);

      speakText(data.replyText);

      // AI নিজে অর্ডার কনফার্ম করলে সরাসরি কার্টে যোগ
      if (data.isOrderConfirmed && Array.isArray(data.orderItems)) {
        data.orderItems.forEach((it) => {
          onAddToCart?.({
            id: it.id ?? it.menuItemId,
            name: it.name,
            price: it.price ?? it.unitPrice,
            imageUrl: it.imageUrl,
            quantity: it.quantity || 1
          });
        });
      }
    } catch (error) {
      console.error('API Error Details:', error.response || error);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।' }
      ]);
    } finally {
      setIsLoading(false); // typing indicator শেষ
    }
  };

  const handleIncrease = (prod) => {
    setProductQuantities((prev) => ({
      ...prev,
      [prod.id]: (prev[prod.id] || 1) + 1
    }));
  };

  const handleDecrease = (prod) => {
    setProductQuantities((prev) => {
      const currentQ = prev[prod.id] || 1;
      if (currentQ <= 1) return prev;
      return { ...prev, [prod.id]: currentQ - 1 };
    });
  };

  // কার্টে যোগ করা
  const handleAddToCart = (prod) => {
    const qty = productQuantities[prod.id] || 1;

    onAddToCart?.({ ...prod, quantity: qty });

    setAddedItems((prev) => ({ ...prev, [prod.id]: true }));
    setProductQuantities((prev) => ({ ...prev, [prod.id]: 1 }));

    // 1.5 সেকেন্ড পর বাটন আগের অবস্থায়
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [prod.id]: false }));
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121826] border border-[#2a3756] w-full max-w-md rounded-2xl flex flex-col h-[550px] overflow-hidden shadow-2xl">

        {/* হেডার */}
        <div className="bg-[#1a233a] p-4 flex justify-between items-center border-b border-[#2a3756]">
          <h3 className="font-bold text-white flex items-center gap-2">🤖 AI Order Assistant</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* চ্যাট লিস্ট */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-orange-600 text-white rounded-br-none'
                    : 'bg-[#1f293d] text-gray-200 rounded-bl-none flex flex-col gap-2.5'
                }`}
              >
                <p>{msg.text}</p>

                {msg.products && msg.products.length > 0 && (
                  <div className="grid grid-cols-1 gap-2.5 mt-2">
                    {msg.products.map((prod) => {
                      const currentQty = productQuantities[prod.id] || 1;
                      const isAdded = addedItems[prod.id];

                      return (
                        <div
                          key={prod.id}
                          className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 flex flex-col gap-2.5 shadow-md"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                                <Utensils size={18} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-white text-xs truncate">{prod.name}</h4>
                              <p className="text-[11px] text-orange-400 font-bold mt-0.5">৳{prod.price}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                              <button
                                onClick={() => handleDecrease(prod)}
                                className="px-2 py-1 text-slate-300 hover:bg-slate-700 text-xs font-bold transition"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 text-white text-xs font-bold">{currentQty}</span>
                              <button
                                onClick={() => handleIncrease(prod)}
                                className="px-2 py-1 text-slate-300 hover:bg-slate-700 text-xs font-bold transition"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => handleAddToCart(prod)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                                isAdded
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                              }`}
                            >
                              {isAdded ? (
                                <><Check size={12} /> কার্টে যুক্ত হয়েছে</>
                              ) : (
                                <><ShoppingCart size={12} /> কার্টে যোগ করুন</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1f293d] px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ইনপুট ফুটার */}
        <div className="p-4 bg-[#1a233a] border-t border-[#2a3756] flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTextToBackend(inputText)}
              disabled={isLoading}
              placeholder="এখানে লিখুন বা ভয়েস ব্যবহার করুন..."
              className="flex-1 bg-[#121826] border border-[#2a3756] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            />
            <button
              onClick={() => sendTextToBackend(inputText)}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              পাঠান
            </button>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-gray-400">
              {isRecording ? '🔴 শুনছি...' : 'ভয়েস কমান্ড দিন'}
            </span>
            <button
              onClick={startListening}
              disabled={isRecording || isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md transition-all disabled:opacity-60 ${
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