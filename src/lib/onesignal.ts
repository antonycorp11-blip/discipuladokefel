/**
 * Envio de notificações Push via OneSignal REST API.
 * 
 * ATENÇÃO: Em produção, idealmente estas chamadas seriam feitas de um backend 
 * (Edge Function ou servidor) para proteger a ONESIGNAL_REST_API_KEY.
 * Se isso for rodar no client, a chave estará exposta no bundle.
 */

const APP_ID = (import.meta as any).env.VITE_ONESIGNAL_APP_ID;
const REST_API_KEY = (import.meta as any).env.VITE_ONESIGNAL_REST_API_KEY;

interface PushOptions {
  headings: string;
  contents: string;
  url?: string;
  targetUserIds?: string[]; // IDs de usuários específicos (external_id / alias)
  targetTags?: { key: string; relation: string; value: string }[]; // Para enviar pra um segmento (ex: role='lider')
}

export async function sendPushNotification({ headings, contents, url, targetUserIds, targetTags }: PushOptions) {
  if (!APP_ID || !REST_API_KEY) {
    console.warn('[OneSignal] Chaves não configuradas no .env. Notificação ignorada.');
    return false;
  }

  const payload: any = {
    app_id: APP_ID,
    headings: { en: headings, pt: headings },
    contents: { en: contents, pt: contents },
    target_channel: "push"
  };

  if (url) {
    payload.url = url;
  }

  // Define target
  if (targetUserIds && targetUserIds.length > 0) {
    payload.include_aliases = { external_id: targetUserIds };
  } else if (targetTags && targetTags.length > 0) {
    // Array de filtros do OneSignal
    payload.filters = targetTags.map(tag => ({
      field: 'tag',
      key: tag.key,
      relation: tag.relation,
      value: tag.value
    }));
  } else {
    // Send to All
    payload.included_segments = ["All"];
  }

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('[PUSH_NOTIFICATION] Sucesso:', data);
      return true;
    } else {
      console.error('[PUSH_NOTIFICATION] Erro OneSignal:', data);
      return false;
    }
  } catch (err) {
    console.error('[PUSH_NOTIFICATION] Erro ao enviar:', err);
    return false;
  }
}
