import express from 'express';
import { perguntarIA, getHistorico, limparHistorico } from '../controlador/controller.js';

const router = express.Router();


// A rota recebe o POST e repassa imediatamente para o Controller
router.post('/assistente', perguntarIA);
router.get('/historico', getHistorico);
router.delete('/historico', limparHistorico);

export default router