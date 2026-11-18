const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/db'); // আপনার প্রজেক্টের সঠিক Prisma পাথ

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// মডেল ফলব্যাক ফাংশন
async function generateWithFallback(promptText) {
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  
  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: promptText }] }]
      });
      return response;
    } catch (err) {
      console.warn(`⚠️ Model ${modelName} unavailable, trying next...`);
      if (modelName === models[models.length - 1]) {
        throw err;
      }
    }
  }
}

// ... আগের ইম্পোর্ট ও ফলব্যাক কোড একই থাকবে ...

exports.handleVoiceOrder = async (req, res) => {
  try {
    const { userText, chatHistory, customerName, tableNumber } = req.body;
    console.log("🎙️ Customer Voice Text Received:", userText);

    if (!userText) {
      return res.status(400).json({ error: 'কোনো মেসেজ পাওয়া যায়নি।' });
    }

    const restaurantMenu = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      select: { id: true, name: true, price: true, description: true, imageUrl: true }
    });

    const displayName = customerName ? customerName : "প্রিয় অতিথি";
    const tableInfo = tableNumber ? `Table #${tableNumber}` : "";

    const systemInstruction = `
      You are a friendly and polite restaurant waiter AI assistant.
      The customer's name is ${displayName} (${tableInfo}).
      Current Live Menu from Database: ${JSON.stringify(restaurantMenu)}.
      
      Instructions:
      - Remember previous chat context (e.g., if talking about lassi, maintain that context).
      - Respond in polite, natural Bengali.
      - If the customer asks about items or prices, include relevant items inside the "products" array.
      - If they order, populate "orderItems".
      - YOU MUST RETURN ONLY A VALID JSON OBJECT, NO OTHER TEXT, NO MARKDOWN.
      
      Format:
      {
        "replyText": "Your spoken response in Bengali",
        "products": [{ "id": 1, "name": "Item Name", "price": 100, "imageUrl": "..." }],
        "orderItems": [],
        "isOrderConfirmed": false
      }
    `;

    // 🌟 চ্যাট হিস্ট্রি জেমিনির ফরম্যাটে রূপান্তর করা
    let contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      contents = chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
    } else {
      contents = [{ role: 'user', parts: [{ text: userText }] }];
    }

    // প্রথম বায়ে সিস্টেম ইন্সট্রাকশন বা প্রম্পট যুক্ত করা
    const fullPromptText = `${systemInstruction}\n\nUser latest input: ${userText}`;
    contents[contents.length - 1] = {
      role: 'user',
      parts: [{ text: fullPromptText }]
    };

    const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    let response;
    
    for (const modelName of models) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contents // 🌟 পুরো চ্যাট হিস্ট্রি সহ পাস করা হলো
        });
        break;
      } catch (err) {
        console.warn(`⚠️ Model ${modelName} unavailable, trying next...`);
        if (modelName === models[models.length - 1]) throw err;
      }
    }

    let rawResponseText = response.text || "";
    rawResponseText = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let aiResponse;
    try {
      aiResponse = JSON.parse(rawResponseText);
    } catch (parseError) {
      aiResponse = {
        replyText: rawResponseText || "আপনার কথাটি বুঝতে পেরেছি।",
        products: [],
        orderItems: [],
        isOrderConfirmed: false
      };
    }

    res.status(200).json({
      success: true,
      userSaid: userText,
      replyText: aiResponse.replyText,
      products: aiResponse.products || [],
      orderItems: aiResponse.orderItems || [],
      isOrderConfirmed: aiResponse.isOrderConfirmed || false
    });

  } catch (error) {
    console.error("Gemini AI Order Error Details:", error.message || error);
    res.status(503).json({ 
      replyText: "দুঃখিত, এআই সার্ভারটি এই মুহূর্তে একটু ব্যস্ত আছে। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।"
    });
  }
};