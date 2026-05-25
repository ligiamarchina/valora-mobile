const express = require('express');
const supabase = require('../config/supabase');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// GET /relatorios/fluxo-de-caixa
router.get('/fluxo-de-caixa', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  const id_mei = req.usuario.id_mei;

  if (!data_inicio || !data_fim) {
    return res.status(400).json({ erro: 'Informe data_inicio e data_fim (YYYY-MM-DD).' });
  }

  try {
    const { data: lancamentos, error } = await supabase
      .from('lancamento_financeiro')
      .select('tipo, valor, data_lancamento')
      .eq('id_mei', id_mei)
      .gte('data_lancamento', data_inicio)
      .lte('data_lancamento', data_fim);

    if (error) throw error;

    const totais = { receita: 0, despesa: 0, investimento: 0, custo: 0 };
    lancamentos.forEach((l) => { totais[l.tipo] += parseFloat(l.valor); });

    // FIX: custo estava sendo ignorado no cálculo do saldo
    const saldo = totais.receita - totais.despesa - totais.custo - totais.investimento;

    const porMes = {};
    lancamentos.forEach((l) => {
      const mes = l.data_lancamento.substring(0, 7);
      if (!porMes[mes]) porMes[mes] = { receita: 0, despesa: 0, investimento: 0, custo: 0 };
      porMes[mes][l.tipo] += parseFloat(l.valor);
    });

    const resultado = {
      periodo: { data_inicio, data_fim },
      totais,
      saldo,
      por_mes: Object.entries(porMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, valores]) => ({ mes, ...valores })),
    };

    // FIX: salva histórico de forma assíncrona — não bloqueia nem quebra a resposta
    res.json(resultado);

    supabase.from('relatorio').insert({
      id_mei,
      tipo: 'fluxo_de_caixa',
      periodo_inicio: data_inicio,
      periodo_fim: data_fim,
      dados: resultado,
    }).then().catch((err) => console.warn('Erro ao salvar histórico de relatório:', err));

  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

// GET /relatorios/por-categoria
router.get('/por-categoria', async (req, res) => {
  const { data_inicio, data_fim, tipo } = req.query;
  const id_mei = req.usuario.id_mei;

  if (!data_inicio || !data_fim) {
    return res.status(400).json({ erro: 'Informe data_inicio e data_fim.' });
  }

  try {
    let query = supabase
      .from('lancamento_financeiro')
      .select('valor, tipo, categoria(id_categoria, nome, tipo)')
      .eq('id_mei', id_mei)
      .gte('data_lancamento', data_inicio)
      .lte('data_lancamento', data_fim);

    if (tipo) query = query.eq('tipo', tipo);

    const { data: lancamentos, error } = await query;
    if (error) throw error;

    const agrupado = {};
    lancamentos.forEach((l) => {
      const cat = l.categoria?.nome || 'Sem categoria';
      if (!agrupado[cat]) agrupado[cat] = { total: 0, quantidade: 0 };
      agrupado[cat].total += parseFloat(l.valor);
      agrupado[cat].quantidade += 1;
    });

    const resultado = Object.entries(agrupado)
      .map(([categoria, dados]) => ({
        categoria,
        total: parseFloat(dados.total.toFixed(2)),
        quantidade: dados.quantidade,
      }))
      .sort((a, b) => b.total - a.total);

    return res.json({ periodo: { data_inicio, data_fim }, categorias: resultado });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao gerar relatório por categoria.' });
  }
});

// GET /relatorios/historico
router.get('/historico', async (req, res) => {
  const id_mei = req.usuario.id_mei;

  try {
    const { data, error } = await supabase
      .from('relatorio')
      .select('id_relatorio, tipo, periodo_inicio, periodo_fim, gerado_em')
      .eq('id_mei', id_mei)
      .order('gerado_em', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao listar relatórios.' });
  }
});

module.exports = router;