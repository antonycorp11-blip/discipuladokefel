import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ONESIGNAL_APP_ID = "3a29a171-b3cf-4b9a-a1c1-438014ca4505"
const ONESIGNAL_REST_API_KEY = "os_v2_app_hiu2c4ntz5fzviobioabjssfavbyfcogleqejoe7mveyd55wjx2nuiiiyrgrvger2eltstzr5zbb747slkzbg5zjwkm4ag2ng5z22si"

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    // Ajuste para Horário de Brasília (UTC-3)
    const brDate = new Date(now.getTime() - (3 * 60 * 60 * 1000))
    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
    const currentDayName = dayNames[brDate.getDay()]

    console.log(`Verificando lembretes para: ${currentDayName}`)

    let targetUserIds: string[] = []
    let notificationTitle = "Kefel Discipulado"
    let notificationMessage = ""

    if (currentDayName === "Domingo") {
      // Notificar todos os líderes sobre o relatório de CULTO
      const { data: leaders } = await supabaseAdmin
        .from('kefel_profiles')
        .select('id')
        .eq('role', 'lider')
      
      targetUserIds = leaders?.map(l => l.id) || []
      notificationMessage = "Líder, o culto acabou! Não esqueça de enviar o número de presentes agora. ⛪"
    } else {
      // Notificar líderes das células que se reúnem HOJE
      const { data: celulas } = await supabaseAdmin
        .from('kefel_celulas')
        .select('lider_id')
        .eq('dia_semana', currentDayName)
        .not('lider_id', 'is', null)

      targetUserIds = celulas?.map(c => c.lider_id) || []
      notificationMessage = "Dia de Célula! 🎉 Não esqueça de enviar o seu relatório de presença às 21h."
    }

    if (targetUserIds.length > 0) {
      console.log(`Enviando ${targetUserIds.length} notificações...`)
      
      const res = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: targetUserIds,
          headings: { en: notificationTitle, pt: notificationTitle },
          contents: { en: notificationMessage, pt: notificationMessage },
          priority: 10
        })
      })
      
      const oneSignalData = await res.json()
      console.log("OneSignal Response:", oneSignalData)
    }

    return new Response(JSON.stringify({ ok: true, notified: targetUserIds.length }), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (err) {
    console.error("Erro no Reminder:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
