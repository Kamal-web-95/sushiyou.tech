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

async function setupAdmin() {
    const email = 'k19091997ki@gmail.com';
    const password = 'Zzssaa19091997';

    console.log(`Checking or creating user: ${email}`);

    // Try to sign up
    let { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    let userId = authData?.user?.id;

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('User already exists, attempting to log in to get ID...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (signInError) {
                console.error("Failed to sign in:", signInError.message);
                return;
            }
            userId = signInData.user.id;
        } else {
            console.error("Sign up error:", authError.message);
            return;
        }
    }

    if (!userId) {
        console.error("Could not obtain user ID.");
        return;
    }

    console.log(`User ID: ${userId}. Setting role to admin in profiles table...`);

    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        role: 'admin'
    });

    if (profileError) {
        console.error("Profile update error:", profileError.message);
    } else {
        console.log("Successfully set user as admin!");
    }
}

setupAdmin();
