// controller.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import openrouterIA from '../inteligencia artificiais/openrouter/agentopen.js'
import agentgemini from '../inteligencia artificiais/gemini/agentgemini.js'
import agentgpt from '../inteligencia artificiais/openai/agentgpt.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GLOBAL_MEMORIA = path.join(__dirname, '../historico_global.json');
const API1 = 'http://localhost:3002';

// Funções Auxiliares para o Histórico Global
const lerGlobal = () => {
    try {
        if (fs.existsSync(GLOBAL_MEMORIA)) {
            return JSON.parse(fs.readFileSync(GLOBAL_MEMORIA, 'utf-8'));
        }
    } catch (e) { console.error("Erro ao ler histórico global:", e); }
    return [];
};

const salvarGlobal = (hist) => {
    try {
        // Mantém as últimas 40 mensagens para o contexto não ficar pesado
        const limitado = hist.slice(-40);
        fs.writeFileSync(GLOBAL_MEMORIA, JSON.stringify(limitado, null, 2));
    } catch (e) { console.error("Erro ao salvar histórico global:", e); }
};

export const perguntarIA = async (req, res) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Mande uma pergunta" });

        const buscarperfis = await fetch(`${API1}/api/ia/profiles`);
        const dadosperfis = await buscarperfis.json();
        const perfilAtivoAtual = dadosperfis.find(p => p.is_active);

        if (!perfilAtivoAtual) return res.status(400).json({ erro: "Nenhuma IA ativa" });

        const api = perfilAtivoAtual.api_key;
        const model = perfilAtivoAtual.model;
        let historico = lerGlobal();

        // Adiciona a pergunta ao histórico antes de enviar para a IA
        // Note: Não salvamos ainda, esperamos a resposta da IA para salvar o par pergunta/resposta
        const contextParaIA = [...historico, { role: "user", content: pergunta }];

        let respostaFinal;

        if (perfilAtivoAtual.provider === 'gemini') {
            respostaFinal = await agentgemini(contextParaIA, api, model);
        } else if (perfilAtivoAtual.provider === 'openai') {
            respostaFinal = await agentgpt(contextParaIA, api, model);
        } else {
            respostaFinal = await openrouterIA(contextParaIA, api, model);
        }

        // Se a IA responder com sucesso, salvamos no histórico global
        if (respostaFinal && !respostaFinal.startsWith("⚠️")) {
            historico.push({ role: "user", content: pergunta });
            historico.push({ role: "assistant", content: respostaFinal });
            salvarGlobal(historico);
        }

        res.json({ resposta: respostaFinal });

    } catch (err) {
        console.error("Erro no Controller:", err);
        res.status(500).json({ erro: "Erro ao processar a requisição." });
    }
}

export const getHistorico = async (req, res) => {
    try {
        const historico = lerGlobal();
        // Filtra para garantir que apenas mensagens de texto cheguem ao front
        const formatado = historico.filter(m => m.role === 'user' || m.role === 'assistant');
        res.json(formatado);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao ler histórico" });
    }
}

export const limparHistorico = async (req, res) => {
    try {
        salvarGlobal([]);
        res.json({ mensagem: "Histórico global apagado com sucesso" });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao limpar histórico" });
    }
}
