const express = require('express');
const supabase = require('../config/supabase');
const { verificarAlertasDoMei } = require('./alertas');

const router = express.Router();

// ─────────────────────────────────────────
// POST /cron/verificar-alertas
// Rota SEM autenticação de usuário — protegida
// por secret no header. Feita pra ser chamada
// por um agendador externo (cron-job.org,
// GitHub Actions, pg_cron, etc.) e verificar
// os alertas de TODOS os MEIs, mesmo com o
// app fechado.
// ─────────────────────────────────────────
router.post('/verificar-alertas', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }

  try {
    const { data: meis, error } = await supabase.from('mei').select('id_mei');
    if (error) throw error;

    let totalNotificacoes = 0;
    const erros = [];

    for (const mei of meis || []) {
      try {
        const resultado = await verificarAlertasDoMei(mei.id_mei);
        totalNotificacoes += resultado.notificacoes_geradas;
      } catch (errMei) {
        // FIX: erro em um MEI não interrompe a verificação dos demais
        erros.push({ id_mei: mei.id_mei, erro: errMei.message });
      }
    }

    return res.json({
      meis_verificados: (meis || []).length,
      notificacoes_geradas: totalNotificacoes,
      erros,
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao rodar verificação em lote.' });
  }
});

module.exports = router;
