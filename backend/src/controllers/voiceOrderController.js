const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// রেস্টুরেন্টের মেনু
const restaurantMenu = [
  { id: 1, name: "Chicken Biryani", price: 250 },
  { id: 2, name: "Beef Tehari", price: 220 },
  { id: 3, name: "Coca-Cola (250ml)", price: 40 },
  { id: 4, name: "Borhani", price: 60 }
];

exports.handleVoiceOrder = async (req, res) => {
  try {
    const { userText } = req.body;

    // 🔍 কনসোলে কাস্টমারের টেক্সট দেখার জন্য
    console.log("🎙️ Customer Voice Text Received from Frontend:", userText);

    if (!userText) {
      return res.status(400).json({ error: 'কোনো মেসেজ পাওয়া যায়নি।' });
    }

    const systemPrompt = `
      You are a friendly restaurant waiter AI assistant. 
      Current Menu: ${JSON.stringify(restaurantMenu)}.
      Respond in polite, natural Bengali. 
      If the customer orders items from the menu, confirm the items and calculate total price.
      YOU MUST RETURN ONLY A VALID JSON OBJECT, NO OTHER TEXT, NO MARKDOWN.
      Format:
      {
        "replyText": "Your spoken response in Bengali",
        "orderItems": [{ "id": 1, "name": "Item Name", "quantity": 1 }],
        "isOrderConfirmed": false
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\nCustomer says: " + userText }] }
      ]
    });

    let rawResponseText = response.text || "";
    rawResponseText = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let aiResponse;
    try {
      aiResponse = JSON.parse(rawResponseText);
    } catch (parseError) {
      aiResponse = {
        replyText: rawResponseText || "আপনার কথাটি বুঝতে পেরেছি। বলুন কী অর্ডার করতে চান।",
        orderItems: [],
        isOrderConfirmed: false
      };
    }

    // 🔍 এআই কী উত্তর দিচ্ছে সেটিও কনসোলে দেখতে চাইলে
    console.log("🤖 AI Response Text:", aiResponse.replyText);

    res.status(200).json({
      success: true,
      userSaid: userText,
      replyText: aiResponse.replyText || "আপনার অর্ডারটি গ্রহণ করা হয়েছে।",
      orderItems: aiResponse.orderItems || [],
      isOrderConfirmed: aiResponse.isOrderConfirmed || false
    });

  } catch (error) {
    console.error("Gemini AI Order Error Details:", error.message || error);
    res.status(500).json({ 
      error: "এআই প্রসেস করতে গিয়ে সমস্যা হয়েছে।",
      replyText: "দুঃখিত, এই মুহূর্তে সার্ভারে একটু সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।"
    });
  }
};