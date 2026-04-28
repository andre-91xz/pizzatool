# 🍕 Pizza Tool - Sistema de Gestão de Pizzaria com IA



![image](https://github.com/andre-91xz/pizzatool/blob/b0896b66500b7e3f16f9a2cee092ec39fa2f6e61/images/img1.png)
![image](https://github.com/andre-91xz/pizzatool/blob/b0896b66500b7e3f16f9a2cee092ec39fa2f6e61/images/img2.png)
![image](https://github.com/andre-91xz/pizzatool/blob/b0896b66500b7e3f16f9a2cee092ec39fa2f6e61/images/img3.png)
![image](https://github.com/andre-91xz/pizzatool/blob/b0896b66500b7e3f16f9a2cee092ec39fa2f6e61/images/img4.png)
![image](https://github.com/andre-91xz/pizzatool/blob/b0896b66500b7e3f16f9a2cee092ec39fa2f6e61/images/img6.png)





## 📌 Sobre o Projeto

Criei um projeto usando a IA como ferramenta para aprimorar minhas habilidades e servir de estudo e apoio para entender como funciona o front-end e o back-end, a ideia do projeto é para ter o controle do custo de cada pizza calculando cada material, lucro, custo de embalagem e custo fixo, conforme vai vendendo as pizzas vai diminuindo a quantidade de cada material e assim tem o controle melhor do estoque.

---

## 🚀 Tecnologias Utilizadas
- **React**
- **Node.js**
- **PostgreSQL** (Banco de dados relacional)
- **MCP** (Integração com modelos de IA)

---

## 📂 Estrutura do Repositório

O projeto é dividido em quatro módulos principais:

1.  **`/Pizza`**: O coração do sistema. Aplicação Web para gerenciar pedidos, estoque, financeiro e muito mais.
2.  **`/API`**: Backend principal que lida com a persistência de dados no PostgreSQL.
3.  **`/Assistente_API`**: API dedicada à integração com Inteligência Artificial via OpenRouter.
4.  **`/MCP`**: Servidor opcional para extensões de contexto de IA.

---

## 🛠️ Como Iniciar

### 1. Banco de Dados (API Principal)
- Certifique-se de ter o **PostgreSQL** instalado.
- Execute o script contido em `API/banco_app.sql` para criar as tabelas necessárias.
- Configure o arquivo `.env` na pasta `API/` (use o `.env.example` como base).

### 2. Iniciando as APIs
Abra dois terminais (um para cada API) e execute:

**API Principal:**
```bash
cd API
npm install
npm start
```

**Assistente API:**
```bash
cd Assistente_API
npm install
npm start
```

### 3. Iniciando o Front-End
Em um novo terminal:
```bash
cd Pizza
npm install
npm run dev
```
---

## ✨ Funcionalidades Principais

- 📝 **Gestão de Pedidos**: Abertura e acompanhamento de pedidos em tempo real.
- 📦 **Controle de Estoque**: Gestão de materiais, insumos e avisos de reposição.
- 💰 **Módulo Financeiro**: Relatórios de ganhos e gastos com visualização em gráficos.
- 🛵 **Logística de Entrega**: Gestão de motoboys e roteirização de entregas.
- 🤖 **Assistente IA**: Ajuda integrada para suporte operacional e análise de dados.
- 🍕 **Cardápio Dinâmico**: Configuração de sabores, bebidas e bordas.

---

