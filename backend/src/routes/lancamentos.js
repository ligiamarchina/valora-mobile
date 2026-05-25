const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// GET /lancamentos
router.get('/', async (req, res) => {
  const { tipo, data_inicio, data_fim, id_categoria } = req.query;
  const id_mei = req.usuario.id_mei;

  try {
    let query = supabase
      .from('lancamento_financeiro')
      .select(`id_lancamento, tipo, valor, data_lancamento, descricao, criado_em,
        categoria ( id_categoria, nome, tipo )`)
      .eq('id_mei', id_mei)
      .order('data_lancamento', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);
    if (data_inicio) query = query.gte('data_lancamento', data_inicio);
    if (data_fim) query = query.lte('data_lancamento', data_fim);
    if (id_categoria) query = query.eq('id_categoria', id_categoria);

    const { data, error } = await query;
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar lançamentos.' });
  }
});

// GET /lancamentos/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const id_mei = req.usuario.id_mei;

  try {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .select('*, categoria(*)')
      .eq('id_lancamento', id)
      .eq('id_mei', id_mei)
      .single();

    if (error || !data) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar lançamento.' });
  }
});

// POST /lancamentos
router.post('/', async (req, res) => {
  const { tipo, valor, data_lancamento, descricao, id_categoria } = req.body;
  const id_mei = req.usuario.id_mei;

  if (!tipo || !valor || !data_lancamento) {
    return res.status(400).json({ erro: 'Campos obrigatórios: tipo, valor, data_lancamento.' });
  }

  if (!['receita', 'despesa', 'investimento', 'custo'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use: receita, despesa, investimento ou custo.' });
  }

  try {
    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .insert({ id_mei, tipo, valor, data_lancamento, descricao, id_categoria })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar lançamento.' });
  }
});

// PUT /lancamentos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const id_mei = req.usuario.id_mei;
  const { tipo, valor, data_lancamento, descricao, id_categoria } = req.body;

  try {
    const { data: existente } = await supabase
      .from('lancamento_financeiro')
      .select('id_lancamento')
      .eq('id_lancamento', id)
      .eq('id_mei', id_mei)
      .single();

    if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .update({ tipo, valor, data_lancamento, descricao, id_categoria, atualizado_em: new Date() })
      .eq('id_lancamento', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar lançamento.' });
  }
});

// DELETE /lancamentos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const id_mei = req.usuario.id_mei;

  try {
    const { data: existente } = await supabase
      .from('lancamento_financeiro')
      .select('id_lancamento')
      .eq('id_lancamento', id)
      .eq('id_mei', id_mei)
      .single();

    if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

    const { error } = await supabase
      .from('lancamento_financeiro')
      .delete()
      .eq('id_lancamento', id);

    if (error) throw error;
    return res.json({ mensagem: 'Lançamento excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao excluir lançamento.' });
  }
});

module.exports = router;