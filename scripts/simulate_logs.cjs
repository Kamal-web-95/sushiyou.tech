const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

async function run() {
    // Get the user
    const { data: users, error: userError } = await supabase.from('profiles').select('*').eq('email', 'test_franchisee_99@gmail.com');
    if (userError || !users || users.length === 0) {
        console.error('User not found');
        return;
    }
    const userId = users[0].id;

    // Insert mock logs
    const logs = [
        {
            user_id: userId,
            action: 'login',
            details: { email: 'test_franchisee_99@gmail.com', deviceInfo: 'iOS • Safari • Mobile' },
            created_at: new Date(Date.now() - 10 * 60000).toISOString() // 10 mins ago
        },
        {
            user_id: userId,
            action: 'view_card',
            details: { cardName: 'Фаст-фуд бокс', category: 'Другое', deviceInfo: 'iOS • Safari • Mobile' },
            created_at: new Date(Date.now() - 8 * 60000).toISOString() // 8 mins ago
        },
        {
            user_id: userId,
            action: 'view_card',
            details: { cardName: 'Сэндвич клаб с курицей', category: 'Холодные', deviceInfo: 'iOS • Safari • Mobile' },
            created_at: new Date(Date.now() - 5 * 60000).toISOString() // 5 mins ago
        },
        {
            user_id: userId,
            action: 'print_card',
            details: { cardName: 'Сэндвич клаб с курицей', category: 'Холодные', deviceInfo: 'iOS • Safari • Mobile' },
            created_at: new Date(Date.now() - 2 * 60000).toISOString() // 2 mins ago
        }
    ];

    const { error } = await supabase.from('audit_logs').insert(logs);
    if (error) {
         console.error('Failed to insert logs:', error);
    } else {
         console.log('Successfully inserted mock logs!');
    }
}

run();
