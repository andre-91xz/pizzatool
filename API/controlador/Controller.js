import pool from '../api_database/db.js';


// ─── MODELOS DE CARDÁPIO (PREDEFINIÇÕES) ────────────────

export const cardapiomodelosGET = async (req, res) => {
  try {
    // Garante que a tabela existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cardapio_modelo (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        receita_ui JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query("SELECT * FROM cardapio_modelo ORDER BY nome ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar modelos:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};

export const cardapiomodelosPOST = async (req, res) => {
  const { nome, receita_ui } = req.body;
  try {
    const query = "INSERT INTO cardapio_modelo (nome, receita_ui) VALUES ($1, $2) RETURNING *";
    const result = await pool.query(query, [nome, JSON.stringify(receita_ui)]);
    res.status(201).json({ sucesso: true, modelo: result.rows[0] });
  } catch (err) {
    console.error("Erro ao salvar modelo:", err);
    res.status(500).json({ erro: "Erro ao salvar modelo" });
  }
};

export const cardapiomodelosDELETE = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM cardapio_modelo WHERE id = $1", [id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao deletar modelo:", err);
    res.status(500).json({ erro: "Erro ao deletar modelo" });
  }
};


// ─── FICHAS TÉCNICAS DE CATEGORIAS (RELATÓRIO MATERIAL) ──

export const categoriaFichaGET = async (req, res) => {
  try {
    // Garante que a tabela existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categoria_ficha_tecnica (
        id SERIAL PRIMARY KEY,
        categoria VARCHAR(50) NOT NULL,
        nome_ingrediente VARCHAR(100) NOT NULL,
        quantidade_necessaria DECIMAL(10,2) NOT NULL,
        unidade VARCHAR(10) NOT NULL,
        UNIQUE(categoria, nome_ingrediente)
      )
    `);

    const check = await pool.query("SELECT COUNT(*) FROM categoria_ficha_tecnica");
    if (parseInt(check.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categoria_ficha_tecnica (categoria, nome_ingrediente, quantidade_necessaria, unidade)
        VALUES 
        ('massas', 'Farinha de Trigo', 125, 'g'),
        ('massas', 'Agua', 75, 'ml'),
        ('massas', 'Sal', 5, 'g'),
        ('massas', 'Fermento', 2, 'g')
      `);
    }

    const result = await pool.query("SELECT * FROM categoria_ficha_tecnica ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar fichas de categoria:", err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
};

export const categoriaFichaPUT = async (req, res) => {
  const { categoria, nome_ingrediente, quantidade_necessaria } = req.body;
  try {
    const query = `
      INSERT INTO categoria_ficha_tecnica (categoria, nome_ingrediente, quantidade_necessaria, unidade)
      VALUES ($1, $2, $3, 'g') 
      ON CONFLICT (categoria, nome_ingrediente) 
      DO UPDATE SET quantidade_necessaria = EXCLUDED.quantidade_necessaria
      RETURNING *;
    `;
    const result = await pool.query(query, [categoria, nome_ingrediente, quantidade_necessaria]);
    res.json({ sucesso: true, ficha: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar ficha de categoria:", err);
    res.status(500).json({ erro: "Erro ao salvar" });
  }
};


// ─── MATERIAL ───────────────────────────────────────────

export const materialGET = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM material"); // Troquei cardapio por material
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
};

export const materialGETID = async (req, res) => {
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
};

export const materialPOST = async (req, res) => {
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
};

export const materialPUT = async (req, res) => {
  const { id } = req.params;
  const { nome, quantidade, preco, unidade, categoria } = req.body;
  try {
    const result = await pool.query(
      `UPDATE material 
   SET nome = COALESCE($1, nome), 
       quantidade = $2,
       preco = COALESCE($3, preco),
       unidade = COALESCE($4, unidade),
       categoria = COALESCE($5, categoria)
   WHERE id = $6 RETURNING *`,
      [nome || null, quantidade, preco || null, unidade || null, categoria || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Material não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar material" });
  }
};

export const materialDELETE = async (req, res) => {
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
};

// ─── MATERIAL MODELO ────────────────────────────────────
export const materialmodeloGET = async (req, res) => {
  try {
    const query = "SELECT id, nome, preco, quantidade, unidade, categoria FROM materialmodelo ORDER BY nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no servidor");
  }
};

export const materialmodeloPOST = async (req, res) => {
  const { nome, preco, quantidade, unidade, categoria } = req.body;

  if (!nome || !preco || !quantidade) {
    return res.status(400).json({
      sucesso: false,
      erro: "Todos os campos são obrigatórios."
    });
  }

  try {
    const query = `
      INSERT INTO materialmodelo (nome, preco, quantidade, unidade, categoria) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *; 
    `;

    const valores = [nome, preco, quantidade, unidade || 'g', categoria || 'outros'];

    const result = await pool.query(query, valores);

    res.status(201).json({
      sucesso: true,
      mensagem: "Modelo salvo com sucesso!",
      materialCadastrado: result.rows[0]
    });

  } catch (err) {
    console.error("Erro ao inserir no banco:", err);
    res.status(500).json({
      sucesso: false,
      erro: "Ocorreu um erro interno ao tentar salvar o material."
    });
  }
};

export const materialmodeloPUT = async (req, res) => {
  const { id } = req.params;
  const { nome, preco, quantidade, unidade, categoria } = req.body;
  try {
    const result = await pool.query(
      "UPDATE materialmodelo SET nome = $1, preco = $2, quantidade = $3, unidade = $4, categoria = COALESCE($5, categoria) WHERE id = $6 RETURNING *",
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
};

export const materialmodeloDELETE = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM materialmodelo WHERE id = $1 RETURNING *", [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao deletar" });
  }
};

// ──────── Bordas ───────────────────────────────────────────

// Lista bordas com seus ingredientes
export const bordasGET = async (req, res) => {
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
};

// Cadastrar nova borda com ingredientes
export const bordasPOST = async (req, res) => {
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
};

// Atualizar borda (substitui ingredientes por completo)
export const bordasPUT = async (req, res) => {
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
};

// Deletar borda (cascateia ingredientes via FK)
export const bordasDELETE = async (req, res) => {
  try {
    await pool.query("DELETE FROM borda WHERE id = $1", [req.params.id]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar borda" });
  }
};

// ─── BEBIDAS ────────────────────────────────────────────

export const bebidasGET = async (req, res) => {
  try {
    const query = "SELECT * FROM bebidas WHERE status = true ORDER BY bebida ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar bebidas:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};

export const bebidasPOST = async (req, res) => {
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
};

export const bebidasPUT = async (req, res) => {
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
};

export const bebidasDELETE = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM bebidas WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: "Bebida não encontrada" });
    res.json({ mensagem: "Bebida excluída com sucesso", item: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar bebida:", err);
    res.status(500).json({ erro: "Erro ao deletar bebida" });
  }
};


// ─── PEDIDOS ────────────────────────────────────────────
export const pedidosPOST = async (req, res) => {
  const { cliente, telefone, endereco, bairro, itens, total, taxa_entrega, metodo_pagamento, motoboy_id, created_at } = req.body;

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

    // Usa hora local (sv-SE retorna YYYY-MM-DD HH:mm:ss que o Postgres aceita bem)
    const dataFinal = created_at || new Date().toLocaleString('sv-SE').replace(' ', 'T').split('.')[0].replace('T', ' ');

    const queryPedido = `
        INSERT INTO pedido (cliente, telefone, endereco, bairro, itens, total, custo_total, taxa_entrega, metodo_pagamento, motoboy_id, status, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendente', $11)
        RETURNING *; 
      `;
    const valoresPedido = [
      cliente, telefone, endereco, bairro,
      JSON.stringify(itensParseados),
      total, custo_total, taxa_entrega || 0,
      metodo_pagamento || 'Dinheiro',
      motoboy_id || null,
      dataFinal
    ];

    const resultPedido = await pool.query(queryPedido, valoresPedido);
    const pedidoCriado = resultPedido.rows[0];

    // 2. Abater Estoque (Material) -> Agora feito no status 'entregue' para maior precisão

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
};

export const pedidosGET = async (req, res) => {
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
};

export const pedidoStatusPUT = async (req, res) => {
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
                let ingRows = [];
                // 1. Tenta buscar na tabela catalogo_ingredientes
                const ingRes = await pool.query(
                  `SELECT ci.quantidade AS qtd_receita, m.preco AS preco_mat, m.id AS mat_id, m.nome AS mat_nome
                   FROM catalogo_ingredientes ci
                   JOIN material m ON m.id = ci.material_id
                   WHERE ci.catalogo_id = $1`, [catalogoId]
                );
                ingRows = ingRes.rows;

                // 2. Se vazio, busca no JSON receita_ui do cardápio
                if (ingRows.length === 0) {
                  const cardapioRes = await pool.query("SELECT receita_ui FROM cardapio WHERE id = $1", [catalogoId]);
                  if (cardapioRes.rows.length > 0) {
                    const receita_ui = typeof cardapioRes.rows[0].receita_ui === 'string'
                      ? JSON.parse(cardapioRes.rows[0].receita_ui)
                      : cardapioRes.rows[0].receita_ui;
                    
                    const ingredientesLista = receita_ui?.ingredientesLista || [];
                    if (ingredientesLista.length > 0) {
                      const todosMateriais = await pool.query("SELECT id, nome, preco FROM material");
                      const fichasTecnicas = await pool.query("SELECT * FROM categoria_ficha_tecnica");

                      for (const ingJson of ingredientesLista) {
                        const norm = (t) => (t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        
                        // CASO ESPECIAL: Massas (Receita Composta)
                        if (ingJson.categoria === 'massas') {
                          const subItens = fichasTecnicas.rows.filter(f => f.categoria === 'massas');
                          const fatorMassa = (parseFloat(ingJson.pedacos) || 8) / 8; // Base 8 pedaços
                          
                          for (const sub of subItens) {
                            const matEncontrado = todosMateriais.rows.find(m => norm(m.nome) === norm(sub.nome_ingrediente));
                            if (matEncontrado) {
                              ingRows.push({
                                mat_id: matEncontrado.id,
                                mat_nome: matEncontrado.nome,
                                preco_mat: matEncontrado.preco,
                                qtd_receita: parseFloat(sub.quantidade_necessaria) * fatorMassa
                              });
                            }
                          }
                          continue; // Pula a busca direta pelo nome "Massa..."
                        }

                        // Caso Normal: Busca direta por nome
                        const matEncontrado = todosMateriais.rows.find(m => norm(m.nome) === norm(ingJson.nome));
                        if (matEncontrado) {
                          ingRows.push({
                            mat_id: matEncontrado.id,
                            mat_nome: matEncontrado.nome,
                            preco_mat: matEncontrado.preco,
                            qtd_receita: ingJson.quantidade_base || ingJson.quantidade
                          });
                        }
                      }
                    }
                  }
                }

                for (const ing of ingRows) {
                  const qtdConsumida = parseFloat(ing.qtd_receita) * qtdVendida;
                  const custoLinha = qtdConsumida * parseFloat(ing.preco_mat);
                  if (!isNaN(custoLinha)) custoRealTotal += custoLinha;

                  // Subtração Real de Estoque
                  await pool.query(
                    "UPDATE material SET quantidade = GREATEST(quantidade - $1, 0) WHERE id = $2",
                    [qtdConsumida, ing.mat_id]
                  );
                  console.log(`[ESTOQUE] Subtraído ${qtdConsumida} de ${ing.mat_nome} (Pedido #${id})`);

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
};

export const pedidosDELETE = async (req, res) => {
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
};

// ─── MOTOBOY ────────────────────────────────────────────
export const motoboyGET = async (req, res) => {
  try {
    const query = "SELECT * FROM motoboy ORDER BY status DESC, nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar motoboys:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};

export const motoboyPOST = async (req, res) => {
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
};

export const motoboyPUT = async (req, res) => {
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
};

// ─── CATEGORIAS E CARDÁPIO ──────────────────────────────

export const categoriaList = async (req, res) => {
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
};

// ─── ROTAS DO CARDÁPIO E CATEGORIAS ──────────────────────────────

// ─── CARDÁPIO (Sincronizado apenas com a tabela 'cardapio') ──────────────

export const cardapio = async (req, res) => {
  try {
    // Busca apenas na tabela cardapio, sem JOINS com outras tabelas
    const query = "SELECT * FROM cardapio ORDER BY nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar cardápio:", err);
    res.status(500).send("Erro no servidor");
  }
};

export const cardapioPOST = async (req, res) => {
  // Pegamos exatamente o que o Frontend envia no payload
  const { nome, preco, custo_estimado, categoria, status, receita_ui, descricao, tamanho } = req.body;

  if (!nome) {
    return res.status(400).json({ sucesso: false, erro: "O nome da pizza é obrigatório." });
  }

  try {
    const query = `
      INSERT INTO cardapio (nome, preco, custo_estimado, categoria, status, receita_ui, descricao, tamanho) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;

    // O receita_ui já contém a lista de ingredientes que o front mandou
    const valores = [
      nome,
      preco || 0,
      custo_estimado || 0,
      categoria || 'Salgada',
      status !== undefined ? status : true,
      receita_ui ? JSON.stringify(receita_ui) : null,
      descricao || '',
      tamanho || '8 Pedaços'
    ];

    const result = await pool.query(query, valores);
    res.status(201).json({ sucesso: true, cardapioCadastrado: result.rows[0] });
  } catch (err) {
    console.error("Erro ao inserir no cardápio:", err);
    res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
  }
};

export const cardapioPUT = async (req, res) => {
  const { id } = req.params;
  const { nome, preco, custo_estimado, categoria, status, receita_ui, descricao, tamanho } = req.body;

  try {
    const query = `
      UPDATE cardapio 
      SET nome = $1, preco = $2, custo_estimado = $3, categoria = $4, status = $5, receita_ui = $6, descricao = $7, tamanho = $8
      WHERE id = $9 RETURNING *
    `;

    const valores = [
      nome,
      preco,
      custo_estimado,
      categoria,
      status !== false,
      receita_ui ? JSON.stringify(receita_ui) : null,
      descricao || '',
      tamanho || '8 Pedaços',
      id
    ];

    const result = await pool.query(query, valores);

    if (result.rowCount === 0) {
      return res.status(404).json({ sucesso: false, erro: "Item não encontrado." });
    }

    res.json({ sucesso: true, cardapioAtualizado: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar cardápio:", err);
    res.status(500).json({ sucesso: false, erro: "Erro ao atualizar item." });
  }
};

export const cardapioDELETE = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM cardapio WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ sucesso: false, erro: "Item não encontrado." });
    }
    res.json({ sucesso: true, mensagem: "Deletado com sucesso", item: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar do cardápio:", err);
    res.status(500).json({ sucesso: false, erro: "Erro ao deletar item." });
  }
};


export const bairrosGET = async (req, res) => {
  try {
    // Tabela: bairros | Colunas: id, nome, taxa
    const query = "SELECT id, nome AS bairro, taxa AS valor FROM bairros ORDER BY nome ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar bairros:", err);
    res.status(500).json({ erro: "Erro no servidor ao buscar bairros" });
  }
};


// ─── FINANCEIRO E ESTOQUE ───────────────────────────────











// ─── Estoque Valorado ─────────────────────────────────────────
export const estoqueValoradoGET = async (req, res) => {
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
    const totalBebidas = bebidas.rows.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);

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
      valor_total_bebidas: parseFloat(totalBebidas.toFixed(2)),
      valor_total: parseFloat((totalMateriais + totalBebidas).toFixed(2)),
      materiais: materiais.rows,
      bebidas: bebidas.rows,
      criticos,
      por_categoria: Object.entries(porCategoria).map(([cat, val]) => ({ categoria: cat, valor: parseFloat(val.toFixed(2)) }))
    });
  } catch (err) {
    console.error("Erro ao buscar estoque valorado:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};
// ─── FINANCEIRO ───────────────────────────────

export const financeiroGET = async (req, res) => {
  try {
    const query = `
      SELECT id, tipo, categoria, descricao, valor, pedido_id, data_movimentacao 
      FROM financeiro 
      ORDER BY data_movimentacao DESC
      LIMIT 50
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
};

export const financeiroRelatoriosGET = async (req, res) => {
  const { periodo } = req.query;
  let filtroData = "INTERVAL '1 month'";
  if (periodo === 'dia') filtroData = "INTERVAL '1 day'";
  if (periodo === 'semana') filtroData = "INTERVAL '7 days'";
  if (periodo === 'ano') filtroData = "INTERVAL '1 year'";

  try {
    // ── 1. Faturamento agrupado (pedidos entregues) ────────────────────────────
    let groupBy = "DATE(data_movimentacao::timestamptz)";
    let selectLabel = "TO_CHAR(DATE(data_movimentacao::timestamptz), 'DD/MM')";

    if (periodo === 'dia') {
      groupBy = "DATE_TRUNC('hour', data_movimentacao::timestamptz)";
      selectLabel = "TO_CHAR(DATE_TRUNC('hour', data_movimentacao::timestamptz), 'HH24:00')";
    } else if (periodo === 'mes') {
      groupBy = "DATE_TRUNC('week', data_movimentacao::timestamptz)";
      // Usamos o groupBy (que é o início da semana) para gerar o label
      selectLabel = "'Sem ' || TO_CHAR(DATE_TRUNC('week', data_movimentacao::timestamptz), 'W') || ' (' || TO_CHAR(DATE_TRUNC('week', data_movimentacao::timestamptz), 'DD/MM') || ')'";
    } else if (periodo === 'ano') {
      groupBy = "DATE_TRUNC('month', data_movimentacao::timestamptz)";
      selectLabel = "TO_CHAR(DATE_TRUNC('month', data_movimentacao::timestamptz), 'MM/YYYY')";
    }

    const [fatTotalQ, fatPorDiaQ] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(valor), 0)::numeric AS total
        FROM financeiro
        WHERE tipo = 'entrada' AND categoria = 'pedido'
          AND data_movimentacao::timestamptz >= NOW() - ${filtroData}
      `),
      periodo === 'ano' ?
        pool.query(`
        WITH meses_ativos AS (
          SELECT DISTINCT DATE_TRUNC('month', data_movimentacao::timestamptz) as mes
          FROM financeiro
          WHERE data_movimentacao::timestamptz >= NOW() - ${filtroData}
        )
        SELECT 
          TO_CHAR(m.mes, 'MM/YYYY') AS label,
          COALESCE(SUM(f.valor), 0)::numeric AS valor
        FROM meses_ativos m
        LEFT JOIN financeiro f ON DATE_TRUNC('month', f.data_movimentacao::timestamptz) = m.mes 
          AND f.tipo = 'entrada' AND f.categoria = 'pedido'
        GROUP BY m.mes
        ORDER BY m.mes ASC
      `) :
        pool.query(`
        SELECT ${selectLabel} AS label,
               SUM(valor)::numeric AS valor
        FROM financeiro
        WHERE tipo = 'entrada' AND categoria = 'pedido'
          AND data_movimentacao::timestamptz >= NOW() - ${filtroData}
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
          AND data_movimentacao::timestamptz >= NOW() - ${filtroData}
      `),
      pool.query(`
        SELECT COALESCE(SUM(valor), 0)::numeric AS total
        FROM financeiro
        WHERE tipo = 'saida' AND categoria = 'comissao'
          AND data_movimentacao::timestamptz >= NOW() - ${filtroData}
      `)
    ]);
    const custoVendasTotal = Number(custoVendaQ.rows[0]?.total || 0);
    const custoComissaoTotal = Number(custoComissaoQ.rows[0]?.total || 0);
    const custoTotal = custoVendasTotal + custoComissaoTotal;

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
                  WHERE sub_p.status='entregue' AND sub_p.created_at::timestamptz >= NOW() - ${filtroData} 
                  AND sub_item->>'tipo' = 'pizza'), 0), 1)::float AS percentual_vendas
      FROM pedido p
      CROSS JOIN LATERAL jsonb_array_elements(p.itens) AS item
      LEFT JOIN cardapio c ON c.id = (item->>'catalogo_id')::int
      WHERE p.status = 'entregue'
        AND p.created_at::timestamptz >= NOW() - ${filtroData}
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
        AND created_at::timestamptz >= NOW() - ${filtroData}
        AND item->>'tipo' = 'bebida'
      GROUP BY item->>'nome'
      ORDER BY quantidade DESC
    `);

    // ── 5. Bairros + taxas ────────────────────────────────────────────────────
    const [bairrosQ, taxasQ] = await Promise.all([
      pool.query(`
        SELECT bairro AS nome, COUNT(*) AS quantidade, SUM(total)::numeric AS faturamento
        FROM pedido
        WHERE status = 'entregue' AND created_at::timestamptz >= NOW() - ${filtroData}
        GROUP BY bairro ORDER BY quantidade DESC
      `),
      pool.query(`
        SELECT COALESCE(SUM(taxa_entrega),0)::numeric AS total
        FROM pedido WHERE status = 'entregue' AND created_at::timestamptz >= NOW() - ${filtroData}
      `)
    ]);

    // ── 6. Formas de pagamento ────────────────────────────────────────────────
    const pagamentosQ = await pool.query(`
      SELECT COALESCE(metodo_pagamento, 'Indefinido') AS forma, COUNT(*)::int AS total,
             ROUND((COUNT(*)*100.0)/NULLIF(
               (SELECT COUNT(*) FROM pedido
                WHERE status='entregue' AND created_at::timestamptz >= NOW() - ${filtroData}),0),1)::float AS percentual
      FROM pedido
      WHERE status = 'entregue' AND created_at::timestamptz >= NOW() - ${filtroData}
      GROUP BY metodo_pagamento
    `);

    // ── 7. Comissões por entregador (do financeiro, já gravadas) ─────────────
    const comissoesQ = await pool.query(`
      SELECT SUBSTRING(f.descricao FROM 'Comissão (.+) —') AS nome,
             COUNT(f.id)          AS entregas,
             SUM(f.valor)::numeric AS total_comissao
      FROM financeiro f
      WHERE f.tipo = 'saida' AND f.categoria = 'comissao'
        AND f.data_movimentacao::timestamptz >= NOW() - ${filtroData}
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
        total: custoTotal,
        custo_ingredientes: custoVendasTotal,
        custo_comissoes: custoComissaoTotal,
        descricao: 'Custo ingredientes + comissões gravados no momento da entrega'
      },
      lucro: faturamentoTotal - custoTotal,
      pizzas: { por_sabor: pizzasQ.rows },
      bebidas: { por_tipo: bebidasQ.rows },
      bairros: { por_bairro: bairrosQ.rows },
      pagamentos: { por_forma: pagamentosQ.rows },
      taxas: { total: taxasQ.rows[0].total },
      comissoes: { por_entregador: comissoesQ.rows },
      estoque: {
        valor_materiais: Number(estoq.valor_materiais || 0),
        valor_bebidas: Number(bebEstq.valor_bebidas || 0),
        valor_total: Number(estoq.valor_materiais || 0) + Number(bebEstq.valor_bebidas || 0),
        criticos: Number(estoq.criticos_mat || 0) + Number(bebEstq.criticos_beb || 0),
        zerados: Number(estoq.zerados_mat || 0)
      }
    });

  } catch (err) {
    console.error("Erro ao gerar relatórios:", err);
    res.status(500).json({ erro: "Erro ao buscar relatórios" });
  }
};

// ─── PERFIL E CONFIGURAÇÕES ─────────────────────────────

// ─── Perfil da Pizzaria ──────────────────────────────────────
export const perfilGET = async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM perfil LIMIT 1");
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
};

export const perfilPUT = async (req, res) => {
  const { nome_pizzaria, instagram, whatsapp } = req.body;
  const logo_path = req.file ? `uploads/perfil/${req.file.filename}` : null;

  try {
    // Garante que a coluna logo_path existe
    await pool.query("ALTER TABLE perfil ADD COLUMN IF NOT EXISTS logo_path VARCHAR(255)");

    const exists = await pool.query("SELECT id FROM perfil LIMIT 1");
    if (exists.rowCount === 0) {
      await pool.query(
        "INSERT INTO perfil (nome_pizzaria, instagram, whatsapp, logo_path) VALUES ($1, $2, $3, $4)",
        [nome_pizzaria, instagram, whatsapp, logo_path]
      );
    } else {
      // Se não enviou logo, mantém o caminho antigo
      if (logo_path) {
        await pool.query(
          "UPDATE perfil SET nome_pizzaria=$1, instagram=$2, whatsapp=$3, logo_path=$4, updated_at=NOW() WHERE id=$5",
          [nome_pizzaria, instagram, whatsapp, logo_path, exists.rows[0].id]
        );
      } else {
        await pool.query(
          "UPDATE perfil SET nome_pizzaria=$1, instagram=$2, whatsapp=$3, updated_at=NOW() WHERE id=$4",
          [nome_pizzaria, instagram, whatsapp, exists.rows[0].id]
        );
      }
    }
    res.json({ sucesso: true, logo_path });
  } catch (err) {
    console.error("Erro ao salvar perfil:", err);
    res.status(500).json({ erro: "Erro ao salvar perfil" });
  }
};

// ─── Configurações ───────────────────────────────────────────
export const configuracoesGET = async (req, res) => {
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
};

export const configuracoesPUT = async (req, res) => {
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
};

// ─── Gerenciamento de Perfis de IA ───────────────────────────
export const getIAProfiles = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ia_profiles ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar perfis de IA");
  }
};

export const updateIAProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider, name, model, api_key, is_active } = req.body;

    if (is_active) {
      // Se este perfil está sendo ativado, desativamos todos os outros no banco primeiro
      await pool.query("UPDATE ia_profiles SET is_active = false WHERE id <> $1", [id]);
    }

    await pool.query("UPDATE ia_profiles SET provider = $1, name = $2, model = $3, api_key = $4, is_active = $5 WHERE id = $6",
      [provider, name, model, api_key, is_active, id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar perfil de IA");
  }
};

// ─── Limpar banco de dados ───────────────────────────────────
export const deletarDados = async (req, res) => {
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
};

export const getHistorico = async (req, res) => { res.json([]); };
export const limparHistorico = async (req, res) => { res.json({ sucesso: true }); };
// ─── OPERAÇÕES ADICIONAIS PARA AUTONOMIA IA ────────────────
export const pedidoPUT = async (req, res) => {
  const { id } = req.params;
  const {
    cliente, telefone, endereco, bairro,
    total, custo_total, taxa_entrega,
    metodo_pagamento, status, motoboy_id,
    created_at
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE pedido SET 
        cliente = COALESCE($1, cliente),
        telefone = COALESCE($2, telefone),
        endereco = COALESCE($3, endereco),
        bairro = COALESCE($4, bairro),
        total = COALESCE($5, total),
        custo_total = COALESCE($6, custo_total),
        taxa_entrega = COALESCE($7, taxa_entrega),
        metodo_pagamento = COALESCE($8, metodo_pagamento),
        status = COALESCE($9, status),
        motoboy_id = COALESCE($10, motoboy_id),
        created_at = COALESCE($11, created_at)
       WHERE id = $12 RETURNING *`,
      [cliente, telefone, endereco, bairro, total, custo_total, taxa_entrega, metodo_pagamento, status, motoboy_id, created_at, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ erro: "Pedido não encontrado" });
    res.json({ sucesso: true, pedido: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar pedido:", err);
    res.status(500).json({ erro: "Erro ao atualizar pedido" });
  }
};

export const pedidoDELETE_ID = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');
    await pool.query("DELETE FROM financeiro WHERE pedido_id = $1", [id]);
    const result = await pool.query("DELETE FROM pedido WHERE id = $1 RETURNING *", [id]);
    await pool.query('COMMIT');
    if (result.rowCount === 0) return res.status(404).json({ erro: "Pedido não encontrado" });
    res.json({ sucesso: true, deletado: result.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Erro ao deletar pedido:", err);
    res.status(500).json({ erro: "Erro ao deletar pedido" });
  }
};
