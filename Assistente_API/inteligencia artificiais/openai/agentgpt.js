import fetch from 'node-fetch';

// Função central para gerenciar todas as operações (CRUD)
async function gerenciarSistemaDelivery({ metodo, entidade, id, dados }) {
    try {
        let url = `http://localhost:3002/api/${entidade || 'material'}`;
        if (id) url += `/${id}`;

        const options = {
            method: metodo || 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        if (dados) options.body = JSON.stringify(dados);

        console.log(`🚀 API Request: ${options.method} em ${url}`);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Erro API: ${response.statusText}`);

        return await response.json();
    } catch (error) {
        return { erro: `Falha na operação: ${error.message}` };
    }
}

// Ferramentas do Agente
const tools = [
    {
        type: "function",
        function: {
            name: "consultar_dados",
            description: "Lista itens do banco (bebidas, material, cardapio, pedidos). Use para achar IDs.",
            parameters: {
                type: "object",
                properties: {
                    entidade: { type: "string", enum: ["material", "cardapio", "pedidos", "bebidas", "view_pedidos_andamento"] }
                },
                required: ["entidade"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "cadastrar_dados",
            description: "Cria um novo registro no sistema. Você pode inventar dados aleatórios e realistas para popular as tabelas.",
            parameters: {
                type: "object",
                properties: {
                    entidade: { type: "string", enum: ["material", "cardapio", "pedidos", "bebidas"] },
                    dados: { type: "object", description: "Campos do item. Para pedidos, use 'created_at' (TIMESTAMP) para definir a data." }
                },
                required: ["entidade", "dados"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "editar_dados",
            description: "Altera um item pelo ID. PRECISA do ID.",
            parameters: {
                type: "object",
                properties: {
                    entidade: { type: "string", enum: ["material", "bebidas", "cardapio", "pedidos"] },
                    id: { type: "number" },
                    dados: { type: "object" }
                },
                required: ["entidade", "id", "dados"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "excluir_dados",
            description: "Remove um item do banco pelo ID permanentemente.",
            parameters: {
                type: "object",
                properties: {
                    entidade: { type: "string", enum: ["material", "bebidas", "cardapio", "pedidos"] },
                    id: { type: "number" }
                },
                required: ["entidade", "id"]
            }
        }
    }
];

async function agentgpt(historicoGlobal, api, model) {
    const modelUsed = model;
    
    const dataAtual = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace('T', ' ').split('.')[0];
    
    // Adiciona o prompt de sistema no início do histórico para a chamada atual
    let mensagens = [
        {
            role: "system",
            content: `Você é um assistente de gestão de delivery com total autonomia para gerenciar dados (CRUD). Você pode gerar dados aleatórios realistas para testes quando solicitado. 
            DATA E HORA ATUAL DO SISTEMA: ${dataAtual}. 
            IMPORTANTE: Para pedidos, a data é armazenada na coluna 'created_at' no formato TIMESTAMP (ex: '2026-04-27 14:30:00'). Ao criar pedidos aleatórios para hoje, use exatamente a data: ${dataAtual.split(' ')[0]}.`
        },
        ...historicoGlobal
    ];

    try {
        while (true) {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${api}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelUsed, messages: mensagens, tools: tools, tool_choice: "auto" })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const mensagemIA = data.choices[0].message;
            mensagens.push(mensagemIA);

            if (!mensagemIA.tool_calls) {
                return mensagemIA.content;
            }

            for (const toolCall of mensagemIA.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`📡 Executando GPT Tool: ${toolCall.function.name}`, args);

                let resultado;
                if (toolCall.function.name === 'consultar_dados') resultado = await gerenciarSistemaDelivery({ ...args, metodo: 'GET' });
                else if (toolCall.function.name === 'cadastrar_dados') resultado = await gerenciarSistemaDelivery({ ...args, metodo: 'POST' });
                else if (toolCall.function.name === 'editar_dados') resultado = await gerenciarSistemaDelivery({ metodo: 'PUT', ...args });
                else if (toolCall.function.name === 'excluir_dados') resultado = await gerenciarSistemaDelivery({ ...args, metodo: 'DELETE' });

                mensagens.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(resultado) });
            }
        }
    } catch (error) {
        console.error("Erro Agente GPT:", error);
        return `⚠️ Erro na OpenAI: ${error.message}`;
    }
}

export default agentgpt;
