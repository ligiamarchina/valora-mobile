const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// GET /categorias
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .order('nome');

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar categorias.' });
  }
});

module.exports = router;