import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

async function createTestUser() {
    const email = 'test_franchisee_99@sushiyou.tech';
    const password = 'TestUser123!';

    console.log(`Registering test user: ${email}`);

    let { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        console.error("Sign up error:", authError.message);
        return;
    }

    const userId = authData?.user?.id;
    if (!userId) return;

    // Insert into profiles as pending user
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        role: 'user',
        status: 'pending'
    });
    
    if (profileError) {
        console.error("Profile error:", profileError.message);
    } else {
        console.log(`Successfully registered test user! ID: ${userId}`);
        console.log(`Waiting for admin approval...`);
    }
}

createTestUser();
