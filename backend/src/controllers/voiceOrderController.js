const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/db'); // আপনার প্রজেক্টের সঠিক Prisma পাথ দিন

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

exports.handleVoiceOrder = async (req, res) => {
  try {
    // ফ্রন্টএন্ড থেকে কাস্টমারের টেক্সট এবং চাইলে কাস্টমার নাম/টেবিল ইনফো পাঠাতে পারেন
    const { userText, customerName, tableNumber } = req.body;
    console.log("🎙️ Customer Voice Text Received:", userText);

    if (!userText) {
      return res.status(400).json({ error: 'কোনো মেসেজ পাওয়া যায়নি।' });
    }

    // ১. ডাটাবেজ থেকে শুধুমাত্র এভেইলেবল (isAvailable: true) মেনু আইটেমগুলো ফেচ করা
    const restaurantMenu = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      select: {
        id: true,
        name: true,
        price: true,
        description: true
      }
    });

    if (!restaurantMenu || restaurantMenu.length === 0) {
      return res.status(200).json({
        replyText: "দুঃখিত, এই মুহূর্তে আমাদের মেনুতে কোনো খাবার এভেইলেবল নেই।"
      });
    }

    // ২. কাস্টমারের নাম অনুযায়ী সুন্দর ওয়েলকাম ও প্রম্পট তৈরি
    const displayName = customerName ? customerName : "প্রিয় অতিথি";
    const tableInfo = tableNumber ? `Table #${tableNumber}` : "";

    const systemPrompt = `
      You are a friendly and polite restaurant waiter AI assistant.
      The customer's name is ${displayName} (${tableInfo}).
      
      Current Live Menu from Database: ${JSON.stringify(restaurantMenu)}.
      
      Instructions:
      - If this is the start of the conversation or a greeting (like 'hi', 'hello', 'ki ki ase'), first warmly welcome ${displayName} by name, and suggest 1-2 popular items from the menu.
      - Respond in polite, natural Bengali.
      - If the customer orders items from the menu, confirm the items, quantities, and calculate the total price.
      - YOU MUST RETURN ONLY A VALID JSON OBJECT, NO OTHER TEXT, NO MARKDOWN.
      
      Format:
      {
        "replyText": "Your spoken response in Bengali, greeting the customer by name if appropriate",
        "orderItems": [{ "id": 1, "name": "Item Name", "quantity": 1 }],
        "isOrderConfirmed": false
      }
    `;

    const fullPrompt = `${systemPrompt}\n\nCustomer says: ${userText}`;
    
    // জেমিনি কল করা
    const response = await generateWithFallback(fullPrompt);

    let rawResponseText = response.text || "";
    rawResponseText = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let aiResponse;
    try {
      aiResponse = JSON.parse(rawResponseText);
    } catch (parseError) {
      aiResponse = {
        replyText: rawResponseText || `স্বাগতম ${displayName}! আপনার কথাটি বুঝতে পেরেছি। বলুন কী অর্ডার করতে চান।`,
        orderItems: [],
        isOrderConfirmed: false
      };
    }

    console.log("🤖 AI Response Text:", aiResponse.replyText);

    res.status(200).json({
      success: true,
      userSaid: userText,
      replyText: aiResponse.replyText || `স্বাগতম ${displayName}! আপনার অর্ডারটি গ্রহণ করা হয়েছে।`,
      orderItems: aiResponse.orderItems || [],
      isOrderConfirmed: aiResponse.isOrderConfirmed || false
    });

  } catch (error) {
    console.error("Gemini AI Order Error Details:", error.message || error);
    res.status(503).json({ 
      error: "সার্ভার এই মুহূর্তে ব্যস্ত।",
      replyText: "দুঃখিত, এআই সার্ভারটি এই মুহূর্তে একটু ব্যস্ত আছে। কয়েক সেকেন্ড পর আবার চেষ্টা করুন।"
    });
  }
};