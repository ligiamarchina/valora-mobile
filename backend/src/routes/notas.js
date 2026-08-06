// backend/src/routes/notas.js
const express = require("express");
const supabase = require("../config/supabase");
const { autenticar } = require("../middleware/auth");

const router = express.Router();
router.use(autenticar);

// GET /notas
// Retorna notas do MEI com filtros opcionais: nome_cliente, data_inicio, data_fim
router.get("/", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { nome_cliente, data_inicio, data_fim } = req.query;

  try {
    let query = supabase
      .from("nota_fiscal")
      .select("*")
      .eq("id_mei", id_mei)
      .order("data_venda", { ascending: false });

    if (nome_cliente) {
      query = query.ilike("nome_cliente", `%${nome_cliente}%`);
    }
    if (data_inicio) {
      query = query.gte("data_venda", data_inicio);
    }
    if (data_fim) {
      query = query.lte("data_venda", data_fim);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao listar notas fiscais." });
  }
});

// POST /notas
// Cria uma nova nota fiscal (arquivo já enviado ao Supabase Storage pelo mobile)
router.post("/", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { nome_cliente, data_venda, descricao, arquivo_url, arquivo_tipo } =
    req.body;

  if (!nome_cliente || !data_venda || !arquivo_url || !arquivo_tipo) {
    return res.status(400).json({
      erro: "Campos obrigatórios: nome_cliente, data_venda, arquivo_url, arquivo_tipo.",
    });
  }

  if (!["image", "pdf"].includes(arquivo_tipo)) {
    return res
      .status(400)
      .json({ erro: 'arquivo_tipo deve ser "image" ou "pdf".' });
  }

  try {
    const { data, error } = await supabase
      .from("nota_fiscal")
      .insert({
        id_mei,
        nome_cliente,
        data_venda,
        descricao,
        arquivo_url,
        arquivo_tipo,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao salvar nota fiscal." });
  }
});

// DELETE /notas/:id
router.delete("/:id", async (req, res) => {
  const id_mei = req.usuario.id_mei;
  const { id } = req.params;

  try {
    const { data: nota } = await supabase
      .from("nota_fiscal")
      .select("id_nota, arquivo_url")
      .eq("id_nota", id)
      .eq("id_mei", id_mei)
      .single();

    if (!nota) return res.status(404).json({ erro: "Nota não encontrada." });

    // Remove arquivo do Storage
    const path = nota.arquivo_url.split("/notas-fiscais/")[1];
    if (path) {
      await supabase.storage.from("notas-fiscais").remove([path]);
    }

    const { error } = await supabase
      .from("nota_fiscal")
      .delete()
      .eq("id_nota", id);

    if (error) throw error;
    return res.json({ mensagem: "Nota excluída com sucesso." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao excluir nota fiscal." });
  }
});

module.exports = router;
