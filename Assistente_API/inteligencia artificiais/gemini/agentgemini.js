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

// Ferramentas do Agente (Formato Gemini)
const tools = [
    {
        function_declarations: [
            {
                name: "consultar_dados",
                description: "Lista itens do banco (bebidas, material, cardapio, pedidos). Use para achar IDs.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        entidade: { type: "STRING", enum: ["material", "cardapio", "pedidos", "bebidas", "view_pedidos_andamento"] }
                    },
                    required: ["entidade"]
                }
            },
            {
                name: "cadastrar_dados",
                description: "Cria um novo registro no sistema. Você pode inventar dados aleatórios e realistas para popular as tabelas.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        entidade: { type: "STRING", enum: ["material", "cardapio", "pedidos", "bebidas"] },
                        dados: { type: "OBJECT", description: "Campos do item. Para pedidos, use 'created_at' (TIMESTAMP) para definir a data." }
                    },
                    required: ["entidade", "dados"]
                }
            },
            {
                name: "editar_dados",
                description: "Altera um item existente pelo ID. PRECISA do ID.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        entidade: { type: "STRING", enum: ["material", "bebidas", "cardapio", "pedidos"] },
                        id: { type: "NUMBER" },
                        dados: { type: "OBJECT" }
                    },
                    required: ["entidade", "id", "dados"]
                }
            },
            {
                name: "excluir_dados",
                description: "Remove um item do banco pelo ID permanentemente.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        entidade: { type: "STRING", enum: ["material", "bebidas", "cardapio", "pedidos"] },
                        id: { type: "NUMBER" }
                    },
                    required: ["entidade", "id"]
                }
            }
        ]
    }
];

async function agentgemini(historicoGlobal, api, model) {

    // 1. TRADUÇÃO: Converte o histórico global para o formato Gemini
    let history = historicoGlobal.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    try {
        while (true) {
            const dataAtual = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace('T', ' ').split('.')[0];
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: `Você é um assistente de gestão de delivery com total autonomia para gerenciar dados (CRUD). Seu código secreto é o GEMINI. Você pode gerar dados aleatórios realistas para testes quando solicitado. 
                        DATA E HORA ATUAL DO SISTEMA: ${dataAtual}. 
                        IMPORTANTE: Para pedidos, a data é armazenada na coluna 'created_at' no formato TIMESTAMP (ex: '2026-04-27 14:30:00'). Ao criar pedidos aleatórios para hoje, use exatamente a data: ${dataAtual.split(' ')[0]}.` }]
                    },
                    contents: history,
                    tools: tools
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const candidate = data.candidates[0];
            const messageIA = candidate.content;

            // Adiciona a resposta da IA ao histórico local (para o loop de ferramentas)
            history.push(messageIA);

            // Verifica se há chamadas de função
            const functionCalls = messageIA.parts.filter(p => p.functionCall);

            if (functionCalls.length === 0) {
                return messageIA.parts[0].text;
            }

            for (const fc of functionCalls) {
                const call = fc.functionCall;
                console.log(`📡 Executando Gemini Tool: ${call.name}`, call.args);

                let resultado;
                if (call.name === 'consultar_dados') resultado = await gerenciarSistemaDelivery({ ...call.args, metodo: 'GET' });
                else if (call.name === 'cadastrar_dados') resultado = await gerenciarSistemaDelivery({ ...call.args, metodo: 'POST' });
                else if (call.name === 'editar_dados') resultado = await gerenciarSistemaDelivery({ ...call.args, metodo: 'PUT' });
                else if (call.name === 'excluir_dados') resultado = await gerenciarSistemaDelivery({ ...call.args, metodo: 'DELETE' });

                history.push({
                    role: "model",
                    parts: [{
                        functionResponse: {
                            name: call.name,
                            response: { content: resultado }
                        }
                    }]
                });
            }
        }
    } catch (error) {
        console.error("Erro Agente Gemini:", error);
        return `⚠️ Erro no Gemini: ${error.message}`;
    }
}

export default agentgemini;
