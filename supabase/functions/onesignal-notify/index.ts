import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ONESIGNAL_APP_ID = "3a29a171-b3cf-4b9a-a1c1-438014ca4505"
const ONESIGNAL_REST_API_KEY = "os_v2_app_hiu2c4ntz5fzviobioabjssfavbyfcogleqejoe7mveyd55wjx2nuiiiyrgrvger2eltstzr5zbb747slkzbg5zjwkm4ag2ng5z22si"

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Recebendo Notificação:", payload)

    const { type, title, message, target_id, target_role, table, record } = payload

    let finalTitle = title || "Notificação Kefel"
    let finalMessage = message || "Você tem uma nova atualização."
    let finalType = type

    // Lógica para Triggers de Banco de Dados (Supabase)
    if (table === 'kefel_relatorios' && type === 'INSERT') {
      finalTitle = "📑 Novo Relatório de Célula"
      finalMessage = `Um novo relatório foi enviado para sua conferência.`
      finalType = 'master_report'
    } else if (table === 'kefel_profiles' && type === 'INSERT') {
      finalTitle = "👤 Novo Membro no App"
      finalMessage = `${record.nome} acabou de entrar no Discipulado Kefel!`
      finalType = 'broadcast'
    } else if (table === 'kefel_favoritos' && type === 'INSERT') {
      // Buscar o nome do usuário que favoritou
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      const { data: profile } = await supabaseAdmin
        .from('kefel_profiles')
        .select('nome')
        .eq('id', record.user_id)
        .single()
      
      const firstName = profile?.nome ? profile.nome.split(' ')[0] : 'Um membro'
      finalTitle = "✨ Versículo Favoritado"
      finalMessage = `${firstName} favoritou um versículo no feed!`
      finalType = 'broadcast'
    }

    let notificationBody: any = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: { en: finalTitle, pt: finalTitle },
      contents: { en: finalMessage, pt: finalMessage },
    }

    if (finalType === 'broadcast' || type === 'broadcast') {
      notificationBody.included_segments = ["All"]
    } else if (target_role === 'master' || finalType === 'master_report') {
      notificationBody.filters = [
        { field: "tag", key: "role", relation: "=", value: "master" }
      ]
    } else if (target_id) {
      notificationBody.include_external_user_ids = [target_id]
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationBody)
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
