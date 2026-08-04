// utils/expoPush.js
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envia notificações push via Expo Push Notifications.
 * @param {string[]} tokens - lista de expo_push_token dos dispositivos do MEI
 * @param {string} titulo
 * @param {string} corpo
 * @param {object} [dados] - payload extra (ex: { id_alerta, id_notificacao })
 */
async function enviarPush(tokens, titulo, corpo, dados = {}) {
  const tokensValidos = (tokens || []).filter(
    (t) => t && t.startsWith('ExponentPushToken')
  );
  if (tokensValidos.length === 0) return;

  const mensagens = tokensValidos.map((to) => ({
    to,
    sound: 'default',
    title: titulo,
    body: corpo,
    data: dados,
  }));

  try {
    const resposta = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(mensagens),
    });

    const resultado = await resposta.json().catch(() => null);
    if (resultado?.data) {
      // FIX: loga tokens inválidos/expirados retornados pela Expo, sem derrubar o fluxo
      resultado.data.forEach((item, i) => {
        if (item.status === 'error') {
          console.warn('Push falhou para token:', tokensValidos[i], item.message);
        }
      });
    }
  } catch (err) {
    console.error('Erro ao enviar push:', err.message);
    // FIX: falha no envio de push não deve interromper a verificação de alertas
  }
}

module.exports = { enviarPush };
