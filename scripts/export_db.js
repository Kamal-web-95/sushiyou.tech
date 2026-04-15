import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read variables from .env.local manually since dotenv is not installed
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || '';
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
    console.log("Fetching data from Supabase 'cards' table...");
    const { data: cards, error } = await supabase.from('cards').select('*');
    
    if (error) {
        console.error("Error fetching cards:", error);
        return;
    }
    
    console.log(`Fetched ${cards?.length || 0} cards.`);
    
    const items = (cards || []).map((card, index) => {
        return {
            id: card.id || index + 1,
            dish_name: card.dish_name,
            ingredients: (card.ingredients || []).map((ing) => ({
                name: ing.name,
                net_weight: {
                    raw: ing.weight ? ing.weight.toString() : "",
                    type: "number",
                    numeric: parseFloat(ing.weight) || 0
                }
            })),
            yield: {
                raw: card.total_output ? card.total_output.toString() : "",
                type: "number",
                numeric: parseFloat(card.total_output) || 0
            },
            category: card.category || "",
            cooking_method: card.cooking_method || ""
        };
    });
    
    const exportResult = {
        source_file: "supabase_db_export",
        export_date: new Date().toISOString(),
        items: items
    };

    const outPath = path.resolve('./public/db_export.json');
    fs.writeFileSync(outPath, JSON.stringify(exportResult, null, 2), 'utf-8');
    console.log(`Database exported successfully to: ${outPath}`);
}

exportData();
