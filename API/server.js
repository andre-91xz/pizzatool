import express from 'express';
import cors from 'cors';
import router from './rotas/router.js';

const app = express();

app.use(express.json())
app.use(cors())

app.use(router);

// --- Rota de Teste de Status ---
app.get('/status', (req, res) => {
    res.json({ status: "Online", timestamp: new Date() });
});

app.listen(3002, () => {
    console.log(`🚀 Servidor rodando em http://localhost:3002`);
});