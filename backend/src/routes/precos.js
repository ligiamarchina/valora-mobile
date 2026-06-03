// backend/src/routes/precos.js
const express = require("express");
const supabase = require("../config/supabase");
const { autenticar } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar);

// GET /precos-medios
// Retorna todos os produtos do usuário agrupados com histórico de preços
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

    // Agrupa por nome_produto para montar o histórico
    const mapa = {};
    data.forEach((item) => {
      const chave = item.nome_produto;
      if (!mapa[chave]) {
        mapa[chave] = {
          id: String(item.id_preco),
          nome: item.nome_produto,
          unidade: item.unidade,
          categoria: item.categoria,
          historico: [],
        };
      }
      mapa[chave].historico.push({
        id_preco: item.id_preco,
        mes: new Date(item.data_referencia + "T12:00:00").toLocaleDateString(
          "pt-BR",
          { month: "short", year: "2-digit" },
        ),
        preco: parseFloat(item.valor),
        data_referencia: item.data_referencia,
      });
    });

    return res.json(Object.values(mapa));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao listar preços." });
  }
});

// POST /precos-medios
// Registra um novo preço para um produto
router.post("/", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { nome_produto, unidade, categoria, valor, data_referencia } = req.body;

  if (!nome_produto || !unidade || !categoria || !valor || !data_referencia) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome_produto, unidade, categoria, valor, data_referencia.",
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
    return res.status(500).json({ erro: "Erro ao registrar preço." });
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
      return res.status(404).json({ erro: "Preço não encontrado." });

    const { error } = await supabase
      .from("preco_mercado")
      .delete()
      .eq("id_preco", id);

    if (error) throw error;
    return res.json({ mensagem: "Preço excluído com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao excluir preço." });
  }
});

module.exports = router;
