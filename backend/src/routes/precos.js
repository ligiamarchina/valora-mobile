// backend/src/routes/precos.js
const express = require("express");
const supabase = require("../config/supabase");
const { autenticar } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar);

// GET /precos-medios
router.get("/", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { categoria } = req.query;

  try {
    let query = supabase
      .from("preco_mercado")
      .select("*")
      .eq("id_mei", id_mei)
      .order("data_referencia", { ascending: true });

    if (categoria) query = query.eq("categoria", categoria);

    const { data, error } = await query;
    if (error) throw error;

    // 1ª passagem: agrupa por nome_produto e data_referencia
    // calcula média quando há mais de um registro no mesmo mês
    const mapa = {};
    data.forEach((item) => {
      const chaveProduto = item.nome_produto;
      const chaveMes = item.data_referencia;

      if (!mapa[chaveProduto]) {
        mapa[chaveProduto] = {
          id: String(item.id_preco),
          nome: item.nome_produto,
          unidade: item.unidade,
          categoria: item.categoria,
          meses: {},
        };
      }

      if (!mapa[chaveProduto].meses[chaveMes]) {
        mapa[chaveProduto].meses[chaveMes] = {
          id_preco: item.id_preco,
          soma: 0,
          count: 0,
          data_referencia: item.data_referencia,
        };
      }

      mapa[chaveProduto].meses[chaveMes].soma += parseFloat(item.valor);
      mapa[chaveProduto].meses[chaveMes].count += 1;
    });

    // 2ª passagem: converte meses em historico com preço médio por mês
    const resultado = Object.values(mapa).map((produto) => {
      const historico = Object.values(produto.meses)
        .sort((a, b) => a.data_referencia.localeCompare(b.data_referencia))
        .map((m) => ({
          id_preco: m.id_preco,
          mes: new Date(m.data_referencia + "T12:00:00")
            .toLocaleDateString("pt-BR", { month: "short" })
            .replace(".", "")
            .replace(/^\w/, (c) => c.toUpperCase()),
          preco: parseFloat((m.soma / m.count).toFixed(2)),
          data_referencia: m.data_referencia,
        }));

      return {
        id: produto.id,
        nome: produto.nome,
        unidade: produto.unidade,
        categoria: produto.categoria,
        historico,
      };
    });

    return res.json(resultado);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao listar precos." });
  }
});

// POST /precos-medios
router.post("/", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { nome_produto, unidade, categoria, valor, data_referencia } = req.body;

  if (!nome_produto || !unidade || !categoria || !valor || !data_referencia) {
    return res.status(400).json({
      erro: "Campos obrigatorios: nome_produto, unidade, categoria, valor, data_referencia.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("preco_mercado")
      .insert({
        id_mei,
        nome_produto,
        unidade,
        categoria,
        valor,
        data_referencia,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao registrar preco." });
  }
});

// DELETE /precos-medios/:id
router.delete("/:id", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { id } = req.params;

  try {
    const { data: existente } = await supabase
      .from("preco_mercado")
      .select("id_preco")
      .eq("id_preco", id)
      .eq("id_mei", id_mei)
      .single();

    if (!existente)
      return res.status(404).json({ erro: "Preco nao encontrado." });

    const { error } = await supabase
      .from("preco_mercado")
      .delete()
      .eq("id_preco", id);

    if (error) throw error;
    return res.json({ mensagem: "Preco excluido com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao excluir preco." });
  }
});

module.exports = router;
