import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeneratedRecipe {
  ingredients: { name: string; weight: string }[];
  totalOutput: string;
}

export const generateRecipeData = async (dishName: string): Promise<GeneratedRecipe> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a technical card structure for a dish named "${dishName}". 
      List the ingredients with their typical net weights (in grams or units) for a single serving. 
      Estimate the total output weight.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the ingredient in Russian" },
                  weight: { type: Type.STRING, description: "Net weight, e.g., '140', '1/2', '15'" }
                },
                required: ["name", "weight"]
              }
            },
            totalOutput: { type: Type.STRING, description: "Total weight of the dish in grams, e.g. '350 г'" }
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
    throw error;
  }
};
