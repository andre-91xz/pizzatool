import express from 'express';
import * as Controller from '../controlador/Controller.js';
const router = express.Router();

// ─── CATEGORIAS E CARDÁPIO ──────────────────────────────
router.get('/api/catalogolist', Controller.categoriaList);
router.get('/api/cardapio', Controller.cardapio);
router.post('/api/cardapio', Controller.cardapioPOST);
router.put('/api/cardapio/:id', Controller.cardapioPUT);
router.delete('/api/cardapio/:id', Controller.cardapioDELETE);

// ─── MODELOS DE CARDÁPIO ───────────────────────────────
router.get('/api/cardapiomodelos', Controller.cardapiomodelosGET);
router.post('/api/cardapiomodelos', Controller.cardapiomodelosPOST);
router.delete('/api/cardapiomodelos/:id', Controller.cardapiomodelosDELETE);

// ─── FICHAS TÉCNICAS CATEGORIA ───────────────────────
router.get('/api/categoriaficha', Controller.categoriaFichaGET);
router.put('/api/categoriaficha', Controller.categoriaFichaPUT);
// ok esssa parte



// ─── MATERIAL ───────────────────────────────────────────
router.get('/api/material', Controller.materialGET);
router.get('/api/material/:id', Controller.materialGETID);
router.post('/api/material', Controller.materialPOST);
router.put('/api/material/:id', Controller.materialPUT);
router.delete('/api/material/:id', Controller.materialDELETE);

// ─── MATERIAL MODELO ────────────────────────────────────
router.get('/api/materialmodelo', Controller.materialmodeloGET);
router.post('/api/materialmodelo', Controller.materialmodeloPOST);
router.put('/api/materialmodelo/:id', Controller.materialmodeloPUT);
router.delete('/api/materialmodelo/:id', Controller.materialmodeloDELETE);

// ─── BORDAS ─────────────────────────────────────────────
router.get('/api/bordas', Controller.bordasGET);
router.post('/api/bordas', Controller.bordasPOST);
router.put('/api/bordas/:id', Controller.bordasPUT);
router.delete('/api/bordas/:id', Controller.bordasDELETE);

// ─── BEBIDAS ────────────────────────────────────────────
router.get('/api/bebidas', Controller.bebidasGET);
router.post('/api/bebidas', Controller.bebidasPOST);
router.put('/api/bebidas/:id', Controller.bebidasPUT);
router.delete('/api/bebidas/:id', Controller.bebidasDELETE);

// ─── PEDIDOS ────────────────────────────────────────────
router.get('/api/pedidos', Controller.pedidosGET);
router.post('/api/pedidos', Controller.pedidosPOST);
router.delete('/api/pedidos', Controller.pedidosDELETE);
router.delete('/api/pedidos/:id', Controller.pedidoDELETE_ID);
router.put('/api/pedidos/:id', Controller.pedidoPUT);
router.put('/api/pedidos/:id/status', Controller.pedidoStatusPUT);

// ─── MOTOBOY ────────────────────────────────────────────
router.get('/api/motoboy', Controller.motoboyGET);
router.post('/api/motoboy', Controller.motoboyPOST);
router.put('/api/motoboy/:id', Controller.motoboyPUT);

// ─── FINANCEIRO E ESTOQUE ───────────────────────────────
router.get('/api/estoque/valorado', Controller.estoqueValoradoGET);
router.get('/api/financeiro', Controller.financeiroGET);
router.get('/api/financeiro/relatorios', Controller.financeiroRelatoriosGET);

// ─── AUXILIARES ─────────────────────────────────────────
router.get('/api/bairros', Controller.bairrosGET);

// ─── PERFIL E CONFIGURAÇÕES ─────────────────────────────
router.get('/api/perfil', Controller.perfilGET);
router.put('/api/perfil', Controller.perfilPUT);
router.get('/api/configuracoes', Controller.configuracoesGET);
router.put('/api/configuracoes', Controller.configuracoesPUT);

// ─── IA E ASSISTENTE ────────────────────────────────────
router.get('/api/ia/profiles', Controller.getIAProfiles);
router.put('/api/ia/profiles/:id', Controller.updateIAProfile);
router.get('/api/historico', Controller.getHistorico);
router.delete('/api/historico', Controller.limparHistorico);

// ─── DADOS DO SISTEMA ───────────────────────────────────
router.delete('/api/dados', Controller.deletarDados);

export default router;