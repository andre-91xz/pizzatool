import express from 'express'
import { Pool } from 'pg'
import 'dotenv/config'
import cors from 'cors'
import router from './rotas/router.js'

// DICA: O 'cors' permite que o frontend na porta 5173 acesse a API na porta 3002

const app = express()

// Habilita o CORS para que o frontend consiga conversar com este servidor
app.use(cors())

// ESSENCIAL: Permite que o Node entenda requisições com corpo em JSON que o React envia
app.use(express.json())

app.use('/api', router);




app.listen(4000, () => {
    console.log(`👉 Endpoint disponível em: http://localhost:4000/api`);
});