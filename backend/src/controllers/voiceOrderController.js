const { GoogleGenAI } = require('@google/genai');

// জেমিনি ক্লাইন্ট ইনিশিয়ালাইজ করা
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
    // ফ্রন্টএন্ড থেকে যদি সরাসরি টেক্সট পাঠানো হয় (ব্রাউজারের Web Speech API ব্যবহারের পর)
    const { userText } = req.body;

    if (!userText) {
      return res.status(400).json({ error: 'কোনো মেসেজ পাওয়া যায়নি।' });
    }

    const systemPrompt = `
      You are a friendly restaurant waiter AI assistant. 
      Current Menu: ${JSON.stringify(restaurantMenu)}.
      Respond in polite, natural Bengali. 
      If the customer orders items from the menu, confirm the items and calculate total price.
      Always return a valid JSON response in this exact format (no extra text, only JSON):
      {
        "replyText": "Your spoken response in Bengali",
        "orderItems": [{ "id": 1, "name": "Item Name", "quantity": 1 }],
        "isOrderConfirmed": false
      }
    `;

    // জেমিনি মডেল কল করা (gemini-2.5-flash ব্যবহার করা সবচেয়ে দ্রুত এবং সেরা)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\nCustomer says: " + userText }] }
      ]
    });

    let rawResponseText = response.text;
    
    // অনেক সময় জেমিনি মার্কডাউন কোড ব্লক (```json ... ```) সহ রিটার্ন করে, সেটি পরিষ্কার করার জন্য:
    rawResponseText = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const aiResponse = JSON.parse(rawResponseText);

    res.status(200).json({
      success: true,
      userSaid: userText,
      replyText: aiResponse.replyText,
      orderItems: aiResponse.orderItems,
      isOrderConfirmed: aiResponse.isOrderConfirmed
    });

  } catch (error) {
    console.error("Gemini AI Order Error:", error);
    res.status(500).json({ error: "এআই প্রসেস করতে গিয়ে সমস্যা হয়েছে।" });
  }
};