import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = "3a29a171-b3cf-4b9a-a1c1-438014ca4505"
const ONESIGNAL_REST_API_KEY = "os_v2_app_hiu2c4ntz5fzviobioabjssfavbyfcogleqejoe7mveyd55wjx2nuiiiyrgrvger2eltstzr5zbb747slkzbg5zjwkm4ag2ng5z22si"

serve(async (req) => {
  try {
    const { record, table, type } = await req.json()
    console.log(`Notificação recebida para tabela ${table}:`, record)

    let title = "Kefel Discipulado"
    let message = ""
    let targetRole = "master" // Por padrão, notifica o Master

    if (table === 'kefel_profiles' && type === 'INSERT') {
      message = `🎉 Novo membro se cadastrou: ${record.nome}!`
    } 
    else if (table === 'kefel_relatorios') {
      const tipoRepo = record.tipo === 'celula' ? 'Célula' : 'Culto'
      message = `📊 Novo relatório de ${tipoRepo} enviado por ${record.lider_id || "um líder"}.`
    }

    if (message) {
      const res = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          filters: [
            { field: "tag", key: "role", relation: "=", value: targetRole }
          ],
          headings: { en: title, pt: title },
          contents: { en: message, pt: message },
          priority: 10
        })
      })
      const data = await res.json()
      console.log("OneSignal Response:", data)
    }

    return new Response(JSON.stringify({ ok: true }), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (err) {
    console.error("Erro na Edge Function:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
