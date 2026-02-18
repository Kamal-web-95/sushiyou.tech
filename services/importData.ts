import rawData from '../public/tech_karta_2026.json';
import { TechnicalCard, Ingredient } from '../types';

// Helper to infer category - currently disabled as per request to keep categories empty
const inferCategory = (name: string): string => {
    return '';
};

export const getImportedData = (): TechnicalCard[] => {
    const importedCards: TechnicalCard[] = rawData.items.map((item: any) => {
        // Map ingredients
        const ingredients: Ingredient[] = item.ingredients.map((ing: any) => ({
            id: crypto.randomUUID(),
            name: ing.name,
            weight: ing.net_weight.raw.toString()
        }));

        // Ensure total output is string
        const totalOutput = item.yield ? item.yield.raw.toString() : '';

        return {
            id: item.id.toString(), // Keep original ID as string for now, or use UUID
            dishName: item.dish_name,
            category: inferCategory(item.dish_name),
            ingredients: ingredients,
            totalOutput: totalOutput,
            imageData: null, // Keep photos empty as requested
            lastUpdated: Date.now()
        };
    });

    return importedCards;
};

export const getImportedCategories = (): string[] => {
    const categories = new Set<string>();
    rawData.items.forEach((item: any) => {
        categories.add(inferCategory(item.dish_name));
    });
    return Array.from(categories).sort();
};
