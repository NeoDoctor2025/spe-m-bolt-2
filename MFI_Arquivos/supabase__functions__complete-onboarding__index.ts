// supabase/functions/complete-onboarding/index.ts
// Deploy: npx supabase functions deploy complete-onboarding

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar JWT — extrair usuário do Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client com JWT do usuário (para verificar identidade)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validar body
    const body = await req.json()
    const orgName = (body?.orgName ?? '').trim()
    if (!orgName || orgName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Nome da clínica deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client admin (service role — bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Idempotência — verificar se profile já tem org_id
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile?.org_id) {
      // Org já existe — garantir que app_metadata está sincronizado
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          org_id: existingProfile.org_id,
          role: existingProfile.role ?? 'admin',
        },
      })
      return new Response(
        JSON.stringify({ success: true, orgId: existingProfile.org_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. INSERT em organizations
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: orgName, timezone: 'America/Sao_Paulo' })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('[complete-onboarding] Erro ao criar org:', orgError?.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar organização. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. UPDATE em profiles (org_id + role = 'admin')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ org_id: org.id, role: 'admin' })
      .eq('id', user.id)

    if (profileError) {
      console.error('[complete-onboarding] Erro ao atualizar profile:', profileError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao vincular usuário. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Atualizar app_metadata via admin API (JWT claims)
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: org.id, role: 'admin' },
    })

    if (metaError) {
      // Org e profile existem no banco — na próxima tentativa idempotência resolve
      console.error('[complete-onboarding] Erro ao atualizar metadata:', metaError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar sessão. Faça login novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, orgId: org.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[complete-onboarding] Erro inesperado:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
