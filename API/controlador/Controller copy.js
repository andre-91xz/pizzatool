import pool from '../api_database/db.js';

// --- MATERIAL ---
export const materialGET = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM material ORDER BY nome ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
};

export const materialGETID = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM material WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: "Material não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
};

export const materialPOST = async (req, res) => {
  const { nome, preco, quantidade, unidade, categoria, status } = req.body;
  if (!nome || preco === undefined || !quantidade) {
    return res.status(400).json({ sucesso: false, erro: "Campos obrigatórios faltando." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO material (nome, preco, quantidade, unidade, categoria, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [nome, preco, quantidade, unidade, categoria || 'outros', status]
    );
    res.status(201).json({ sucesso: true, materialCadastrado: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar material" });
  }
};

// --- PEDIDOS ---
export const pedidosPOST = async (req, res) => {
  const { cliente, telefone, endereco, bairro, itens, total, taxa_entrega, metodo_pagamento, motoboy_id } = req.body;
  if (!cliente || !itens || !total) return res.status(400).json({ sucesso: false, erro: "Dados incompletos" });

  try {
    await pool.query('BEGIN');
    let custo_total = 0;
    const itensParseados = typeof itens === 'string' ? JSON.parse(itens) : itens;

    for (const item of itensParseados) {
      if (item.catalogo_id) {
        const ingRes = await pool.query(
          "SELECT ci.quantidade, m.preco FROM catalogo_ingredientes ci JOIN material m ON m.id = ci.material_id WHERE ci.catalogo_id = $1",
          [item.catalogo_id]
        );
        for (const ing of ingRes.rows) {
          custo_total += parseFloat(ing.quantidade) * parseFloat(ing.preco) * (item.quantidade || 1);
        }
      }
    }

    const resPedido = await pool.query(
      `INSERT INTO pedido (cliente, telefone, endereco, bairro, itens, total, custo_total, taxa_entrega, metodo_pagamento, motoboy_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente') RETURNING *`,
      [cliente, telefone, endereco, bairro, JSON.stringify(itensParseados), total, custo_total, taxa_entrega || 0, metodo_pagamento, motoboy_id]
    );

    for (const item of itensParseados) {
      if (item.catalogo_id) {
        const resIng = await pool.query("SELECT material_id, quantidade FROM catalogo_ingredientes WHERE catalogo_id = $1", [item.catalogo_id]);
        for (const ing of resIng.rows) {
          await pool.query("UPDATE material SET quantidade = quantidade - $1 WHERE id = $2", [ing.quantidade * (item.quantidade || 1), ing.material_id]);
        }
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ sucesso: true, pedidoCadastrado: resPedido.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: "Erro ao processar pedido" });
  }
};

export const pedidosGET = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pedido ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar pedidos" });
  }
};

// --- IA E ASSISTENTE (Versão Simplificada sem AIService) ---
export const assistenteChat = async (req, res) => {
  res.json({ resposta: "O serviço de IA foi desativado conforme solicitado." });
};

export const getIAProfiles = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ia_profiles ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Erro ao buscar perfis de IA");
  }
};

export const updateIAProfile = async (req, res) => {
    const { id } = req.params;
    const { name, provider, model, api_key, base_url, is_active } = req.body;
    try {
        await pool.query(
            "UPDATE ia_profiles SET name=$1, provider=$2, model=$3, api_key=$4, base_url=$5, is_active=$6 WHERE id=$7",
            [name, provider, model, api_key, base_url, is_active, id]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao atualizar perfil" });
    }
};

// --- AUXILIARES ---
export const getBairros = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, nome AS bairro, taxa AS valor FROM bairros ORDER BY nome ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar bairros" });
  }
};

export const getHistorico = async (req, res) => { res.json([]); };
export const limparHistorico = async (req, res) => { res.json({ sucesso: true }); };