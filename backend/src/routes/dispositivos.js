const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// POST /dispositivos/push-token
router.post('/push-token', async (req, res) => {
  const { expo_push_token } = req.body;
  const id_mei = req.usuario.id_mei;

  if (!expo_push_token) {
    return res.status(400).json({ erro: 'expo_push_token é obrigatório.' });
  }

  try {
    const { data, error } = await supabase
      .from('dispositivo_push')
      .upsert(
        { id_mei, expo_push_token, atualizado_em: new Date().toISOString() },
        { onConflict: 'id_mei,expo_push_token' }
      )
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao salvar token de push.' });
  }
});

module.exports = router;