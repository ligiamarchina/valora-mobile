const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');
const buscarRegistrosPaginados = require('../utils/buscarRegistrosPaginados');

const router = express.Router();
router.use(autenticar);

function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const convertida = new Date(`${data}T00:00:00.000Z`);
  return !Number.isNaN(convertida.getTime()) &&
    convertida.toISOString().slice(0, 10) === data &&
    data <= new Date().toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  const id_mei = req.usuario.id_mei;

  try {
    const { data: contas, error } = await supabase
      .from('conta_financeira')
      .select('id_conta, nome, saldo_inicial, data_saldo_inicial, saldo_inicial_configurado, criado_em')
      .eq('id_mei', id_mei)
      .order('criado_em');

    if (error) throw error;
    if (!contas.length) return res.json([]);

    const primeiraData = contas
      .map((conta) => conta.data_saldo_inicial)
      .sort()[0];
    const hoje = new Date().toISOString().slice(0, 10);
    const ids = contas.map((conta) => conta.id_conta);
    const lancamentos = await buscarRegistrosPaginados(() => supabase
      .from('lancamento_financeiro')
      .select('id_conta, tipo, valor, data_lancamento')
      .eq('id_mei', id_mei)
      .in('id_conta', ids)
      .gte('data_lancamento', primeiraData)
      .lte('data_lancamento', hoje)
      .order('id_lancamento'));

    const totais = new Map(contas.map((conta) => [conta.id_conta, {
      entradas: 0,
      saidas: 0,
    }]));
    const contaPorId = new Map(contas.map((conta) => [conta.id_conta, conta]));

    lancamentos.forEach((lancamento) => {
      const conta = contaPorId.get(lancamento.id_conta);
      if (!conta || lancamento.data_lancamento < conta.data_saldo_inicial) return;
      const total = totais.get(lancamento.id_conta);
      const valor = Number(lancamento.valor) || 0;
      if (lancamento.tipo === 'receita') total.entradas += valor;
      else total.saidas += valor;
    });

    return res.json(contas.map((conta) => {
      const total = totais.get(conta.id_conta);
      const saldo_inicial = Number(conta.saldo_inicial) || 0;
      return {
        ...conta,
        saldo_inicial,
        entradas: Number(total.entradas.toFixed(2)),
        saidas: Number(total.saidas.toFixed(2)),
        saldo_atual: conta.saldo_inicial_configurado
          ? Number((saldo_inicial + total.entradas - total.saidas).toFixed(2))
          : null,
      };
    }));
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar contas.' });
  }
});

router.post('/', async (req, res) => {
  const { nome, saldo_inicial, data_saldo_inicial } = req.body;
  const id_mei = req.usuario.id_mei;
  const valorInicial = Number(saldo_inicial);

  if (!nome?.trim() || saldo_inicial === undefined || saldo_inicial === null ||
    String(saldo_inicial).trim() === '' || !Number.isFinite(valorInicial) || !dataValida(data_saldo_inicial)) {
    return res.status(400).json({ erro: 'Informe nome, saldo inicial e uma data-base válida.' });
  }

  try {
    const { data, error } = await supabase
      .from('conta_financeira')
      .insert({
        id_mei,
        nome: nome.trim(),
        saldo_inicial: valorInicial,
        data_saldo_inicial,
        saldo_inicial_configurado: true,
      })
      .select('id_conta, nome, saldo_inicial, data_saldo_inicial, saldo_inicial_configurado, criado_em')
      .single();

    if (error) throw error;
    return res.status(201).json({
      ...data,
      entradas: 0,
      saidas: 0,
      saldo_atual: valorInicial,
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, saldo_inicial, data_saldo_inicial } = req.body;
  const valorInicial = Number(saldo_inicial);
  const id_mei = req.usuario.id_mei;

  if (!nome?.trim() || saldo_inicial === undefined || saldo_inicial === null ||
    String(saldo_inicial).trim() === '' || !Number.isFinite(valorInicial) || !dataValida(data_saldo_inicial)) {
    return res.status(400).json({ erro: 'Informe nome, saldo inicial e uma data-base válida.' });
  }

  try {
    const { data, error } = await supabase
      .from('conta_financeira')
      .update({
        nome: nome.trim(),
        saldo_inicial: valorInicial,
        data_saldo_inicial,
        saldo_inicial_configurado: true,
      })
      .eq('id_conta', req.params.id)
      .eq('id_mei', id_mei)
      .select('id_conta, nome, saldo_inicial, data_saldo_inicial, saldo_inicial_configurado, criado_em')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ erro: 'Conta não encontrada.' });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao atualizar conta.' });
  }
});

module.exports = router;