import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: commissions } = await supabaseAdmin.from('commissions').select('id, name');
    const komisiA = commissions?.find(c => c.name === 'Komisi A')?.id;
    const komisiB = commissions?.find(c => c.name === 'Komisi B')?.id;
    const komisiC = commissions?.find(c => c.name === 'Komisi C')?.id;

    const members = [
      { email: 'ahmad@mpk.school', password: 'password123', name: 'Ahmad Fauzi', nis: '10003', class: 'XI-C', commission_id: komisiC, roles: ['member'] },
      { email: 'dewi@mpk.school', password: 'password123', name: 'Dewi Lestari', nis: '10004', class: 'XI-A', commission_id: komisiA, roles: ['member'] },
      { email: 'rizki@mpk.school', password: 'password123', name: 'Rizki Pratama', nis: '10005', class: 'XI-B', commission_id: komisiB, roles: ['member'] },
      { email: 'maya@mpk.school', password: 'password123', name: 'Maya Putri', nis: '10006', class: 'XI-C', commission_id: komisiC, roles: ['member'] },
      { email: 'eko@mpk.school', password: 'password123', name: 'Eko Prasetyo', nis: '10007', class: 'XI-A', commission_id: komisiA, roles: ['member'] },
      { email: 'linda@mpk.school', password: 'password123', name: 'Linda Wijaya', nis: '10008', class: 'XI-B', commission_id: komisiB, roles: ['member'] },
      { email: 'farhan@mpk.school', password: 'password123', name: 'Farhan Hakim', nis: '10009', class: 'XI-C', commission_id: komisiC, roles: ['member'] },
    ];

    const results = [];
    for (const user of members) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError && !authError.message.includes('already registered')) {
        results.push({ email: user.email, error: authError.message });
        continue;
      }

      const userId = authUser?.user?.id;
      if (!userId) continue;

      await supabaseAdmin.from('users').upsert({
        id: userId,
        name: user.name,
        nis: user.nis,
        class: user.class,
        email: user.email,
        password_hash: 'managed_by_supabase_auth',
        commission_id: user.commission_id,
        roles: user.roles,
        is_active: true,
      }, { onConflict: 'id' });

      results.push({ email: user.email, status: 'created' });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});