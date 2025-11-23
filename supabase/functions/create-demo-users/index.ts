import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: commissions } = await supabaseAdmin
      .from('commissions')
      .select('id, name');

    const komisiBId = commissions?.find(c => c.name === 'Komisi B')?.id;
    const komisiAId = commissions?.find(c => c.name === 'Komisi A')?.id;
    const komisiCId = commissions?.find(c => c.name === 'Komisi C')?.id;

    const demoUsers = [
      {
        email: 'admin@mpk.school',
        password: 'admin123',
        name: 'Admin User',
        nis: '00000',
        class: 'XII-A',
        commission_id: komisiAId,
        roles: ['admin', 'grader'],
      },
      {
        email: 'budi@mpk.school',
        password: 'password123',
        name: 'Budi Santoso',
        nis: '10001',
        class: 'XI-A',
        commission_id: komisiAId,
        roles: ['grader', 'member'],
      },
      {
        email: 'siti@mpk.school',
        password: 'password123',
        name: 'Siti Nurhaliza',
        nis: '10002',
        class: 'XI-B',
        commission_id: komisiBId,
        roles: ['grader', 'member'],
      },
    ];

    const results = [];

    for (const user of demoUsers) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError && !authError.message.includes('already registered')) {
        console.error('Auth error:', authError);
        continue;
      }

      const userId = authUser?.user?.id;
      if (!userId) {
        console.error('No user ID for', user.email);
        continue;
      }

      const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          name: user.name,
          nis: user.nis,
          class: user.class,
          email: user.email,
          password_hash: 'managed_by_supabase_auth',
          commission_id: user.commission_id,
          roles: user.roles,
          is_active: true,
        }, {
          onConflict: 'id',
        });

      if (dbError) {
        console.error('DB error:', dbError);
        continue;
      }

      results.push({ email: user.email, status: 'created' });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});