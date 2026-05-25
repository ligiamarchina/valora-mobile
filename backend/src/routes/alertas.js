const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// ─────────────────────────────────────────
// GET /alertas
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const id_mei = req.usuario.id_mei;
  try {
    const { data, error } = await supabase
      .from('alerta_financeiro')
      .select('*')
      .eq('id_mei', id_mei)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar alertas.' });
  }
});

// ─────────────────────────────────────────
// POST /alertas
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  const { tipo_alerta, descricao, valor_referencia } = req.body;
  const id_mei = req.usuario.id_mei;

  if (!tipo_alerta) {
    return res.status(400).json({ erro: 'tipo_alerta é obrigatório.' });
  }

  // FIX: validação de valor_referencia no backend
  if (
    valor_referencia === undefined ||
    valor_referencia === null ||
    isNaN(Number(valor_referencia)) ||
    Number(valor_referencia) <= 0
  ) {
    return res.status(400).json({ erro: 'valor_referencia deve ser um número positivo.' });
  }

  try {
    const { data, error } = await supabase
      .from('alerta_financeiro')
      .insert({
        id_mei,
        tipo_alerta,
        descricao: descricao?.trim() || 'Alerta de limite de despesas',
        valor_referencia: Number(valor_referencia),
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar alerta.' });
  }
});

// ─────────────────────────────────────────
// ROTAS ESTÁTICAS — devem vir ANTES de /:id
// FIX: ordem corrigida para evitar conflito com /:id
// ─────────────────────────────────────────

// GET /alertas/notificacoes
router.get('/notificacoes', async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { lida } = req.query;

  try {
    const { data: alertas } = await supabase
      .from('alerta_financeiro')
      .select('id_alerta')
      .eq('id_mei', id_mei);

    const ids = alertas.map((a) => a.id_alerta);
    if (ids.length === 0) return res.json([]);

    let query = supabase
      .from('notificacao')
      .select('*, alerta_financeiro(tipo_alerta, descricao)')
      .in('id_alerta', ids)
      .order('enviado_em', { ascending: false });

    if (lida !== undefined) query = query.eq('lida', lida === 'true');

    const { data, error } = await query;
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao buscar notificações.' });
  }
});

// PATCH /alertas/notificacoes/:id/lida
router.patch('/notificacoes/:id/lida', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('notificacao')
      .update({ lida: true })
      .eq('id_notificacao', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao marcar notificação.' });
  }
});

// POST /alertas/verificar
router.post('/verificar', async (req, res) => {
  const id_mei = req.usuario.id_mei;

  try {
    const { data: alertas } = await supabase
      .from('alerta_financeiro')
      .select('*')
      .eq('id_mei', id_mei)
      .eq('ativo', true);

    if (!alertas || alertas.length === 0) {
      return res.json({
        alertas_verificados: 0,
        notificacoes_geradas: 0,
        notificacoes: [],
      });
    }

    const hoje = new Date();
    const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

    // FIX: uma única query para todos os lançamentos do mês (evita N+1)
    const { data: lancamentosMes } = await supabase
      .from('lancamento_financeiro')
      .select('valor, tipo')
      .eq('id_mei', id_mei)
      .gte('data_lancamento', inicioMes);

    const totalDespesas = (lancamentosMes || [])
      .filter((l) => l.tipo === 'despesa')
      .reduce((acc, l) => acc + parseFloat(l.valor), 0);

    const notificacoesGeradas = [];

    for (const alerta of alertas) {
      let disparar = false;
      let mensagem = '';

      if (alerta.tipo_alerta === 'limite_despesa') {
        if (totalDespesas >= alerta.valor_referencia) {
          // FIX: checa se já existe notificação não lida para esse alerta no mês
          const { data: jaExiste } = await supabase
            .from('notificacao')
            .select('id_notificacao')
            .eq('id_alerta', alerta.id_alerta)
            .eq('lida', false)
            .gte('enviado_em', inicioMes)
            .maybeSingle();

          if (jaExiste) continue; // Não duplica

          disparar = true;
          mensagem = `⚠️ Suas despesas esse mês atingiram R$ ${totalDespesas.toFixed(2).replace('.', ',')}, ultrapassando o limite de R$ ${parseFloat(alerta.valor_referencia).toFixed(2).replace('.', ',')}.`;
        }
      }

      if (disparar) {
        const { data: notif } = await supabase
          .from('notificacao')
          .insert({ id_alerta: alerta.id_alerta, mensagem })
          .select()
          .single();
        notificacoesGeradas.push(notif);
      }
    }

    return res.json({
      alertas_verificados: alertas.length,
      notificacoes_geradas: notificacoesGeradas.length,
      notificacoes: notificacoesGeradas,
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao verificar alertas.' });
  }
});

// ─────────────────────────────────────────
// ROTAS DINÂMICAS — depois das estáticas
// ─────────────────────────────────────────

// PATCH /alertas/:id/ativar-desativar
router.patch('/:id/ativar-desativar', async (req, res) => {
  const { id } = req.params;
  const id_mei = req.usuario.id_mei;

  try {
    const { data: alerta } = await supabase
      .from('alerta_financeiro')
      .select('ativo')
      .eq('id_alerta', id)
      .eq('id_mei', id_mei)
      .single();

    if (!alerta) return res.status(404).json({ erro: 'Alerta não encontrado.' });

    const { data, error } = await supabase
      .from('alerta_financeiro')
      .update({ ativo: !alerta.ativo })
      .eq('id_alerta', id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar alerta.' });
  }
});

// DELETE /alertas/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const id_mei = req.usuario.id_mei;

  try {
    const { error } = await supabase
      .from('alerta_financeiro')
      .delete()
      .eq('id_alerta', id)
      .eq('id_mei', id_mei);

    if (error) throw error;
    return res.json({ mensagem: 'Alerta removido.' });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao remover alerta.' });
  }
});

module.exports = router;