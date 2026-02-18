import { GoogleGenAI } from "@google/genai";

// Lazy initialization to prevent app crash if key is missing
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key for Gemini is missing. Please add VITE_GEMINI_API_KEY to .env.local");
  }
  return new GoogleGenAI({ apiKey });
};

interface GeneratedRecipe {
  ingredients: { name: string; weight: string }[];
  totalOutput: string;
}

export const generateRecipeData = async (dishName: string): Promise<GeneratedRecipe> => {
  try {
    const ai = getAiClient();

    // Check if models property exists or use correct instantiation for the SDK version
    // Assuming the SDK usage was correct in previous code but just the init was wrong.
    // However, the previous code used `ai.models.generateContent`. 
    // If GoogleGenAI instance has models, we use it. 
    // Note: The import was `import { GoogleGenAI, Type }` but maybe `SchemaType` is better? 
    // The previous code had `Type.OBJECT`. I'll stick to what was there or what seems standard.
    // Actually, looking at previous code: `import { GoogleGenAI, Type } from "@google/genai";`
    // I will try to keep it simple.

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Updated to a stable model or keep preview if user wants
      contents: `Create a technical card structure for a dish named "${dishName}". 
      List the ingredients with their typical net weights (in grams or units) for a single serving. 
      Estimate the total output weight.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            ingredients: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "Name of the ingredient in Russian" },
                  weight: { type: "STRING", description: "Net weight, e.g., '140', '1/2', '15'" }
                },
                required: ["name", "weight"]
              }
            },
            totalOutput: { type: "STRING", description: "Total weight of the dish in grams, e.g. '350 г'" }
          },
          required: ["ingredients", "totalOutput"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedRecipe;
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Error generating recipe:", error);
    // Return empty/safe object or rethrow? Rethrow so UI can show error.
    throw error;
  }
};
