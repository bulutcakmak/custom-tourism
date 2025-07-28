// File: /api/getRecommendations.js

export default async function handler(req, res) {
  // We only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the data the user sent from the frontend
  const { profile, city, images } = req.body;

  // Securely get the API key from the server's environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'API key is not configured on the server.' });
  }

  const prompt = `
      Based on the following user profile (text and images), generate 3 personalized travel recommendations for a trip to ${city}.
      The user's text description is: "${profile}". The images provide additional context about their hobbies and interests. Analyze everything to create a holistic profile.

      For each recommendation, provide:
      1. A suitable title (e.g., "Hike the Coastal Trail").
      2. A one-paragraph explanation of why this recommendation fits the user's profile, referencing both text and image content if applicable.
      3. A suggested activity at that location.

      Format the output as a JSON object with a single key "recommendations", which is an array of objects. Each object in the array should have three properties: "title", "explanation", and "activity".
  `;

  const parts = [{ text: prompt }];
  images.forEach(img => {
      parts.push({
          inlineData: {
              mimeType: img.file.type,
              data: img.base64.split(',')[1]
          }
      });
  });

  const payload = {
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
              type: "OBJECT",
              properties: {
                  "recommendations": {
                      type: "ARRAY",
                      items: {
                          type: "OBJECT",
                          properties: {
                              "title": { "type": "STRING" },
                              "explanation": { "type": "STRING" },
                              "activity": { "type": "STRING" }
                          },
                          required: ["title", "explanation", "activity"]
                      }
                  }
              },
              required: ["recommendations"]
          }
      }
  };

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        throw new Error(`Gemini API failed with status: ${geminiResponse.status}. Body: ${errorBody}`);
    }

    const result = await geminiResponse.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = result.candidates[0].content.parts[0].text;
        const parsedJson = JSON.parse(responseText);
        // Send the successful response back to the frontend
        return res.status(200).json(parsedJson.recommendations);
    } else {
        throw new Error('Invalid response structure from Gemini API.');
    }

  } catch (error) {
    console.error("Error in serverless function:", error.message);
    return res.status(500).json({ message: "Failed to get recommendations.", error: error.message });
  }
}