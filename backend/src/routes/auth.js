const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// POST /auth/cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha, cnpj, razao_social, nome_fantasia, categoria_cnae } = req.body;

  if (!nome || !email || !senha || !cnpj) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, cnpj.' });
  }

  try {
    const { data: existente } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .single();

    if (existente) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const { data: usuario, error: errUsuario } = await supabase
      .from('usuario')
      .insert({ nome, email, senha_hash, perfil: 'mei' })
      .select()
      .single();

    if (errUsuario) throw errUsuario;

    const { data: mei, error: errMei } = await supabase
      .from('mei')
      .insert({ id_usuario: usuario.id_usuario, cnpj, razao_social, nome_fantasia, categoria_cnae })
      .select()
      .single();

    if (errMei) throw errMei;

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso.',
      usuario: { id: usuario.id_usuario, nome, email },
      mei: { id_mei: mei.id_mei, cnpj },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno ao cadastrar.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const { data: usuario, error } = await supabase
      .from('usuario')
      .select('id_usuario, nome, email, senha_hash, perfil')
      .eq('email', email)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    let id_mei = null;
    if (usuario.perfil === 'mei') {
      const { data: mei } = await supabase
        .from('mei')
        .select('id_mei')
        .eq('id_usuario', usuario.id_usuario)
        .single();
      id_mei = mei?.id_mei;
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, perfil: usuario.perfil, id_mei },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      usuario: { id: usuario.id_usuario, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro interno ao fazer login.' });
  }
});

module.exports = router;