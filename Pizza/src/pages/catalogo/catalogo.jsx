import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPizzaSlice, FaPlus, FaFireAlt, FaChartPie, FaMoneyBillWave, FaTrash, FaEdit, FaChevronLeft, FaChevronRight, FaTag, FaBox } from 'react-icons/fa'
import './catalogo.css'

// Funções de utilidade movidas para dentro ou parametrizadas

function normalizarTexto(txt) {
    return (txt || '').toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Converte para unidade-base (g / ml) para cálculo
function converterParaBase(quantidade, unidade) {
    const q = parseFloat(quantidade) || 0;
    const u = (unidade || '').toLowerCase();

    if (u === 'kg') return { valor: q * 1000, unidadeBase: 'g' };
    if (u === 'mg') return { valor: q / 1000, unidadeBase: 'g' };
    if (u === 'l') return { valor: q * 1000, unidadeBase: 'ml' };
    if (u === 'ml') return { valor: q, unidadeBase: 'ml' };
    if (u === 'g') return { valor: q, unidadeBase: 'g' };

    return { valor: q, unidadeBase: u || 'g' };
}

// Calcula o preço proporcional de uma quantidade de um material do banco
function calcularCustoIngrediente(nomeMaterial, qtdUsada, unidadeUsada, materiaisDoBanco) {
    const nomeBusca = normalizarTexto(nomeMaterial);
    const mat = materiaisDoBanco.find(m => normalizarTexto(m.nome) === nomeBusca);

    if (!mat || !mat.preco || !mat.quantidade) return 0;

    const precoEmbalagem = parseFloat(mat.preco) || 0;
    const { valor: qtdEmb } = converterParaBase(mat.quantidade, mat.unidade);
    const { valor: qtdUso } = converterParaBase(qtdUsada, unidadeUsada);

    if (qtdEmb === 0) return 0;
    return (precoEmbalagem / qtdEmb) * qtdUso;
}

// Calcula o custo total da massa baseado na receita do banco
function calcularCustoMassa(pedacos, materiaisDoBanco, receitaBase) {
    const fator = (pedacos || 8) / 8;
    let total = 0;
    for (const item of receitaBase) {
        total += calcularCustoIngrediente(item.material, item.quantidadeNecessaria * fator, item.unidade, materiaisDoBanco);
    }
    return total;
}

function Catalogo() {
    const [pizzas, setPizzas] = useState([]);
    const [abaAtiva, setAbaAtiva] = useState('detalhes');

    const [formPizza, setFormPizza] = useState({
        nome: '',
        lucro: '',
        operacional: '',
        embalagem: '',
        tempo: '',
        categoria: 'Salgada',
        descricao: ''
    });

    const [ingredientesPizza, setIngredientesPizza] = useState([]);
    const [modalIngredienteAberto, setModalIngredienteAberto] = useState(false);
    const [materiaisDoBanco, setMateriaisDoBanco] = useState([]);
    const [receitaMassaBase, setReceitaMassaBase] = useState([]);
    const [todasAsFichas, setTodasAsFichas] = useState([]);
    const navigate = useNavigate();

    const [confirmDesligar, setConfirmDesligar] = useState(null);
    const [confirmDesligar1, setConfirmDesligar1] = useState(null);

    const [pizzaIdEmEdicao, setPizzaIdEmEdicao] = useState(null);

    const [predefinicoes, setPredefinicoes] = useState([]);

    const carrosselRef = useRef(null);

    const scrollCarrossel = (direcao) => {
        if (carrosselRef.current) {
            carrosselRef.current.scrollBy({ left: direcao * 200, behavior: 'smooth' });
        }
    };

    const [ingredienteEmEdicao, setIngredienteEmEdicao] = useState({
        id: null,
        categoria: 'massas',
        nome: '',
        quantidade: '',
        unidade: 'g',
        pedacos: 8,
        is_borda: false,
        valor_adicional: ''
    });

    useEffect(() => {
        const carregarDados = async () => {
            try {
                const resMat = await fetch('http://localhost:3002/api/material');
                if (resMat.ok) {
                    const dados = await resMat.json();
                    setMateriaisDoBanco(dados);
                }

                const resCardapio = await fetch('http://localhost:3002/api/cardapio');
                if (resCardapio.ok) {
                    const cardapioData = await resCardapio.json();
                    const pizzasFormatadas = cardapioData.map(p => {
                        const ui = p.receita_ui || {};
                        return {
                            id: p.id,
                            catalogo_id: p.catalogo_id,
                            nome: p.nome,
                            categoria: p.categoria,
                            preco: p.preco,
                            custo_estimado: p.custo_estimado,
                            ingredientesLista: ui.ingredientesLista || [],
                            ingredientesTexto: (ui.ingredientesLista || []).map(i => i.nome).join(', '),
                            lucro: ui.lucro || '50',
                            operacional: ui.operacional || '5.00',
                            embalagem: ui.embalagem || '2.00',
                            tempo: ui.tempo || '15',
                            descricao: p.descricao || ui.descricao || ''
                        }
                    });
                    setPizzas(pizzasFormatadas);
                }

                // Carregar Modelos
                const resMod = await fetch('http://localhost:3002/api/cardapiomodelos');
                if (resMod.ok) {
                    const modelos = await resMod.json();
                    setPredefinicoes(modelos.map(m => ({
                        id: m.id,
                        nome: m.nome,
                        ...m.receita_ui
                    })));
                }
                // Carregar Todas as Fichas Técnicas para Alerta Global
                const resFicha = await fetch('http://localhost:3002/api/categoriaficha');
                if (resFicha.ok) {
                    const fichas = await resFicha.json();
                    setTodasAsFichas(fichas);

                    const massaFicha = fichas
                        .filter(f => f.categoria === 'massas')
                        .map(f => ({
                            material: f.nome_ingrediente,
                            quantidadeNecessaria: parseFloat(f.quantidade_necessaria),
                            unidade: f.unidade
                        }));
                    setReceitaMassaBase(massaFicha);
                }
            } catch (erro) {
                console.error("Erro ao carregar dados do banco:", erro);
            }
        };
        carregarDados();
    }, []);

    // ── Alertas Globais de Estoque ──────────────────────────────────────────
    const alertasGlobais = useMemo(() => {
        if (todasAsFichas.length === 0 || materiaisDoBanco.length === 0) return [];

        const faltantes = [];
        // Filtramos apenas as fichas da categoria 'massas'
        const fichasMassa = todasAsFichas.filter(f => f.categoria === 'massas');

        for (const ficha of fichasMassa) {
            const mat = materiaisDoBanco.find(m => normalizarTexto(m.nome) === normalizarTexto(ficha.nome_ingrediente));
            const qtdNec = parseFloat(ficha.quantidade_necessaria);

            if (!mat) {
                faltantes.push(`${ficha.nome_ingrediente} (Não cadastrado)`);
            } else if (parseFloat(mat.quantidade) < qtdNec) {
                faltantes.push(`${ficha.nome_ingrediente} (Estoque insuficiente)`);
            }
        }
        return faltantes;
    }, [todasAsFichas, materiaisDoBanco]);

    // ── Prévia de custo em tempo real ────────────────────────────────────────
    const previa = useMemo(() => {
        let custoIngredientes = 0;
        let itensSemEstoque = [];

        for (const ing of ingredientesPizza) {
            if (ing.categoria === 'massas') {
                custoIngredientes += calcularCustoMassa(ing.pedacos, materiaisDoBanco, receitaMassaBase);

                // Verificar estoque da massa
                const fator = (ing.pedacos || 8) / 8;
                for (const base of receitaMassaBase) {
                    const mat = materiaisDoBanco.find(m => normalizarTexto(m.nome) === normalizarTexto(base.material));
                    const qtdNecessaria = base.quantidadeNecessaria * fator;

                    if (!mat || (parseFloat(mat.quantidade) < qtdNecessaria)) {
                        if (!itensSemEstoque.includes('Ingredientes da Massa')) {
                            itensSemEstoque.push('Ingredientes da Massa');
                        }
                    }
                }
            } else {
                custoIngredientes += calcularCustoIngrediente(ing.nome, ing.quantidade, ing.unidade, materiaisDoBanco);

                // Verificar estoque ingrediente
                const mat = materiaisDoBanco.find(m => normalizarTexto(m.nome) === normalizarTexto(ing.nome));
                if (!mat || (parseFloat(mat.quantidade) < (parseFloat(ing.quantidade) || 0))) {
                    itensSemEstoque.push(ing.nome);
                }
            }
        }

        const operacional = parseFloat(formPizza.operacional) || 0;
        const embalagem = parseFloat(formPizza.embalagem) || 0;
        const lucro = parseFloat(formPizza.lucro) || 0;

        const custoTotal = custoIngredientes + operacional + embalagem;
        const precoVenda = custoTotal + (custoTotal * (lucro / 100));

        return { custoIngredientes, custoTotal, precoVenda, itensSemEstoque };
    }, [ingredientesPizza, formPizza, materiaisDoBanco]);

    const handleFormChange = (e) => {
        setFormPizza({
            ...formPizza,
            [e.target.name]: e.target.value
        });
    };

    const abrirModal = () => {
        setIngredienteEmEdicao({
            id: null,
            categoria: 'massas',
            nome: 'Massa (8 pedaços)',
            quantidade: '',
            unidade: '',
            pedacos: 8,
            is_borda: false,
            valor_adicional: ''
        });
        setModalIngredienteAberto(true);
    };

    // Calcula custos de uma pizza já salva
    const calcularCustosPizza = (pizza) => {
        let custoIngredientes = 0;
        for (const ing of (pizza.ingredientesLista || [])) {
            if (ing.categoria === 'massas') {
                custoIngredientes += calcularCustoMassa(ing.pedacos, materiaisDoBanco, receitaMassaBase);
            } else {
                custoIngredientes += calcularCustoIngrediente(ing.nome, ing.quantidade, ing.unidade, materiaisDoBanco);
            }
        }
        const operacional = parseFloat(pizza.operacional) || 0;
        const embalagem = parseFloat(pizza.embalagem) || 0;
        const lucro = parseFloat(pizza.lucro) || 0;
        const custoTotal = custoIngredientes + operacional + embalagem;
        const precoVenda = custoTotal + (custoTotal * (lucro / 100));
        return { custoTotal, precoVenda, lucro };
    };

    const cadastrarPizza = async () => {
        if (!formPizza.nome) {
            alert('Preencha pelo menos o nome da pizza.');
            return;
        }

        const temMassa = ingredientesPizza.some(ing => ing.categoria === 'massas');
        if (!temMassa) {
            alert('Não é possível cadastrar a pizza: É obrigatório adicionar uma Massa em ingredientes.');
            return;
        }

        if (previa.itensSemEstoque.length > 0) {
            alert(`Não é possível cadastrar: Estoque insuficiente para ${previa.itensSemEstoque.join(', ')}`);
            return;
        }

        const custoCalculado = previa.custoTotal;
        const precoCalculado = previa.precoVenda;

        // Achar o catalogo_id se for edição
        const pizzaEditando = pizzas.find(p => p.id === pizzaIdEmEdicao);
        const catalogo_id = pizzaEditando ? pizzaEditando.catalogo_id : `CAT-${Date.now()}`;

        // Decompor os ingredientes para a tabela do banco
        let ingredientesTotais = [];
        for (const ing of ingredientesPizza) {
            if (ing.categoria === 'massas') {
                const fator = (ing.pedacos || 8) / 8;
                const RECEITA_MASSA = [
                    { material: 'Farinha de trigo', quantidadeNecessaria: 250 },
                    { material: 'Agua', quantidadeNecessaria: 150 },
                    { material: 'Fermento biologico', quantidadeNecessaria: 5 },
                    { material: 'Sal', quantidadeNecessaria: 6 }
                ];
                for (const base of RECEITA_MASSA) {
                    const mat = materiaisDoBanco.find(m => m.nome?.toLowerCase() === base.material.toLowerCase());
                    if (mat) {
                        ingredientesTotais.push({
                            material_id: mat.id,
                            quantidade: base.quantidadeNecessaria * fator
                        });
                    }
                }
            } else {
                const mat = materiaisDoBanco.find(m => m.nome?.toLowerCase() === ing.nome?.toLowerCase());
                if (mat) {
                    ingredientesTotais.push({
                        material_id: mat.id,
                        quantidade: parseFloat(ing.quantidade) || 0
                    });
                }
            }
        }

        const ingredienteMassa = ingredientesPizza.find(i => i.categoria === 'massas');
        const tamanho = ingredienteMassa ? `${ingredienteMassa.pedacos} Pedaços` : '8 Pedaços';

        const payload = {
            catalogo_id,
            nome: formPizza.nome,
            preco: precoCalculado,
            custo_estimado: custoCalculado,
            categoria: formPizza.categoria || 'Salgada',
            status: true,
            tamanho,
            descricao: formPizza.descricao || '',
            receita_ui: {
                lucro: formPizza.lucro,
                operacional: formPizza.operacional,
                embalagem: formPizza.embalagem,
                tempo: formPizza.tempo,
                descricao: formPizza.descricao,
                ingredientesLista: ingredientesPizza
            }
        };

        try {
            let url = 'http://localhost:3002/api/cardapio';
            let method = 'POST';
            if (pizzaIdEmEdicao) {
                url = `http://localhost:3002/api/cardapio/${pizzaIdEmEdicao}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const pSalva = result.cardapioCadastrado || result.cardapioAtualizado;
                const ui = pSalva.receita_ui || payload.receita_ui;

                const pizzaFormatada = {
                    id: pSalva.id,
                    catalogo_id: pSalva.catalogo_id,
                    nome: pSalva.nome,
                    categoria: pSalva.categoria,
                    preco: pSalva.preco,
                    custo_estimado: pSalva.custo_estimado,
                    ingredientesLista: ui.ingredientesLista,
                    ingredientesTexto: ui.ingredientesLista.map(i => i.nome).join(', '),
                    lucro: ui.lucro,
                    operacional: ui.operacional,
                    embalagem: ui.embalagem,
                    tempo: ui.tempo
                };

                if (pizzaIdEmEdicao) {
                    setPizzas(prev => prev.map(p => p.id === pizzaIdEmEdicao ? pizzaFormatada : p));
                } else {
                    setPizzas(prev => [pizzaFormatada, ...prev]);
                }
            } else {
                alert("Erro ao salvar no banco.");
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro de conexão.");
        }

        cancelarEdicao();
    };

    const cancelarEdicao = () => {
        setPizzaIdEmEdicao(null);
        setFormPizza({ nome: '', lucro: '', operacional: '', embalagem: '', tempo: '', categoria: 'Salgada' });
        setIngredientesPizza([]);
        setAbaAtiva('detalhes');
    };

    const editarPizza = (pizza) => {
        setPizzaIdEmEdicao(pizza.id);
        setFormPizza({
            nome: pizza.nome,
            lucro: pizza.lucro,
            operacional: pizza.operacional || '',
            embalagem: pizza.embalagem || '',
            tempo: pizza.tempo,
            categoria: pizza.categoria || 'Salgada',
            descricao: pizza.descricao || ''
        });
        setIngredientesPizza(pizza.ingredientesLista || []);
        setAbaAtiva('detalhes');
    };

    const excluirPizza = async (id) => {
        try {
            const response = await fetch(`http://localhost:3002/api/cardapio/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setPizzas(prev => prev.filter(p => p.id !== id));
                if (pizzaIdEmEdicao === id) {
                    cancelarEdicao();
                }
            } else {
                alert("Erro ao excluir do banco.");
            }
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }

        setConfirmDesligar(null)
    };

    const usarPredefinicao = (modelo) => {
        setFormPizza({
            nome: modelo.nome,
            lucro: modelo.lucro,
            operacional: modelo.operacional || '',
            embalagem: modelo.embalagem || '',
            tempo: modelo.tempo
        });
        setIngredientesPizza(modelo.ingredientesLista || []);
        setAbaAtiva('detalhes');
        setPizzaIdEmEdicao(null);
    };

    const editarPredefinicao = (modelo) => {
        alert("Modo de edição da predefinição " + modelo.nome + " ainda não totalmente separado da pizza, mas pode ser implementado de forma similar!");
    };

    const salvarComoModelo = async () => {
        if (!formPizza.nome) {
            alert('Dê um nome ao modelo.');
            return;
        }

        const receita_ui = {
            lucro: formPizza.lucro,
            operacional: formPizza.operacional,
            embalagem: formPizza.embalagem,
            tempo: formPizza.tempo,
            descricao: formPizza.descricao,
            ingredientesLista: ingredientesPizza
        };

        try {
            const res = await fetch('http://localhost:3002/api/cardapiomodelos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: formPizza.nome, receita_ui })
            });

            if (res.ok) {
                const result = await res.json();
                const novoModelo = {
                    id: result.modelo.id,
                    nome: result.modelo.nome,
                    ...result.modelo.receita_ui
                };
                setPredefinicoes(prev => [...prev, novoModelo]);
                alert('Modelo salvo com sucesso!');
            }
        } catch (erro) {
            console.error("Erro ao salvar modelo:", erro);
        }
    };

    const excluirPredefinicao = async (id) => {
        if (window.confirm('Excluir este modelo permanentemente?')) {
            try {
                const res = await fetch(`http://localhost:3002/api/cardapiomodelos/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setPredefinicoes(predefinicoes.filter(p => p.id !== id));
                }
            } catch (erro) {
                console.error("Erro ao excluir modelo:", erro);
            }
        }
    };

    const salvarIngredienteModal = () => {
        if ((ingredienteEmEdicao.categoria === 'recheio' || ingredienteEmEdicao.categoria === 'molho') && !ingredienteEmEdicao.quantidade) {
            alert('Preencha a quantidade do ingrediente!');
            return;
        }

        if (ingredienteEmEdicao.id) {
            setIngredientesPizza(prev => prev.map(ing => ing.id === ingredienteEmEdicao.id ? ingredienteEmEdicao : ing));
        } else {
            setIngredientesPizza(prev => [...prev, {
                id: Date.now(),
                ...ingredienteEmEdicao
            }]);
        }

        setModalIngredienteAberto(false);
    };

    const removerIngrediente = (id) => {
        setIngredientesPizza(prev => prev.filter(i => i.id !== id));
    };

    const editarIngrediente = (ing) => {
        setIngredienteEmEdicao({ ...ing });
        setModalIngredienteAberto(true);
    };

    const handleCategoriaChange = (e) => {
        const cat = e.target.value;
        if (cat === 'massas') {
            setIngredienteEmEdicao(prev => ({
                ...prev,
                categoria: cat,
                nome: `Massa (${prev.pedacos || 8} pedaços)`,
                quantidade: '',
                unidade: 'un',
                pedacos: prev.pedacos || 8,
                is_borda: false,
                valor_adicional: ''
            }));
        } else {
            const materiaisFiltrados = materiaisDoBanco.filter(m => m.categoria === cat);
            const primeiroMat = materiaisFiltrados.length > 0 ? materiaisFiltrados[0] : null;

            setIngredienteEmEdicao(prev => ({
                ...prev,
                categoria: cat,
                nome: primeiroMat ? primeiroMat.nome : '',
                quantidade: '',
                unidade: primeiroMat ? primeiroMat.unidade : 'g',
                preco_mat: primeiroMat ? primeiroMat.preco : 0,
                mat_id: primeiroMat ? primeiroMat.id : null,
                pedacos: null,
                is_borda: false,
                valor_adicional: ''
            }));
        }
    };

    const selecionarPedacos = (pedacos) => {
        setIngredienteEmEdicao({
            ...ingredienteEmEdicao,
            pedacos: pedacos,
            nome: `Massa (${pedacos} pedaços)`
        });
    };

    return (
        <div className='catalogo-principal'>
            {alertasGlobais.length > 0 && (
                <div className="banner-alerta-global" style={{
                    gridColumn: '1 / span 2',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    margin: '15px 15px 0 15px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                    animation: 'fadeInDown 0.5s ease-out',
                    border: '1px solid rgba(255,255,255,0.2)',
                    zIndex: 20
                }}>
                    <FaFireAlt size={24} />
                    <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '14px' }}>Atenção: Ingredientes das Fichas Técnicas faltando no estoque!</strong>
                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                            {alertasGlobais.join(' • ')}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/material')}
                        style={{
                            background: 'white',
                            color: '#ef4444',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Ir para Estoque
                    </button>
                </div>
            )}
            <div className='catalogo-lista'>
                <h1 className='titulo-cat'><FaPizzaSlice /> Nosso Catálogo</h1>

                {pizzas.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
                        Nenhuma pizza cadastrada no catálogo ainda.
                    </p>
                ) : (
                    pizzas.map(pizza => {
                        const { custoTotal, precoVenda, lucro } = calcularCustosPizza(pizza);

                        return (
                            <div key={pizza.id} className='pizza-card'>
                                <div className='pizza-icon-wrapper'>
                                    <FaPizzaSlice />
                                </div>
                                <div className='pizza-info'>
                                    <div className='pizza-nome'>{pizza.nome}</div>
                                    <div className='pizza-desc'>
                                        <strong>Ingredientes:</strong> {pizza.ingredientesTexto || 'Nenhum ingrediente adicionado'}
                                    </div>
                                    <div className='pizza-stats'>
                                        <span className='pizza-stat-badge'><FaMoneyBillWave color="#10b981" /> Custo: R$ {custoTotal.toFixed(2)}</span>
                                        <span className='pizza-stat-badge'><FaTag color="#f59e0b" /> Venda: R$ {precoVenda.toFixed(2)}</span>
                                        <span className='pizza-stat-badge'><FaChartPie color="#3b82f6" /> {lucro}% Lucro</span>
                                        <span className='pizza-stat-badge'><FaBox color="#a855f7" /> Emb: R$ {parseFloat(pizza.embalagem || 0).toFixed(2)}</span>
                                        <span className='pizza-stat-badge'><FaFireAlt color="#ef4444" /> {pizza.tempo || 0} min</span>
                                    </div>
                                </div>

                                <div className='pizza-acoes-card'>
                                    <button className='btn-acao-card btn-editar' onClick={() => editarPizza(pizza)} title="Editar"><FaEdit /></button>
                                    <button className='btn-acao-card btn-excluir' onClick={() => setConfirmDesligar(pizza.id)} title="Excluir"><FaTrash /></button>
                                </div>
                            </div>
                        )
                    })
                )}
                {confirmDesligar && (
                    <div className="ent-modal-overlay" onClick={() => setConfirmDesligar(null)}>
                        <div className="ent-modal" onClick={e => e.stopPropagation()}>
                            <h3>Deseja excluir essa Pizza?</h3>
                            <p>Ela será removida permanentemente do catálogo e do cardápio.</p>
                            <div className="ent-modal-btns">
                                <button className="btn-ent-cancelar" onClick={() => setConfirmDesligar(null)}>Cancelar</button>
                                <button className="btn-ent-confirmar" onClick={() => excluirPizza(confirmDesligar)}>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}
                {confirmDesligar1 && (
                    <div className="ent-modal-overlay" onClick={() => setConfirmDesligar1(null)}>
                        <div className="ent-modal" onClick={e => e.stopPropagation()}>
                            <h3>Deseja excluir essa Pizza salva como modelo?</h3>
                            <p>Ela será removida permanentemente.</p>
                            <div className="ent-modal-btns">
                                <button className="btn-ent-cancelar" onClick={() => setConfirmDesligar1(null)}>Cancelar</button>
                                <button className="btn-ent-confirmar" onClick={() => excluirPredefinicao(confirmDesligar1)}>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className='predefinicoes-footer-container'>
                    <hr className='pred-divisor' />
                    <div className='carrossel-wrapper'>
                        <button className='btn-scroll' onClick={() => scrollCarrossel(-1)}><FaChevronLeft /></button>
                        <div className='carrossel-predefinicoes' ref={carrosselRef}>
                            {predefinicoes.map(pred => (
                                <div key={pred.id} className='pred-pill'>
                                    <span className='pred-pill-nome'>{pred.nome}</span>
                                    <div className='pred-pill-acoes'>
                                        <button className='btn-pill-acao usar' onClick={() => usarPredefinicao(pred)}>Usar</button>
                                        <button className='btn-pill-acao editar' onClick={() => editarPredefinicao(pred)}><FaEdit /></button>
                                        <button className='btn-pill-acao excluir' onClick={() => setConfirmDesligar1(pred.id)}><FaTrash /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className='btn-scroll' onClick={() => scrollCarrossel(1)}><FaChevronRight /></button>
                    </div>
                </div>
            </div>

            <div className='catalogo-cadastro'>
                <h2 className='titulo-cat'>
                    {pizzaIdEmEdicao ? <><FaEdit /> Editar Pizza</> : <><FaPlus /> Cadastrar Nova Pizza</>}
                </h2>

                <div className='tabs-container' style={{ marginBottom: '20px' }}>
                    <button
                        className={`tab-btn ${abaAtiva === 'detalhes' ? 'ativo' : ''}`}
                        onClick={() => setAbaAtiva('detalhes')}
                    >
                        Detalhes
                    </button>
                    <button
                        className={`tab-btn ${abaAtiva === 'ingredientes' ? 'ativo' : ''}`}
                        onClick={() => setAbaAtiva('ingredientes')}
                    >
                        Ingredientes ({ingredientesPizza.length})
                    </button>
                </div>

                <div className='tab-content'>
                    {abaAtiva === 'detalhes' && (
                        <div className='form-cat'>
                            <label className='label-cat'>Nome da Pizza</label>
                            <input type='text' name='nome' value={formPizza.nome} onChange={handleFormChange} className='input-cat' placeholder='Ex: Calabresa, Marguerita...' />

                            <label className='label-cat'>Categoria</label>
                            <select name='categoria' value={formPizza.categoria} onChange={handleFormChange} className='input-cat'>
                                <option value="Salgada">Salgada</option>
                                <option value="Doce">Doce</option>
                                <option value="Especial">Especial</option>
                            </select>

                            <label className='label-cat' style={{ marginTop: '10px' }}>Taxa de Lucro (%)</label>
                            <input type='number' name='lucro' value={formPizza.lucro} onChange={handleFormChange} className='input-cat' placeholder='Ex: 50' />

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className='label-cat'>Custo Operacional (R$)</label>
                                    <input type='number' name='operacional' value={formPizza.operacional} onChange={handleFormChange} className='input-cat' placeholder='Ex: 5.00' />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className='label-cat'>Embalagem (R$)</label>
                                    <input type='number' name='embalagem' value={formPizza.embalagem} onChange={handleFormChange} className='input-cat' placeholder='Ex: 2.00' />
                                </div>
                            </div>

                            <label className='label-cat'>Tempo de Assar (Minutos)</label>
                            <input type='number' name='tempo' value={formPizza.tempo} onChange={handleFormChange} className='input-cat' placeholder='Ex: 15' />

                            <label className='label-cat' style={{ marginTop: '10px' }}>Descrição (Para o Cardápio)</label>
                            <textarea
                                name='descricao'
                                value={formPizza.descricao}
                                onChange={handleFormChange}
                                className='input-cat'
                                placeholder='Ex: Molho artesanal, mussarela premium...'
                                style={{ height: '80px', resize: 'none' }}
                            />
                        </div>
                    )}

                    {abaAtiva === 'ingredientes' && (
                        <div className='ingredientes-tab'>
                            <button className='btn-cat-add-outline' onClick={abrirModal}>
                                <FaPlus /> Adicionar Ingrediente
                            </button>

                            <div className='ingredientes-selecionados-lista'>
                                {ingredientesPizza.length === 0 ? (
                                    <p className='empty-ingredientes'>Nenhum ingrediente na receita ainda.</p>
                                ) : (
                                    ingredientesPizza.map((ing) => (
                                        <div key={ing.id} className='ingrediente-item-selecionado'>
                                            <div className='ing-info'>
                                                <span className='ing-nome'>{ing.nome}</span>
                                                <span className='ing-qtd'>
                                                    {ing.categoria !== 'massas' ? `${ing.quantidade} ${ing.unidade || ''}` : ''}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className='ing-btn-editar' onClick={() => editarIngrediente(ing)}>
                                                    <FaEdit />
                                                </button>
                                                <button className='ing-btn-remover' onClick={() => removerIngrediente(ing.id)}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>

                <div className="painel-custo-cat">
                    <div>
                        <span className="painel-custo-label">Custo Total</span>
                        <strong className="painel-custo-valor custo">R$ {previa.custoTotal.toFixed(2)}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span className="painel-custo-label">Preço de Venda Sugerido</span>
                        <strong className="painel-custo-valor venda">R$ {previa.precoVenda.toFixed(2)}</strong>
                    </div>
                </div>

                {previa.itensSemEstoque.length > 0 && (
                    <div className="alerta-estoque-cat" style={{
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '12px'
                    }}>
                        <strong>Atenção:</strong> Estoque insuficiente para os itens: {previa.itensSemEstoque.join(', ')}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {pizzaIdEmEdicao && (
                            <button type='button' className='btn-cat-secundario' onClick={cancelarEdicao} style={{ flex: 1 }}>
                                Cancelar
                            </button>
                        )}
                        <button type='button' className='btn-cat-add' onClick={cadastrarPizza} style={{ flex: 2, margin: 0 }}>
                            {pizzaIdEmEdicao ? 'Salvar Alterações' : <><FaPlus /> Adicionar ao Catálogo</>}
                        </button>
                    </div>
                    <button type='button' className='btn-cat-secundario' onClick={salvarComoModelo} style={{ width: '100%', margin: 0 }}>
                        <FaPlus /> Salvar como Modelo
                    </button>
                </div>
            </div>

            {modalIngredienteAberto && (
                <div className='modal-cat-overlay'>
                    <div className='modal-cat-card'>
                        <h3>Selecione o Ingrediente</h3>

                        <label className='label-cat'>Categoria</label>
                        <select className='input-cat' value={ingredienteEmEdicao.categoria} onChange={handleCategoriaChange}>
                            <option value="massas">Massas</option>
                            <option value="recheio">Recheios</option>
                            <option value="molho">Molhos</option>
                        </select>

                        {ingredienteEmEdicao.categoria === 'massas' ? (
                            <div style={{ marginTop: '5px' }}>
                                <label className='label-cat' style={{ marginBottom: '8px', display: 'block' }}>Quantidade de Pedaços</label>
                                <div className='slots-massas-cat'>
                                    {[4, 6, 8, 10, 12, 16].map((slot) => (
                                        <button
                                            key={slot}
                                            type='button'
                                            className={`slot-btn-cat ${ingredienteEmEdicao.pedacos === slot ? 'ativo' : ''}`}
                                            onClick={() => selecionarPedacos(slot)}
                                        >
                                            {slot} pedaços
                                        </button>
                                    ))}
                                </div>
                                <p style={{ fontSize: '12px', color: '#9aa0ae', marginTop: '10px' }}>
                                    Custo calculado automaticamente com base na receita base de massa.
                                </p>
                            </div>
                        ) : (
                            <div style={{ marginTop: '5px' }}>
                                <label className='label-cat' style={{ marginBottom: '8px', display: 'block' }}>Ingredientes</label>
                                <select
                                    className='input-cat'
                                    value={ingredienteEmEdicao.nome}
                                    onChange={(e) => setIngredienteEmEdicao({ ...ingredienteEmEdicao, nome: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    {(() => {
                                        const filtrados = materiaisDoBanco.filter(m => m.categoria === ingredienteEmEdicao.categoria);
                                        if (filtrados.length === 0) {
                                            return <option value="">Nenhum material em {ingredienteEmEdicao.categoria}</option>;
                                        }
                                        return filtrados.map((mat) => (
                                            <option key={mat.id || mat.nome} value={mat.nome}>{mat.nome}</option>
                                        ));
                                    })()}
                                </select>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className='label-cat' style={{ display: 'block', marginBottom: '8px' }}>Quantidade</label>
                                        <input
                                            type='number'
                                            className='input-cat'
                                            placeholder='Ex: 200'
                                            value={ingredienteEmEdicao.quantidade}
                                            onChange={(e) => setIngredienteEmEdicao({ ...ingredienteEmEdicao, quantidade: e.target.value })}
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ width: '80px' }}>
                                        <label className='label-cat' style={{ display: 'block', marginBottom: '8px' }}>Unid.</label>
                                        <select
                                            className='input-cat'
                                            value={ingredienteEmEdicao.unidade}
                                            onChange={(e) => setIngredienteEmEdicao({ ...ingredienteEmEdicao, unidade: e.target.value })}
                                            className='input-cat'
                                            value={ingredienteEmEdicao.unidade}
                                            onChange={(e) => setIngredienteEmEdicao({ ...ingredienteEmEdicao, unidade: e.target.value })}
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                        >
                                            <option value="g">g</option>
                                            <option value="mg">mg</option>
                                            <option value="ml">ml</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className='modal-cat-acoes'>
                            <button type='button' className='btn-cat-secundario' onClick={() => setModalIngredienteAberto(false)}>Cancelar</button>
                            <button type='button' className='btn-cat-primario' onClick={salvarIngredienteModal}>Salvar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default Catalogo
