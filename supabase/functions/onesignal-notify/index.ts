import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = "3a29a171-b3cf-4b9a-a1c1-438014ca4505"
const ONESIGNAL_REST_API_KEY = "os_v2_app_hiu2c4ntz5fzviobioabjssfavbyfcogleqejoe7mveyd55wjx2nuiiiyrgrvger2eltstzr5zbb747slkzbg5zjwkm4ag2ng5z22si"

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log("Recebendo Notificação:", payload)

    const { type, title, message, target_id, target_role } = payload

    let notificationBody: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
    }

    if (type === 'broadcast') {
      // Enviar para todos os usuários (estratégia de broadcast)
      notificationBody.included_segments = ["All"]
    } else if (target_role === 'master') {
      // Notificar apenas o Master (ex: novo membro, novo relatório)
      notificationBody.filters = [
        { field: "tag", key: "role", relation: "=", value: "master" }
      ]
    } else if (target_id) {
      // Notificar usuário específico
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
