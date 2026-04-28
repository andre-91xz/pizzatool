import express from 'express'
import { Pool } from 'pg'
import 'dotenv/config'

// DICA: O 'cors' permite que o frontend na porta 5173 acesse a API na porta 3002
import cors from 'cors'
import { AIService } from './ia_service.js'

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const app = express()

// ESSENCIAL: Permite que o Node entenda requisições com corpo em JSON que o React envia
app.use(express.json())

app.use(cors()) // Quando você der 'npm install cors', descomente essa linha

app.get("/api/material", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM material"); // Troquei cardapio por material
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

app.get("/api/material/:id", async (req, res) => {
  try {
    // 1. Pegamos o 'id' que vem na URL (/api/material/5)
    const { id } = req.params;

    // 2. Filtramos no banco onde a coluna 'id' seja igual ao valor passado ($1)
    const result = await pool.query("SELECT * FROM material WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Material não encontrado" });
    }
    // Retorna apenas a primeira linha (o material específico), e não uma lista (array)
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

app.put("/api/material/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, quantidade, preco, unidade, categoria } = req.body;
  try {
    const result = await pool.query(
      `UPDATE material 
   SET nome = COALESCE($1, nome), 
       quantidade = COALESCE($2, quantidade),
       preco = COALESCE($3, preco),
       unidade = COALESCE($4, unidade),
       categoria = COALESCE($5, categoria)
   WHERE id = $6 RETURNING *`,
      [nome || null, quantidade || null, preco || null, unidade || null, categoria || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Material não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar material" });
  }
});

app.get("/api/catalogolist", async (req, res) => {
  try {
    // Usamos o INNER JOIN para cruzar a tabela de ingredientes com a tabela de materiais
    const query = `
      SELECT 
        ci.id, 
        ci.catalogo_id, 
        ci.material_id, 
        ci.quantidade,
        m.nome AS material_nome,
        m.quantidade,
        m.preco,
        m.unidade
      FROM catalogo_ingredientes ci
      INNER JOIN material m ON ci.material_id = m.id
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

/* 
  ==============================================================
  ROTAS DO CARDÁPIO E CATEGORIAS
  ==============================================================
*/
app.get("/api/cardapio", async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', ci.id,
              'material_id', ci.material_id,
              'quantidade', ci.quantidade,
              'nome', m.nome,
              'unidade', m.unidade
            ))
            FROM catalogo_ingredientes ci
            LEFT JOIN material m ON ci.material_id = m.id
            WHERE ci.catalogo_id = c.id
          ),
          '[]'::json
        ) AS "ingredientesLista"
      FROM cardapio c
      ORDER BY c.nome ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

app.post("/api/cardapio", async (req, res) => {
  const { catalogo_id, nome, preco, custo_estimado, categoria, status, ingredientes, receita_ui } = req.body;

  if (!catalogo_id || !nome) {
    return res.status(400).json({ sucesso: false, erro: "Campos obrigatórios faltando." });
  }

  try {
    await pool.query('BEGIN');

    // Adicionando coluna dinamicamente caso não exista
    await pool.query('ALTER TABLE cardapio ADD COLUMN IF NOT EXISTS receita_ui JSONB;');

    const query = `
      INSERT INTO cardapio (catalogo_id, nome, preco, custo_estimado, categoria, status, receita_ui) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const result = await pool.query(query, [catalogo_id, nome, preco || 0, custo_estimado || 0, categoria || 'Salgada', status !== false, receita_ui ? JSON.stringify(receita_ui) : null]);

    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        if (ing.material_id) {
          await pool.query(
            "INSERT INTO catalogo_ingredientes (catalogo_id, material_id, quantidade) VALUES ($1, $2, $3)",
            [catalogo_id, ing.material_id, ing.quantidade || 0]
          );
        }
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ sucesso: true, cardapioCadastrado: result.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Erro ao inserir cardápio:", err);
    res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
  }
});

app.put("/api/cardapio/:id", async (req, res) => {
  const { id } = req.params;
  const { catalogo_id, nome, preco, custo_estimado, categoria, status, ingredientes, receita_ui } = req.body;

  try {
    await pool.query('BEGIN');

    // Adicionando coluna dinamicamente caso não exista
    await pool.query('ALTER TABLE cardapio ADD COLUMN IF NOT EXISTS receita_ui JSONB;');

    const query = `
      UPDATE cardapio 
      SET nome = $1, preco = $2, custo_estimado = $3, categoria = $4, status = $5, receita_ui = $6
      WHERE id = $7 RETURNING *
    `;
    const result = await pool.query(query, [nome, preco || 0, custo_estimado || 0, categoria || 'Salgada', status !== false, receita_ui ? JSON.stringify(receita_ui) : null, id]);

    if (result.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ erro: "Item do cardápio não encontrado" });
    }

    // Atualiza os ingredientes (deleta os antigos e insere os novos)
    if (catalogo_id) {
      await pool.query("DELETE FROM catalogo_ingredientes WHERE catalogo_id = $1", [catalogo_id]);

      if (ingredientes && ingredientes.length > 0) {
        for (const ing of ingredientes) {
          if (ing.material_id) {
            await pool.query(
              "INSERT INTO catalogo_ingredientes (catalogo_id, material_id, quantidade) VALUES ($1, $2, $3)",
              [catalogo_id, ing.material_id, ing.quantidade || 0]
            );
          }
        }
      }
    }

    await pool.query('COMMIT');
    res.json({ sucesso: true, cardapioAtualizado: result.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Erro ao atualizar cardápio:", err);
    res.status(500).json({ erro: "Erro ao atualizar cardápio" });
  }
});

app.delete("/api/cardapio/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // O CASCADE na tabela do banco cuidará de deletar os catalogo_ingredientes
    const result = await pool.query("DELETE FROM cardapio WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" });
    }
    res.json({ mensagem: "Item do cardápio deletado com sucesso", item: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar cardápio:", err);
    res.status(500).json({ erro: "Erro ao deletar item do cardápio" });
  }
});

/* 
  ==============================================================
  EXEMPLO DE INSERÇÃO (POST) COM TRATAMENTO DE ERRO E RESPOSTAS
  ==============================================================
*/
app.post("/api/material", async (req, res) => {
  // 1. Puxar os dados enviados pelo React que estão dentro de req.body
  const { nome, preco, quantidade, unidade, categoria, status } = req.body;

  // 2. Validação Básica: O usuário preencheu o que era obrigatório?
  const faltaPreco =
    preco === undefined || preco === null || preco === "";
  if (!nome || faltaPreco || !quantidade) {
    // status 400 = Bad Request (O cliente mandou algo errado)
    return res.status(400).json({
      sucesso: false,
      erro: "Os campos nome, preço e quantidade são obrigatórios."
    });
  }

  // 3. Tentar executar a lógica no banco (try/catch para evitar o servidor cair)
  try {
    // Usamos $1, $2... para nos proteger contra ataques de SQL Injection
    const query = `
      INSERT INTO material (nome, preco, quantidade, unidade, categoria, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *; 
    `;
    // RETURNING * faz o Postgres devolver exatamente a linha que acabou de ser criada

    const valores = [nome, preco, quantidade, unidade, categoria || 'outros', status];

    const result = await pool.query(query, valores);

    // aqui monta a mensagem de resposta para ser mostrada no console log ou usar para montar uma mensagem
    // sempre usar esse padrão para montar as respostas ".json({ mensagem: "Sucesso no envio !"});"
    res.status(201).json({
      sucesso: true,
      mensagem: "Material salvo com sucesso!",
      materialCadastrado: result.rows[0] // O dado recém criado retorna aqui
    });

  } catch (err) {
    // 5. Tratamento de Erro Interno (Banco caiu, coluna não existe, etc)
    console.error("Erro ao inserir no banco:", err);
    // status 500 = Internal Server Error
    res.status(500).json({
      sucesso: false,
      erro: "Ocorreu um erro interno ao tentar salvar o material."
    });
  }
});

app.get("/api/materialmodelo", async (req, res) => {
  try {
    const query = "SELECT * FROM materialmodelo ORDER BY nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
});

app.post("/api/materialmodelo", async (req, res) => {
  // 1. Puxar os dados enviados pelo React que estão dentro de req.body
  const { nome, preco, quantidade, unidade, categoria } = req.body;

  if (!nome || !preco || !quantidade) {
    // status 400 = Bad Request (O cliente mandou algo errado)
    return res.status(400).json({
      sucesso: false,
      erro: "Todos os campos são obrigatórios."
    });
  }

  // 3. Tentar executar a lógica no banco (try/catch para evitar o servidor cair)
  try {
    // Usamos $1, $2... para nos proteger contra ataques de SQL Injection
    const query = `
      INSERT INTO materialmodelo (nome, preco_exibicao, quantidade, unidade, categoria) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *; 
    `;
    // RETURNING * faz o Postgres devolver exatamente a linha que acabou de ser criada

    const valores = [nome, preco, quantidade, unidade, categoria || 'outros'];

    const result = await pool.query(query, valores);

    // aqui monta a mensagem de resposta para ser mostrada no console log ou usar para montar uma mensagem
    // sempre usar esse padrão para montar as respostas ".json({ mensagem: "Sucesso no envio !"});"
    res.status(201).json({
      sucesso: true,
      mensagem: "Modelo salvo com sucesso!",
      materialCadastrado: result.rows[0] // O dado recém criado retorna aqui
    });

  } catch (err) {
    // 5. Tratamento de Erro Interno (Banco caiu, coluna não existe, etc)
    console.error("Erro ao inserir no banco:", err);
    // status 500 = Internal Server Error
    res.status(500).json({
      sucesso: false,
      erro: "Ocorreu um erro interno ao tentar salvar o material."
    });
  }
});

app.put("/api/materialmodelo/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, preco, quantidade, unidade, categoria } = req.body;
  try {
    const result = await pool.query(
      "UPDATE materialmodelo SET nome = $1, preco_exibicao = $2, quantidade = $3, unidade = $4, categoria = COALESCE($5, categoria) WHERE id = $6 RETURNING *",
      [nome, preco, quantidade, unidade, categoria, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Material não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar material" });
  }
});


// Deletado trecho duplicado de material

app.delete("/api/materialmodelo/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM materialmodelo WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Modelo não encontrado" });
    }
    res.json({ mensagem: "Modelo deletado com sucesso", material: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao deletar modelo" });
  }
});

app.delete("/api/material/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM material WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Material não encontrado" });
    }
    res.json({ mensagem: "Material deletado com sucesso", material: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao deletar material" });
  }
});

app.post("/api/pedidos", async (req, res) => {
  const { cliente, telefone, endereco, bairro, itens, total, taxa_entrega, metodo_pagamento, motoboy_id } = req.body;

  if (!cliente || !itens || !total) {
    return res.status(400).json({ sucesso: false, erro: "Campos obrigatórios faltando." });
  }

  try {
    await pool.query('BEGIN');

    // 1. Calcular custo total automaticamente baseado na ficha técnica
    let custo_total = 0;
    const itensParseados = typeof itens === 'string' ? JSON.parse(itens) : itens;

    if (Array.isArray(itensParseados)) {
      for (const item of itensParseados) {
        const catalogoId = item.catalogo_id;
        const qtdVendida = parseInt(item.quantidade) || 1;

        if (catalogoId) {
          // Busca ingredientes da ficha técnica
          const ingRes = await pool.query(`
            SELECT ci.quantidade as qtd_receita, m.preco as preco_material
            FROM catalogo_ingredientes ci
            JOIN material m ON m.id = ci.material_id
            WHERE ci.catalogo_id = $1
          `, [catalogoId]);

          for (const ing of ingRes.rows) {
            custo_total += parseFloat(ing.qtd_receita) * parseFloat(ing.preco_material) * qtdVendida;
          }
        } else {
          // Fallback: usa custo_estimado enviado pelo frontend
          custo_total += (parseFloat(item.custo_estimado) || 0) * qtdVendida;
        }
      }
    }

    const queryPedido = `
      INSERT INTO pedido (cliente, telefone, endereco, bairro, itens, total, custo_total, taxa_entrega, metodo_pagamento, motoboy_id, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente')
      RETURNING *; 
    `;
    const valoresPedido = [
      cliente, telefone, endereco, bairro,
      JSON.stringify(itensParseados),
      total, custo_total, taxa_entrega || 0,
      metodo_pagamento || 'Dinheiro',
      motoboy_id || null
    ];

    const resultPedido = await pool.query(queryPedido, valoresPedido);
    const pedidoCriado = resultPedido.rows[0];

    // 2. Abater Estoque (Material) com base nas fichas técnicas
    if (Array.isArray(itensParseados)) {
      for (const item of itensParseados) {
        if (item.catalogo_id) {
          const qtdVendida = parseInt(item.quantidade) || 1;
          // Busca os ingredientes dessa pizza
          const resIngredientes = await pool.query(
            "SELECT material_id, quantidade FROM catalogo_ingredientes WHERE catalogo_id = $1",
            [item.catalogo_id]
          );

          // Abate cada ingrediente do material geral
          for (const ing of resIngredientes.rows) {
            const qtdAbater = parseFloat(ing.quantidade) * qtdVendida;
            await pool.query(
              "UPDATE material SET quantidade = quantidade - $1 WHERE id = $2 AND quantidade >= $1",
              [qtdAbater, ing.material_id]
            );
          }
        }
      }
    }

    // 3. Registrar entrada financeira (Removido daqui, agora é feito no status 'entregue')
    // await pool.query(...)

    await pool.query('COMMIT');

    res.status(201).json({
      sucesso: true,
      mensagem: "Pedido processado com sucesso!",
      pedidoCadastrado: pedidoCriado
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Erro ao processar pedido:", err);
    res.status(500).json({ sucesso: false, erro: "Erro interno ao processar o pedido." });
  }
});

app.get("/api/pedidos", async (req, res) => {
  try {
    const query = `
      SELECT * FROM pedido ORDER BY id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ erro: "Erro no servidor ao buscar pedidos" });
  }
});

app.get("/api/bairros", async (req, res) => {
  try {
    // Tabela: bairros | Colunas: id, nome, taxa
    const query = "SELECT id, nome AS bairro, taxa AS valor FROM bairros ORDER BY nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar bairros:", err);
    res.status(500).json({ erro: "Erro no servidor ao buscar bairros" });
  }
});



app.get("/api/bebidas", async (req, res) => {
  try {
    const query = "SELECT * FROM bebidas WHERE status = true ORDER BY bebida ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar bebidas:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.post("/api/bebidas", async (req, res) => {
  const { bebida, quantidade, preco, custo_unitario } = req.body;
  if (!bebida || quantidade === undefined || preco === undefined) {
    return res.status(400).json({ sucesso: false, erro: "Bebida, quantidade e preço são obrigatórios." });
  }

  try {
    const query = "INSERT INTO bebidas (bebida, quantidade, preco, custo_unitario, status) VALUES ($1, $2, $3, $4, true) RETURNING *";
    const result = await pool.query(query, [bebida, quantidade, preco, custo_unitario || 0]);
    res.status(201).json({ sucesso: true, bebidaCadastrada: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cadastrar bebida:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.put("/api/bebidas/:id", async (req, res) => {
  const { id } = req.params;
  const { bebida, quantidade, preco, custo_unitario } = req.body;
  try {
    const query = `
      UPDATE bebidas 
      SET bebida = COALESCE($1, bebida), 
          quantidade = COALESCE($2, quantidade), 
          preco = COALESCE($3, preco),
          custo_unitario = COALESCE($4, custo_unitario)
      WHERE id = $5 RETURNING *`;
    const result = await pool.query(query, [bebida || null, quantidade || null, preco || null, custo_unitario || null, id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: "Bebida não encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar bebida" });
  }
});

app.delete("/api/bebidas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM bebidas WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: "Bebida não encontrada" });
    res.json({ mensagem: "Bebida excluída com sucesso", item: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar bebida:", err);
    res.status(500).json({ erro: "Erro ao deletar bebida" });
  }
});

app.delete("/api/pedidos", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ sucesso: false, erro: "Array de IDs não fornecido." });
  }

  try {
    await pool.query('BEGIN');

    // Deleta os registros financeiros atrelados aos pedidos
    await pool.query("DELETE FROM financeiro WHERE pedido_id = ANY($1::int[])", [ids]);

    const query = "DELETE FROM pedido WHERE id = ANY($1::int[]) RETURNING *";
    const result = await pool.query(query, [ids]);

    await pool.query('COMMIT');
    res.json({ sucesso: true, deletados: result.rows });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Erro ao deletar pedidos:", err);
    res.status(500).json({ erro: "Erro ao deletar pedidos no banco" });
  }
});

// ─── Bordas ────────────────────────────────────────────────

// Lista bordas com seus ingredientes
app.get("/api/bordas", async (req, res) => {
  try {
    const bordas = await pool.query("SELECT * FROM borda ORDER BY nome ASC");

    // Para cada borda, busca os ingredientes vinculados
    const bordasComIngredientes = await Promise.all(
      bordas.rows.map(async (borda) => {
        const ings = await pool.query(
          `SELECT bi.id, bi.quantidade, bi.unidade,
                  m.id AS material_id, m.nome AS material_nome
           FROM borda_ingrediente bi
           JOIN material m ON m.id = bi.material_id
           WHERE bi.borda_id = $1`,
          [borda.id]
        );
        return { ...borda, ingredientes: ings.rows };
      })
    );

    res.json(bordasComIngredientes);
  } catch (err) {
    console.error("Erro ao buscar bordas:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Cadastrar nova borda com ingredientes
app.post("/api/bordas", async (req, res) => {
  const { nome, valor_adicional, ingredientes } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome é obrigatório." });

  try {
    await pool.query("BEGIN");

    const result = await pool.query(
      "INSERT INTO borda (nome, valor_adicional) VALUES ($1, $2) RETURNING *",
      [nome, valor_adicional || 0]
    );
    const novaBorda = result.rows[0];

    // Salva ingredientes (ficha técnica) se houver
    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await pool.query(
          "INSERT INTO borda_ingrediente (borda_id, material_id, quantidade, unidade) VALUES ($1, $2, $3, $4)",
          [novaBorda.id, ing.material_id, ing.quantidade, ing.unidade || "g"]
        );
      }
    }

    await pool.query("COMMIT");
    res.status(201).json({ sucesso: true, borda: novaBorda });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Erro ao cadastrar borda:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// Atualizar borda (substitui ingredientes por completo)
app.put("/api/bordas/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, valor_adicional, ativa, ingredientes } = req.body;

  try {
    await pool.query("BEGIN");

    await pool.query(
      "UPDATE borda SET nome = $1, valor_adicional = $2, ativa = $3 WHERE id = $4",
      [nome, valor_adicional, ativa ?? true, id]
    );

    // Recria ingredientes
    await pool.query("DELETE FROM borda_ingrediente WHERE borda_id = $1", [id]);
    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await pool.query(
          "INSERT INTO borda_ingrediente (borda_id, material_id, quantidade, unidade) VALUES ($1, $2, $3, $4)",
          [id, ing.material_id, ing.quantidade, ing.unidade || "g"]
        );
      }
    }

    await pool.query("COMMIT");
    res.json({ sucesso: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    res.status(500).json({ erro: "Erro ao atualizar borda" });
  }
});

// Deletar borda (cascateia ingredientes via FK)
app.delete("/api/bordas/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM borda WHERE id = $1", [req.params.id]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar borda" });
  }
});


app.get("/api/motoboy", async (req, res) => {
  try {
    const query = "SELECT * FROM motoboy ORDER BY status DESC, nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar motoboys:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.post("/api/motoboy", async (req, res) => {
  const { nome, comissao } = req.body;
  if (!nome) {
    return res.status(400).json({ sucesso: false, erro: "O nome do motoboy é obrigatório." });
  }

  try {
    const query = "INSERT INTO motoboy (nome, comissao, status) VALUES ($1, $2, true) RETURNING *";
    const result = await pool.query(query, [nome, comissao || 0]);
    res.status(201).json({ sucesso: true, motoboy: result.rows[0] });
  } catch (err) {
    console.error("Erro ao cadastrar motoboy:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.put("/api/pedidos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { statuspedido, motoboy_id, pedido_ids_agrupados, bairro } = req.body;

  try {
    let query = "UPDATE pedido SET status = $1 WHERE id = $2 RETURNING *";
    let valores = [statuspedido, id];

    if (statuspedido === 'saiu_entrega' && motoboy_id) {
      query = "UPDATE pedido SET status = $1, motoboy_id = $2 WHERE id = $3 RETURNING *";
      valores = [statuspedido, motoboy_id, id];
    }

    const result = await pool.query(query, valores);
    if (result.rowCount === 0)
      return res.status(404).json({ sucesso: false, erro: "Pedido não encontrado" });

    if (statuspedido === 'saiu_entrega' && motoboy_id) {
      await pool.query(
        `UPDATE motoboy SET pedido = $1, bairro = $2, statuspedido = $3 WHERE id = $4`,
        [pedido_ids_agrupados || id, bairro, statuspedido, motoboy_id]
      );
    }

    if (statuspedido === 'entregue') {
      const pedido = result.rows[0];
      const jaExiste = await pool.query(
        "SELECT id FROM financeiro WHERE pedido_id = $1 AND tipo = 'entrada'", [id]
      );

      if (jaExiste.rowCount === 0) {
        await pool.query('BEGIN');
        try {
          // 1. Entrada: faturamento da venda
          await pool.query(
            `INSERT INTO financeiro (tipo, categoria, descricao, valor, pedido_id, data_movimentacao)
             VALUES ('entrada', 'pedido', $1, $2, $3, NOW())`,
            [`Venda Delivery — Pedido #${id} - ${pedido.cliente}`, pedido.total, id]
          );

          // 2. Custo real dos ingredientes + movimentação de estoque
          const itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens;
          let custoRealTotal = 0;

          if (Array.isArray(itens)) {
            for (const item of itens) {
              const catalogoId = item.catalogo_id || item.id;
              const qtdVendida = parseInt(item.quantidade) || 1;

              if (catalogoId && item.tipo === 'pizza') {
                const ingRes = await pool.query(
                  `SELECT ci.quantidade AS qtd_receita, m.preco AS preco_mat, m.id AS mat_id
                   FROM catalogo_ingredientes ci
                   JOIN material m ON m.id = ci.material_id
                   WHERE ci.catalogo_id = $1`, [catalogoId]
                );
                for (const ing of ingRes.rows) {
                  const qtdConsumida = parseFloat(ing.qtd_receita) * qtdVendida;
                  const custoLinha   = qtdConsumida * parseFloat(ing.preco_mat);
                  if (!isNaN(custoLinha)) custoRealTotal += custoLinha;

                  await pool.query(
                    `INSERT INTO estoque_movimentacao
                       (tipo, material_id, quantidade, custo_unitario, motivo, pedido_id, observacao)
                     VALUES ('saida', $1, $2, $3, 'venda', $4, $5)`,
                    [ing.mat_id, qtdConsumida, parseFloat(ing.preco_mat), id,
                     `${item.nome} x${qtdVendida} — Pedido #${id}`]
                  );
                }
              }

              if (item.tipo === 'bebida') {
                const qtdBeb = parseInt(item.quantidade) || 1;
                const bebRes = await pool.query(
                  `UPDATE bebidas SET quantidade = GREATEST(quantidade - $1, 0)
                   WHERE bebida = $2 RETURNING id, custo_unitario`, [qtdBeb, item.nome]
                );
                if (bebRes.rows.length > 0) {
                  const beb = bebRes.rows[0];
                  const custoBeb = (parseFloat(beb.custo_unitario) || 0) * qtdBeb;
                  custoRealTotal += custoBeb;
                  await pool.query(
                    `INSERT INTO estoque_movimentacao
                       (tipo, bebida_id, quantidade, custo_unitario, motivo, pedido_id, observacao)
                     VALUES ('saida', $1, $2, $3, 'venda', $4, $5)`,
                    [beb.id, qtdBeb, parseFloat(beb.custo_unitario) || 0, id,
                     `${item.nome} x${qtdBeb} — Pedido #${id}`]
                  );
                }
              }
            }
          }

          if (custoRealTotal > 0) {
            await pool.query(
              `INSERT INTO financeiro (tipo, categoria, descricao, valor, pedido_id, data_movimentacao)
               VALUES ('saida', 'custo_venda', $1, $2, $3, NOW())`,
              [`Custo ingredientes — Pedido #${id}`, parseFloat(custoRealTotal.toFixed(2)), id]
            );
          }

          // 3. Comissão do entregador
          const motId = pedido.motoboy_id || motoboy_id;
          if (motId) {
            const motRes = await pool.query(
              'SELECT nome, comissao FROM motoboy WHERE id = $1', [motId]
            );
            if (motRes.rows.length > 0 && parseFloat(motRes.rows[0].comissao) > 0) {
              const mot = motRes.rows[0];
              await pool.query(
                `INSERT INTO financeiro (tipo, categoria, descricao, valor, pedido_id, data_movimentacao)
                 VALUES ('saida', 'comissao', $1, $2, $3, NOW())`,
                [`Comissão ${mot.nome} — Pedido #${id}`, mot.comissao, id]
              );
            }
            await pool.query("UPDATE motoboy SET statuspedido = 'entregue' WHERE id = $1", [motId]);
          }

          await pool.query(
            'UPDATE pedido SET custo_total = $1 WHERE id = $2',
            [parseFloat(custoRealTotal.toFixed(2)), id]
          );

          await pool.query('COMMIT');
        } catch (err2) {
          await pool.query('ROLLBACK');
          throw err2;
        }
      }
    }

    res.json({ sucesso: true, pedido: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar status do pedido:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

// ─── Estoque Valorado ─────────────────────────────────────────
app.get("/api/estoque/valorado", async (req, res) => {
  try {
    const materiais = await pool.query(`
      SELECT
        id, nome, categoria, unidade,
        quantidade::numeric        AS quantidade,
        preco::numeric             AS preco,
        (CASE 
          WHEN unidade IN ('g', 'ml') THEN (quantidade * preco) / 1000.0
          WHEN unidade = 'mg' THEN (quantidade * preco) / 1000000.0
          ELSE (quantidade * preco)
        END)::numeric AS valor_total,
        CASE
          WHEN unidade IN ('g', 'ml') THEN
            CASE
              WHEN quantidade <= 0    THEN 'zerado'
              WHEN quantidade < 500   THEN 'critico'
              WHEN quantidade < 2000  THEN 'baixo'
              ELSE 'ok'
            END
          ELSE
            CASE
              WHEN quantidade <= 0    THEN 'zerado'
              WHEN quantidade < 5     THEN 'critico'
              WHEN quantidade < 15    THEN 'baixo'
              ELSE 'ok'
            END
        END AS nivel
      FROM material
      WHERE status = true
      ORDER BY valor_total DESC
    `);

    const bebidas = await pool.query(`
      SELECT
        id, bebida AS nome,
        quantidade,
        preco             AS preco_venda,
        custo_unitario    AS preco,
        (quantidade * custo_unitario)::numeric AS valor_total,
        CASE
          WHEN quantidade <= 0  THEN 'zerado'
          WHEN quantidade < 5   THEN 'critico'
          WHEN quantidade < 10  THEN 'baixo'
          ELSE 'ok'
        END AS nivel
      FROM bebidas
      WHERE status = true
      ORDER BY valor_total DESC
    `);

    const totalMateriais = materiais.rows.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);
    const totalBebidas   = bebidas.rows.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);

    const criticos = [
      ...materiais.rows.filter(r => r.nivel === 'critico' || r.nivel === 'zerado'),
      ...bebidas.rows.filter(r => r.nivel === 'critico' || r.nivel === 'zerado'),
    ];

    // Valor por categoria de material
    const porCategoria = materiais.rows.reduce((acc, r) => {
      const cat = r.categoria || 'outros';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += parseFloat(r.valor_total || 0);
      return acc;
    }, {});

    res.json({
      valor_total_materiais: parseFloat(totalMateriais.toFixed(2)),
      valor_total_bebidas:   parseFloat(totalBebidas.toFixed(2)),
      valor_total:           parseFloat((totalMateriais + totalBebidas).toFixed(2)),
      materiais:             materiais.rows,
      bebidas:               bebidas.rows,
      criticos,
      por_categoria:         Object.entries(porCategoria).map(([cat, val]) => ({ categoria: cat, valor: parseFloat(val.toFixed(2)) }))
    });
  } catch (err) {
    console.error("Erro ao buscar estoque valorado:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.get("/api/financeiro", async (req, res) => {
  try {
    const query = `
      SELECT id, tipo, categoria, descricao, valor, pedido_id, data_movimentacao 
      FROM financeiro 
      ORDER BY data_movimentacao DESC
    `;
    const result = await pool.query(query);

    // Calcula também o total de custo de materiais de todos os pedidos 
    // (Poderia ser salvo como 'saida' na tabela financeiro, mas vamos pegar direto do pedido para facilitar)
    const queryCustos = `
      SELECT COALESCE(SUM(custo_total), 0) as custo_total_pedidos 
      FROM pedido 
      WHERE status != 'cancelado'
    `;
    const resultCustos = await pool.query(queryCustos);

    res.json({
      movimentacoes: result.rows,
      custo_total_pedidos: resultCustos.rows[0].custo_total_pedidos
    });
  } catch (err) {
    console.error("Erro ao buscar financeiro:", err);
    res.status(500).json({ erro: "Erro no servidor ao buscar financeiro" });
  }
});

app.get("/api/financeiro/relatorios", async (req, res) => {
  const { periodo } = req.query;
  let filtroData = "INTERVAL '1 month'";
  if (periodo === 'dia')    filtroData = "INTERVAL '1 day'";
  if (periodo === 'semana') filtroData = "INTERVAL '7 days'";
  if (periodo === 'ano')    filtroData = "INTERVAL '1 year'";

  try {
    // ── 1. Faturamento agrupado (pedidos entregues) ────────────────────────────
    let groupBy = "DATE(data_movimentacao)";
    let selectLabel = "TO_CHAR(DATE(data_movimentacao), 'DD/MM')";
    
    if (periodo === 'dia') {
      groupBy = "DATE_TRUNC('hour', data_movimentacao)";
      selectLabel = "TO_CHAR(DATE_TRUNC('hour', data_movimentacao), 'HH24:00')";
    } else if (periodo === 'mes') {
      groupBy = "DATE_TRUNC('week', data_movimentacao)";
      // Usamos o groupBy (que é o início da semana) para gerar o label
      selectLabel = "'Sem ' || TO_CHAR(DATE_TRUNC('week', data_movimentacao), 'W') || ' (' || TO_CHAR(DATE_TRUNC('week', data_movimentacao), 'DD/MM') || ')'";
    } else if (periodo === 'ano') {
      groupBy = "DATE_TRUNC('month', data_movimentacao)";
      selectLabel = "TO_CHAR(DATE_TRUNC('month', data_movimentacao), 'MM/YYYY')";
    }

    const [fatTotalQ, fatPorDiaQ] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(valor), 0)::numeric AS total
        FROM financeiro
        WHERE tipo = 'entrada' AND categoria = 'pedido'
          AND data_movimentacao >= NOW() - ${filtroData}
      `),
      pool.query(`
        SELECT ${selectLabel} AS label,
               SUM(valor)::numeric AS valor
        FROM financeiro
        WHERE tipo = 'entrada' AND categoria = 'pedido'
          AND data_movimentacao >= NOW() - ${filtroData}
        GROUP BY ${groupBy}
        ORDER BY ${groupBy} ASC
      `)
    ]);
    const faturamentoTotal = Number(fatTotalQ.rows[0]?.total || 0);

    // ── 2. Custos diretos das vendas (gravados no financeiro) ─────────────────
    const [custoVendaQ, custoComissaoQ] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(valor), 0)::numeric AS total
        FROM financeiro
        WHERE tipo = 'saida' AND categoria = 'custo_venda'
          AND data_movimentacao >= NOW() - ${filtroData}
      `),
      pool.query(`
        SELECT COALESCE(SUM(valor), 0)::numeric AS total
        FROM financeiro
        WHERE tipo = 'saida' AND categoria = 'comissao'
          AND data_movimentacao >= NOW() - ${filtroData}
      `)
    ]);
    const custoVendasTotal   = Number(custoVendaQ.rows[0]?.total || 0);
    const custoComissaoTotal = Number(custoComissaoQ.rows[0]?.total || 0);
    const custoTotal         = custoVendasTotal + custoComissaoTotal;

    // ── 3. Pizzas: mais vendidas + custo por sabor ────────────────────────────
    const pizzasQ = await pool.query(`
      SELECT
        item->>'nome'                             AS nome,
        SUM((item->>'quantidade')::int)::int      AS quantidade,
        MAX(c.custo_estimado)::float              AS custo_unitario,
        SUM((item->>'quantidade')::int * COALESCE(c.custo_estimado, 0))::float AS custo_total,
        ROUND(
          (SUM((item->>'quantidade')::int) * 100.0) / 
          NULLIF((SELECT SUM((sub_item->>'quantidade')::int) FROM pedido sub_p 
                  CROSS JOIN LATERAL jsonb_array_elements(sub_p.itens) AS sub_item 
                  WHERE sub_p.status='entregue' AND sub_p.created_at >= NOW() - ${filtroData} 
                  AND sub_item->>'tipo' = 'pizza'), 0), 1)::float AS percentual_vendas
      FROM pedido p
      CROSS JOIN LATERAL jsonb_array_elements(p.itens) AS item
      LEFT JOIN cardapio c ON c.id = (item->>'catalogo_id')::int
      WHERE p.status = 'entregue'
        AND p.created_at >= NOW() - ${filtroData}
        AND item->>'tipo' = 'pizza'
      GROUP BY item->>'nome'
      ORDER BY quantidade DESC
      LIMIT 10
    `);

    // ── 4. Bebidas mais vendidas ──────────────────────────────────────────────
    const bebidasQ = await pool.query(`
      SELECT item->>'nome'                   AS nome,
             SUM((item->>'quantidade')::int) AS quantidade
      FROM pedido, jsonb_array_elements(itens) AS item
      WHERE status = 'entregue'
        AND created_at >= NOW() - ${filtroData}
        AND item->>'tipo' = 'bebida'
      GROUP BY item->>'nome'
      ORDER BY quantidade DESC
    `);

    // ── 5. Bairros + taxas ────────────────────────────────────────────────────
    const [bairrosQ, taxasQ] = await Promise.all([
      pool.query(`
        SELECT bairro AS nome, COUNT(*) AS quantidade, SUM(total)::numeric AS faturamento
        FROM pedido
        WHERE status = 'entregue' AND created_at >= NOW() - ${filtroData}
        GROUP BY bairro ORDER BY quantidade DESC
      `),
      pool.query(`
        SELECT COALESCE(SUM(taxa_entrega),0)::numeric AS total
        FROM pedido WHERE status = 'entregue' AND created_at >= NOW() - ${filtroData}
      `)
    ]);

    // ── 6. Formas de pagamento ────────────────────────────────────────────────
    const pagamentosQ = await pool.query(`
      SELECT COALESCE(metodo_pagamento, 'Indefinido') AS forma, COUNT(*)::int AS total,
             ROUND((COUNT(*)*100.0)/NULLIF(
               (SELECT COUNT(*) FROM pedido
                WHERE status='entregue' AND created_at >= NOW() - ${filtroData}),0),1)::float AS percentual
      FROM pedido
      WHERE status = 'entregue' AND created_at >= NOW() - ${filtroData}
      GROUP BY metodo_pagamento
    `);

    // ── 7. Comissões por entregador (do financeiro, já gravadas) ─────────────
    const comissoesQ = await pool.query(`
      SELECT SUBSTRING(f.descricao FROM 'Comissão (.+) —') AS nome,
             COUNT(f.id)          AS entregas,
             SUM(f.valor)::numeric AS total_comissao
      FROM financeiro f
      WHERE f.tipo = 'saida' AND f.categoria = 'comissao'
        AND f.data_movimentacao >= NOW() - ${filtroData}
      GROUP BY SUBSTRING(f.descricao FROM 'Comissão (.+) —')
      ORDER BY total_comissao DESC
    `);

    // ── 8. Estoque valorado (snapshot atual) ──────────────────────────────────
    const estoqueQ = await pool.query(`
      SELECT
        COALESCE(SUM(
          CASE 
            WHEN unidade IN ('g', 'ml') THEN (quantidade * preco) / 1000.0
            WHEN unidade = 'mg' THEN (quantidade * preco) / 1000000.0
            ELSE (quantidade * preco)
          END
        ), 0)::numeric AS valor_materiais,
        COUNT(*) FILTER (
          WHERE (unidade IN ('g', 'ml') AND quantidade < 500 AND quantidade > 0)
             OR (unidade NOT IN ('g', 'ml') AND quantidade < 5 AND quantidade > 0)
        ) AS criticos_mat,
        COUNT(*) FILTER (WHERE quantidade <= 0) AS zerados_mat
      FROM material WHERE status = true
    `);
    const bebidasEstQ = await pool.query(`
      SELECT COALESCE(SUM(quantidade * custo_unitario), 0)::numeric AS valor_bebidas,
             COUNT(*) FILTER (WHERE quantidade < 5 AND quantidade > 0) AS criticos_beb
      FROM bebidas WHERE status = true
    `);

    const estoq = estoqueQ.rows[0];
    const bebEstq = bebidasEstQ.rows[0];

    res.json({
      faturamento: { total: faturamentoTotal, por_dia: fatPorDiaQ.rows },
      custos: {
        total:               custoTotal,
        custo_ingredientes:  custoVendasTotal,
        custo_comissoes:     custoComissaoTotal,
        descricao: 'Custo ingredientes + comissões gravados no momento da entrega'
      },
      lucro:     faturamentoTotal - custoTotal,
      pizzas:    { por_sabor:       pizzasQ.rows },
      bebidas:   { por_tipo:        bebidasQ.rows },
      bairros:   { por_bairro:      bairrosQ.rows },
      pagamentos:{ por_forma:       pagamentosQ.rows },
      taxas:     { total:           taxasQ.rows[0].total },
      comissoes: { por_entregador:  comissoesQ.rows },
      estoque:   {
        valor_materiais:  Number(estoq.valor_materiais || 0),
        valor_bebidas:    Number(bebEstq.valor_bebidas || 0),
        valor_total:      Number(estoq.valor_materiais || 0) + Number(bebEstq.valor_bebidas || 0),
        criticos:         Number(estoq.criticos_mat || 0) + Number(bebEstq.criticos_beb || 0),
        zerados:          Number(estoq.zerados_mat  || 0)
      }
    });

  } catch (err) {
    console.error("Erro ao gerar relatórios:", err);
    res.status(500).json({ erro: "Erro ao buscar relatórios" });
  }
});

// ─── Entregadores — atualizar status + dados ────────────
app.put("/api/motoboy/:id", async (req, res) => {
  const { id } = req.params;
  const { status, data_saida, data_entrada, relatorio_ia, nome, celular, veiculo, comissao } = req.body;
  try {
    await pool.query(
      `UPDATE motoboy SET
        status = COALESCE($1, status),
        data_saida = COALESCE($2, data_saida),
        data_entrada = COALESCE($3, data_entrada),
        relatorio_ia = COALESCE($4, relatorio_ia),
        nome = COALESCE($5, nome),
        celular = COALESCE($6, celular),
        veiculo = COALESCE($7, veiculo),
        comissao = COALESCE($8, comissao)
       WHERE id = $9`,
      [status, data_saida, data_entrada, relatorio_ia, nome, celular, veiculo, comissao, id]
    );
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao atualizar entregador:", err);
    res.status(500).json({ erro: "Erro ao atualizar entregador" });
  }
});

// ─── Perfil da Pizzaria ──────────────────────────────────────
app.get("/api/perfil", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM perfil LIMIT 1");
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
});

app.put("/api/perfil", async (req, res) => {
  const { nome_pizzaria, instagram, whatsapp } = req.body;
  try {
    const exists = await pool.query("SELECT id FROM perfil LIMIT 1");
    if (exists.rowCount === 0) {
      await pool.query(
        "INSERT INTO perfil (nome_pizzaria, instagram, whatsapp) VALUES ($1, $2, $3)",
        [nome_pizzaria, instagram, whatsapp]
      );
    } else {
      await pool.query(
        "UPDATE perfil SET nome_pizzaria=$1, instagram=$2, whatsapp=$3, updated_at=NOW() WHERE id=$4",
        [nome_pizzaria, instagram, whatsapp, exists.rows[0].id]
      );
    }
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao salvar perfil:", err);
    res.status(500).json({ erro: "Erro ao salvar perfil" });
  }
});

// ─── Configurações ───────────────────────────────────────────
app.get("/api/configuracoes", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM configuracoes LIMIT 1");
    if (r.rowCount === 0) {
      await pool.query("INSERT INTO configuracoes DEFAULT VALUES");
      const r2 = await pool.query("SELECT * FROM configuracoes LIMIT 1");
      return res.json(r2.rows[0]);
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar configurações" });
  }
});

app.put("/api/configuracoes", async (req, res) => {
  const { ia_provider, ia_model, ia_api_key } = req.body;
  try {
    const exists = await pool.query("SELECT id FROM configuracoes LIMIT 1");
    if (exists.rowCount === 0) {
      await pool.query(
        "INSERT INTO configuracoes (ia_provider, ia_model, ia_api_key) VALUES ($1, $2, $3)",
        [ia_provider, ia_model, ia_api_key]
      );
    } else {
      await pool.query(
        "UPDATE configuracoes SET ia_provider=$1, ia_model=$2, ia_api_key=$3, updated_at=NOW() WHERE id=$4",
        [ia_provider, ia_model, ia_api_key, exists.rows[0].id]
      );
    }
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao salvar configurações" });
  }
});

// ─── Gerenciamento de Perfis de IA ───────────────────────────
app.get("/api/ia/profiles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ia_profiles ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar perfis de IA");
  }
});

app.put("/api/ia/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, model, api_key, base_url, is_active } = req.body;
    await pool.query(`
      UPDATE ia_profiles 
      SET name = $1, provider = $2, model = $3, api_key = $4, base_url = $5, is_active = $6, updated_at = NOW()
      WHERE id = $7
    `, [name, provider, model, api_key, base_url, is_active, id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar perfil de IA");
  }
});

// ─── Assistente IA ───────────────────────────────────────────
app.post("/api/assistente/chat", async (req, res) => {
  try {
    const { mensagens, profile_id } = req.body;

    // Busca o perfil selecionado ou o primeiro ativo
    const queryProfile = profile_id 
      ? "SELECT * FROM ia_profiles WHERE id = $1" 
      : "SELECT * FROM ia_profiles WHERE is_active = true ORDER BY id ASC LIMIT 1";
    const params = profile_id ? [profile_id] : [];
    
    const profileRes = await pool.query(queryProfile, params);
    const profile = profileRes.rows[0];

    if (!profile) {
      return res.json({ erro_config: true, resposta: 'Nenhum perfil de IA configurado ou ativo.' });
    }

    // Contexto do banco para o system prompt
    const [pedidos, materiais, bebidas] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, SUM(total) as faturamento FROM pedido WHERE status='entregue'"),
      pool.query("SELECT nome, quantidade, unidade FROM material ORDER BY quantidade ASC LIMIT 10"),
      pool.query("SELECT bebida, quantidade FROM bebidas WHERE status=true"),
    ]);

    const contexto = `
Você é um assistente especializado no ERP de uma pizzaria gourmet.
Dados atuais do sistema:
- Pedidos entregues: ${pedidos.rows[0].total} | Faturamento total: R$ ${Number(pedidos.rows[0].faturamento || 0).toFixed(2)}
- Materiais em estoque: ${materiais.rows.map(m => `${m.nome}: ${m.quantidade}${m.unidade}`).join(', ')}
- Bebidas: ${bebidas.rows.map(b => `${b.bebida}: ${b.quantidade}un`).join(', ')}
Responda de forma objetiva, útil e com um tom profissional. Use português do Brasil.
`;

    const resposta = await AIService.chat(profile, mensagens, contexto);
    res.json({ resposta, profile_name: profile.name });

  } catch (err) {
    console.error("Erro no assistente IA:", err);
    res.status(500).json({ resposta: `Erro: ${err.message}` });
  }
});

// ─── Limpar banco de dados ───────────────────────────────────
app.delete("/api/dados", async (req, res) => {
  try {
    await pool.query("BEGIN");
    // Limpa dados operacionais, preserva perfil, configurações e bairros
    await pool.query("TRUNCATE TABLE pedido RESTART IDENTITY CASCADE");
    await pool.query("DELETE FROM motoboy");
    await pool.query("DELETE FROM bebidas");
    await pool.query("DELETE FROM material CASCADE");
    await pool.query("DELETE FROM borda CASCADE");
    await pool.query("DELETE FROM cardapio");
    await pool.query("COMMIT");
    res.json({ sucesso: true });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Erro ao limpar banco:", err);
    res.status(500).json({ erro: "Erro ao limpar banco de dados" });
  }
});

app.listen(3002, () => {
  console.log('Server rodando em http://localhost:3002')
})