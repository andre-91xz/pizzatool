
-- ======================================================
-- TABELAS
-- ======================================================

CREATE TABLE public.bairros (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    taxa numeric(10, 2) DEFAULT 0.00 NULL,
    CONSTRAINT bairros_pkey PRIMARY KEY (id)
);

ALTER TABLE public.bairros OWNER TO postgres;
GRANT ALL ON TABLE public.bairros TO postgres;

CREATE TABLE public.bebidas (
    id serial4 NOT NULL,
    bebida varchar(100) NOT NULL,
    quantidade int4 DEFAULT 0 NULL,
    preco numeric(10, 2) DEFAULT 0.00 NULL,
    custo_unitario numeric(10, 2) DEFAULT 0.00 NULL,
    status bool DEFAULT true NULL,
    CONSTRAINT bebidas_pkey PRIMARY KEY (id)
);

ALTER TABLE public.bebidas OWNER TO postgres;
GRANT ALL ON TABLE public.bebidas TO postgres;

CREATE TABLE public.borda (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    valor_adicional numeric(10, 2) DEFAULT 0.00 NULL,
    ativa bool DEFAULT true NULL,
    created_at timestamp DEFAULT now() NULL,
    CONSTRAINT borda_pkey PRIMARY KEY (id)
);

ALTER TABLE public.borda OWNER TO postgres;
GRANT ALL ON TABLE public.borda TO postgres;

CREATE TABLE public.cardapio (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    descricao text NULL,
    preco numeric(10, 2) DEFAULT 0.00 NULL,
    custo_estimado numeric(10, 2) DEFAULT 0.00 NULL,
    categoria varchar(50) DEFAULT 'Salgada'::character varying NULL,
    status bool DEFAULT true NULL,
    receita_ui jsonb NULL,
    tamanho varchar(50) NULL,
    CONSTRAINT cardapio_pkey PRIMARY KEY (id)
);

ALTER TABLE public.cardapio OWNER TO postgres;
GRANT ALL ON TABLE public.cardapio TO postgres;

CREATE TABLE public.cardapio_modelo (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    receita_ui jsonb NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT cardapio_modelo_pkey PRIMARY KEY (id)
);

ALTER TABLE public.cardapio_modelo OWNER TO postgres;
GRANT ALL ON TABLE public.cardapio_modelo TO postgres;

CREATE TABLE public.categoria_ficha_tecnica (
    id serial4 NOT NULL,
    categoria varchar(50) NOT NULL,
    nome_ingrediente varchar(100) NOT NULL,
    quantidade_necessaria numeric(10, 2) NOT NULL,
    unidade varchar(10) NOT NULL,
    CONSTRAINT categoria_ficha_tecnica_categoria_nome_ingrediente_key UNIQUE (categoria, nome_ingrediente),
    CONSTRAINT categoria_ficha_tecnica_pkey PRIMARY KEY (id)
);

ALTER TABLE public.categoria_ficha_tecnica OWNER TO postgres;
GRANT ALL ON TABLE public.categoria_ficha_tecnica TO postgres;

CREATE TABLE public.configuracoes (
    id serial4 NOT NULL,
    ia_provider varchar(20) DEFAULT 'openai'::character varying NULL,
    ia_model varchar(50) DEFAULT 'gpt-4o-mini'::character varying NULL,
    ia_api_key text DEFAULT ''::text NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT configuracoes_pkey PRIMARY KEY (id)
);

ALTER TABLE public.configuracoes OWNER TO postgres;
GRANT ALL ON TABLE public.configuracoes TO postgres;

CREATE TABLE public.ia_profiles (
    id serial4 NOT NULL,
    provider varchar(50) NOT NULL,
    name varchar(100) NOT NULL,
    model varchar(100) NULL,
    api_key text NULL,
    is_active bool DEFAULT false NULL,
    CONSTRAINT ia_profiles_pkey PRIMARY KEY (id)
);

ALTER TABLE public.ia_profiles OWNER TO postgres;
GRANT ALL ON TABLE public.ia_profiles TO postgres;

CREATE TABLE public.material (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    preco numeric(10, 2) DEFAULT 0.00 NULL,
    quantidade numeric(10, 3) DEFAULT 0.000 NULL,
    unidade varchar(20) DEFAULT 'g'::character varying NULL,
    categoria varchar(50) DEFAULT 'outros'::character varying NULL,
    status bool DEFAULT true NULL,
    CONSTRAINT material_pkey PRIMARY KEY (id)
);

ALTER TABLE public.material OWNER TO postgres;
GRANT ALL ON TABLE public.material TO postgres;

CREATE TABLE public.materialmodelo (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    preco numeric(10, 2) DEFAULT 0.00 NULL,
    quantidade numeric(10, 3) DEFAULT 0.000 NULL,
    unidade varchar(20) DEFAULT 'g'::character varying NULL,
    categoria varchar(50) DEFAULT 'outros'::character varying NULL,
    CONSTRAINT materialmodelo_pkey PRIMARY KEY (id)
);

ALTER TABLE public.materialmodelo OWNER TO postgres;
GRANT ALL ON TABLE public.materialmodelo TO postgres;

CREATE TABLE public.motoboy (
    id serial4 NOT NULL,
    nome varchar(100) NOT NULL,
    celular varchar(20) NULL,
    veiculo varchar(50) NULL,
    status varchar(20) DEFAULT 'ativo'::character varying NULL,
    statuspedido varchar(50) NULL,
    pedido text NULL,
    bairro varchar(100) NULL,
    comissao numeric(10, 2) DEFAULT 0.00 NULL,
    data_entrada date DEFAULT CURRENT_DATE NULL,
    data_saida date NULL,
    relatorio_ia text NULL,
    CONSTRAINT motoboy_pkey PRIMARY KEY (id)
);

ALTER TABLE public.motoboy OWNER TO postgres;
GRANT ALL ON TABLE public.motoboy TO postgres;

CREATE TABLE public.perfil (
    id serial4 NOT NULL,
    nome_pizzaria varchar(100) DEFAULT 'Minha Pizzaria'::character varying NULL,
    logo_path varchar(255) NULL,
    instagram varchar(100) NULL,
    whatsapp varchar(20) NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT perfil_pkey PRIMARY KEY (id)
);

ALTER TABLE public.perfil OWNER TO postgres;
GRANT ALL ON TABLE public.perfil TO postgres;

CREATE TABLE public.borda_ingrediente (
    id serial4 NOT NULL,
    borda_id int4 NOT NULL,
    material_id int4 NOT NULL,
    quantidade numeric(10, 3) DEFAULT 0.000 NOT NULL,
    unidade varchar(20) DEFAULT 'g'::character varying NOT NULL,
    created_at timestamp DEFAULT now() NULL,
    CONSTRAINT borda_ingrediente_pkey PRIMARY KEY (id),
    CONSTRAINT borda_ingrediente_borda_id_fkey FOREIGN KEY (borda_id) REFERENCES public.borda(id) ON DELETE CASCADE,
    CONSTRAINT borda_ingrediente_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material(id) ON DELETE CASCADE
);

ALTER TABLE public.borda_ingrediente OWNER TO postgres;
GRANT ALL ON TABLE public.borda_ingrediente TO postgres;

CREATE TABLE public.catalogo_ingredientes (
    id serial4 NOT NULL,
    catalogo_id int4 NOT NULL,
    material_id int4 NOT NULL,
    quantidade numeric(10, 3) DEFAULT 0.000 NULL,
    CONSTRAINT catalogo_ingredientes_pkey PRIMARY KEY (id),
    CONSTRAINT catalogo_ingredientes_catalogo_id_fkey FOREIGN KEY (catalogo_id) REFERENCES public.cardapio(id) ON DELETE CASCADE,
    CONSTRAINT catalogo_ingredientes_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material(id) ON DELETE CASCADE
);

ALTER TABLE public.catalogo_ingredientes OWNER TO postgres;
GRANT ALL ON TABLE public.catalogo_ingredientes TO postgres;

CREATE TABLE public.pedido (
    id serial4 NOT NULL,
    cliente varchar(100) NOT NULL,
    telefone varchar(20) NULL,
    endereco text NULL,
    bairro varchar(100) NULL,
    itens jsonb NULL,
    total numeric(10, 2) DEFAULT 0.00 NULL,
    custo_total numeric(10, 2) DEFAULT 0.00 NULL,
    taxa_entrega numeric(10, 2) DEFAULT 0.00 NULL,
    metodo_pagamento varchar(50) NULL,
    motoboy_id int4 NULL,
    status varchar(50) DEFAULT 'pendente'::character varying NULL,
    created_at varchar(100) NULL,
    CONSTRAINT pedido_pkey PRIMARY KEY (id),
    CONSTRAINT pedido_motoboy_id_fkey FOREIGN KEY (motoboy_id) REFERENCES public.motoboy(id) ON DELETE SET NULL
);

CREATE INDEX idx_pedido_created ON public.pedido USING btree (created_at);
CREATE INDEX idx_pedido_status ON public.pedido USING btree (status);

ALTER TABLE public.pedido OWNER TO postgres;
GRANT ALL ON TABLE public.pedido TO postgres;

CREATE TABLE public.estoque_movimentacao (
    id serial4 NOT NULL,
    tipo varchar(10) NOT NULL,
    material_id int4 NULL,
    bebida_id int4 NULL,
    quantidade numeric(10, 3) NOT NULL,
    custo_unitario numeric(10, 2) DEFAULT 0.00 NULL,
    motivo varchar(30) DEFAULT 'venda'::character varying NULL,
    pedido_id int4 NULL,
    observacao text NULL,
    created_at timestamp DEFAULT now() NULL,
    CONSTRAINT estoque_movimentacao_pkey PRIMARY KEY (id),
    CONSTRAINT estoque_movimentacao_bebida_id_fkey FOREIGN KEY (bebida_id) REFERENCES public.bebidas(id) ON DELETE SET NULL,
    CONSTRAINT estoque_movimentacao_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.material(id) ON DELETE SET NULL,
    CONSTRAINT estoque_movimentacao_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedido(id) ON DELETE SET NULL
);

CREATE INDEX idx_em_created ON public.estoque_movimentacao USING btree (created_at);
CREATE INDEX idx_em_material ON public.estoque_movimentacao USING btree (material_id);
CREATE INDEX idx_em_pedido ON public.estoque_movimentacao USING btree (pedido_id);
CREATE INDEX idx_em_tipo ON public.estoque_movimentacao USING btree (tipo);

ALTER TABLE public.estoque_movimentacao OWNER TO postgres;
GRANT ALL ON TABLE public.estoque_movimentacao TO postgres;

CREATE TABLE public.financeiro (
    id serial4 NOT NULL,
    tipo varchar(20) NOT NULL,
    categoria varchar(50) NULL,
    descricao text NULL,
    valor numeric(10, 2) NOT NULL,
    pedido_id int4 NULL,
    data_movimentacao timestamp DEFAULT now() NULL,
    CONSTRAINT financeiro_pkey PRIMARY KEY (id),
    CONSTRAINT financeiro_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedido(id) ON DELETE SET NULL
);

CREATE INDEX idx_fin_categoria ON public.financeiro USING btree (categoria);
CREATE INDEX idx_fin_data ON public.financeiro USING btree (data_movimentacao);
CREATE INDEX idx_fin_pedido ON public.financeiro USING btree (pedido_id);
CREATE INDEX idx_fin_tipo ON public.financeiro USING btree (tipo);

INSERT INTO public.ia_profiles (provider,"name",model,api_key,is_active) VALUES
	 ('gemini','Google Gemini','gemini-2.5-flash','sk-chave',false),
	 ('openai','OpenAI GPT-4','gpt-4-turbo','sk-cha',true),
	 ('openrouter','OpenRouter AI','tencent/hy3-preview:free','sk',false);


ALTER TABLE public.financeiro OWNER TO postgres;
GRANT ALL ON TABLE public.financeiro TO postgres;

GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;
