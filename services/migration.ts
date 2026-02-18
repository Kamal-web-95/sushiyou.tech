import { supabase } from '../lib/supabase';
import { TechnicalCard } from '../types';
import { STORAGE_KEY, STORAGE_KEY_INGREDIENTS } from '../constants';

export const migrateDataToSupabase = async () => {
    const localCardsStr = localStorage.getItem(STORAGE_KEY);
    const localIngredientsStr = localStorage.getItem(STORAGE_KEY_INGREDIENTS);

    if (!localCardsStr) return { success: false, message: "No local cards found" };

    try {
        const cards: TechnicalCard[] = JSON.parse(localCardsStr);

        // 1. Upload Ingredients (deduplicated)
        const ingredients = localIngredientsStr ? JSON.parse(localIngredientsStr) : [];
        if (ingredients.length > 0) {
            const { error: ingError } = await supabase
                .from('ingredients')
                .upsert(ingredients.map((i: any) => ({ name: i.name })), { onConflict: 'name', ignoreDuplicates: true });

            if (ingError) console.error("Ingredients upload error:", ingError);
        }

        // 2. Upload Cards
        // We need to map TechnicalCard keys to DB columns if they differ, or rely on JS->JSONB
        // The schema has columns: dish_name, category, image_data, ingredients (jsonb), cooking_method, total_output

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "User not logged in" };

        const records = cards.map(c => ({
            dish_name: c.dishName,
            category: c.category,
            image_data: c.imageData, // Ensure this fits in text, otherwise might need Storage
            ingredients: c.ingredients,
            cooking_method: c.cookingMethod,
            total_output: c.totalOutput,
            user_id: user.id
        }));

        const { error: cardsError } = await supabase.from('cards').insert(records);
        if (cardsError) throw cardsError;

        return { success: true, message: `Successfully migrated ${cards.length} cards!` };

    } catch (e: any) {
        console.error("Migration failed:", e);
        return { success: false, message: e.message || "Migration failed" };
    }
};
