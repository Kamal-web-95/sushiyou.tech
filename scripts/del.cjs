const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://smuxfockebqgzwuwokic.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdXhmb2NrZWJxZ3p3dXdva2ljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQxMjg4NiwiZXhwIjoyMDg2OTg4ODg2fQ.LFd8qUhusgNXSlX-GeSlx3x0NAcsBhRB9Xq0IuUgzfY');

async function del() {
    try {
        const {data, error} = await supabase.from('profiles').select('id').eq('email', 'test_franchisee_99@gmail.com').single();
        if(error) throw error;
        if(data) {
            await supabase.auth.admin.deleteUser(data.id);
            console.log('Deleted successfully', data.id);
        }
    } catch(e) {
        console.error(e);
    }
}
del();
