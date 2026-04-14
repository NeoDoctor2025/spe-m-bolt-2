import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  orgName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    if (!body.orgName || body.orgName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nome da organização inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode JWT to get user_id (simple parsing, not validation)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;
    try {
      const payload = JSON.parse(atob(parts[1]));
      userId = payload.sub;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has org_id (idempotency check)
    const checkUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=org_id`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
    });

    if (!checkRes.ok) {
      throw new Error(`Failed to check profile: ${checkRes.statusText}`);
    }

    const existing = await checkRes.json();
    if (existing.length > 0 && existing[0].org_id) {
      return new Response(JSON.stringify({
        success: true,
        orgId: existing[0].org_id,
        message: "Organização já configurada"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create organization
    const createOrgUrl = `${supabaseUrl}/rest/v1/organizations`;
    const createOrgRes = await fetch(createOrgUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.orgName.trim(),
        timezone: "America/Sao_Paulo",
        active: true,
      }),
    });

    if (!createOrgRes.ok) {
      const error = await createOrgRes.text();
      throw new Error(`Failed to create organization: ${error}`);
    }

    const orgData = await createOrgRes.json();
    const orgId = orgData[0]?.id;

    if (!orgId) {
      throw new Error("Organization creation returned no ID");
    }

    // Update profile with org_id and role
    const updateUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        org_id: orgId,
        role: "admin",
      }),
    });

    if (!updateRes.ok) {
      const error = await updateRes.text();
      throw new Error(`Failed to update profile: ${error}`);
    }

    return new Response(JSON.stringify({
      success: true,
      orgId,
      message: "Organização criada com sucesso"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
