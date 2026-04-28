import { useEffect, useState } from 'react'
import { FaPlus, FaSave, FaTrash, FaBoxOpen, FaChartLine, FaEdit, FaPlay } from 'react-icons/fa'
import './material.css'
import RetornoApi from '../componentes/retornoApi/RetornoApi'




function Material() {
    const [preco, setPreco] = useState('');
    const [categoria, setCategoria] = useState('outros');
    const [modelosPredefinidos, setModelosPredefinidos] = useState([]);
    const [modeloEmEdicaoId, setModeloEmEdicaoId] = useState(null);
    const [modeloExclusaoId, setModeloExclusaoId] = useState(null);
    const [materiaisDoBanco, setMateriaisDoBanco] = useState([]);
    const [idEditando, setIdEditando] = useState(null);
    const [formEditando, setFormEditando] = useState({ nome: '', preco: '', quantidade: '', unidade: '' });
    const [retornoApi, setRetornoApi] = useState({ tipo: '', mensagem: '' });
    const [categoriaRelatorio, setCategoriaRelatorio] = useState('massas');
    const [slotPecas, setSlotPecas] = useState(8);
    const [editorIngrediente, setEditorIngrediente] = useState({
        aberto: false,
        categoriaChave: '',
        materialNome: '',
        unidade: '',
        valorNecessario: '',
    });

    const formatarExibicao = (valor, unidade) => {
        const v = parseFloat(valor) || 0;
        const u = unidade?.toLowerCase() || '';

        if (u === 'g' && v >= 1000) {
            return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
        }
        if (u === 'ml' && v >= 1000) {
            return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;
        }

        return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade}`;
    };

    const padronizarTexto = (texto) => texto ? String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim() : '';

    const converterEPadronizarUnidade = (qtd, und) => {
        const q = parseFloat(qtd) || 0;
        const u = und?.toLowerCase() || '';
        if (u === 'kg') return { quantidade: q * 1000, unidade: 'g' };
        if (u === 'mg') return { quantidade: q / 1000, unidade: 'g' };
        if (u === 'l') return { quantidade: q * 1000, unidade: 'ml' };
        return { quantidade: q, unidade: und };
    };

    const [categoriasRelatorio, setCategoriasRelatorio] = useState({
        massas: {
            nome: 'Massas',
            porcaoReferencia: 'Base para 8 pedacos',
            itens: [],
        },
        molhos: {
            nome: 'Molhos',
            porcaoReferencia: 'Base para 8 pizzas',
            itens: [],
        },
        recheios: {
            nome: 'Recheios',
            porcaoReferencia: 'Base para 8 pizzas',
            itens: [],
        },
        outros: {
            nome: 'Outros',
            porcaoReferencia: 'Outros materiais',
            itens: [],
        },
    });

    // ============================================================
    // Relatório de materiais (preparação de pizzas)
    // ============================================================
    useEffect(() => {
        const fetchRelatorio = async () => {
            try {
                const resMat = await fetch('http://localhost:3002/api/material');
                if (!resMat.ok) return;
                const materiais = await resMat.json();

                // Busca as fichas técnicas do banco
                const resFichas = await fetch('http://localhost:3002/api/categoriaficha');
                const fichasDoBanco = resFichas.ok ? await resFichas.json() : [];

                const montarItens = (categoria) => {
                    const fichas = fichasDoBanco.filter(f => f.categoria === categoria);
                    return fichas.map(f => {
                        const materialEncontrado = materiais.find(m => padronizarTexto(m.nome).includes(padronizarTexto(f.nome_ingrediente)));
                        let qtdAtual = 0;
                        let unidade = f.unidade || 'g';
                        if (materialEncontrado) {
                            const { quantidade: qBase } = converterEPadronizarUnidade(materialEncontrado.quantidade, materialEncontrado.unidade);
                            qtdAtual = qBase;
                            unidade = (materialEncontrado.unidade.toLowerCase() === 'kg' || materialEncontrado.unidade.toLowerCase() === 'g') ? 'g' : 'ml';
                        }
                        return {
                            material: f.nome_ingrediente,
                            quantidadeNecessaria: parseFloat(f.quantidade_necessaria),
                            quantidadeAtual: qtdAtual,
                            unidade: unidade
                        };
                    });
                };

                setCategoriasRelatorio({
                    massas: {
                        nome: 'Receita da Massa',
                        itens: montarItens('massas')
                    }
                });
                setCategoriaRelatorio('massas');

            } catch (error) {
                console.error("Erro ao buscar material para relatório:", error);
            }
        };
        fetchRelatorio();
    }, [materiaisDoBanco]); // Agora ele atualiza sempre que o estoque mudar!

    const categoriaAtual = categoriasRelatorio[categoriaRelatorio];
    const fatorSlot = slotPecas / 8;
    const calculoMassasPizza = categoriasRelatorio.massas.itens.map((item) => {
        const quantidadeNecessariaSlot = item.quantidadeNecessaria * fatorSlot;
        const massasPossiveis =
            quantidadeNecessariaSlot > 0
                ? Math.floor(item.quantidadeAtual / quantidadeNecessariaSlot)
                : 0;

        return {
            ...item,
            quantidadeNecessariaSlot,
            massasPossiveis,
            abaixoDoNecessario: item.quantidadeAtual < quantidadeNecessariaSlot,
        };
    });

    const quantidadeMassasPossivel = calculoMassasPizza.length > 0
        ? Math.min(...calculoMassasPizza.map((item) => item.massasPossiveis))
        : 0;

    const ingredientesAbaixoDoNecessario = calculoMassasPizza
        .filter((item) => item.abaixoDoNecessario)
        .map((item) => item.material);

    function editarQuantidadeNecessaria(materialNome, categoriaChave) {
        const itemAtual = categoriasRelatorio[categoriaChave].itens.find(
            (item) => item.material === materialNome
        );
        if (!itemAtual) return;

        setEditorIngrediente({
            aberto: true,
            categoriaChave,
            materialNome,
            unidade: itemAtual.unidade,
            valorNecessario: String(itemAtual.quantidadeNecessaria),
        });
    }

    function fecharEditorIngrediente() {
        setEditorIngrediente({
            aberto: false,
            categoriaChave: '',
            materialNome: '',
            unidade: '',
            valorNecessario: '',
        });
    }

    async function salvarEdicaoIngrediente() {
        const novoValor = Number(String(editorIngrediente.valorNecessario).replace(',', '.'));
        if (!Number.isFinite(novoValor) || novoValor <= 0) {
            setRetornoApi({ tipo: 'erro', mensagem: 'Informe um numero valido maior que zero.' });
            return;
        }

        try {
            const res = await fetch('http://localhost:3002/api/categoriaficha', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoria: editorIngrediente.categoriaChave,
                    nome_ingrediente: editorIngrediente.materialNome,
                    quantidade_necessaria: novoValor
                })
            });

            if (res.ok) {
                // Atualiza localmente para dar feedback imediato
                setCategoriasRelatorio((estadoAnterior) => ({
                    ...estadoAnterior,
                    [editorIngrediente.categoriaChave]: {
                        ...estadoAnterior[editorIngrediente.categoriaChave],
                        itens: estadoAnterior[editorIngrediente.categoriaChave].itens.map((item) =>
                            item.material === editorIngrediente.materialNome
                                ? { ...item, quantidadeNecessaria: novoValor }
                                : item
                        ),
                    },
                }));
                fecharEditorIngrediente();
                setRetornoApi({ tipo: 'sucesso', mensagem: 'Ficha tecnica atualizada no banco!' });
            }
        } catch (error) {
            console.error("Erro ao salvar no banco:", error);
            setRetornoApi({ tipo: 'erro', mensagem: 'Erro ao salvar no banco.' });
        }
    }

    const excluirMaterialBanco = async (id) => {
        if (!window.confirm("Deseja realmente excluir este material do banco?")) return;
        try {
            await fetch(`http://localhost:3002/api/material/${id}`, { method: 'DELETE' });
            setMateriaisDoBanco(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Erro ao excluir do banco:", error);
        }
    };

    const salvarEdicaoInline = async (id) => {
        try {
            const res = await fetch(`http://localhost:3002/api/material/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formEditando)
            });
            if (res.ok) {
                const materialAtualizado = await res.json();
                setMateriaisDoBanco(prev => prev.map(m => m.id === id ? materialAtualizado : m));
                setIdEditando(null);
            } else {
                alert("Erro ao atualizar o material.");
            }
        } catch (error) {
            console.error("Erro ao atualizar no banco:", error);
        }
    };

    useEffect(() => {
        const carregarBanco = async () => {
            try {
                // Carrega o estoque
                const response = await fetch('http://localhost:3002/api/material');
                if (response.ok) {
                    const dados = await response.json();
                    setMateriaisDoBanco(dados);
                }

                // Carrega os modelos predefinidos
                const responseModelos = await fetch('http://localhost:3002/api/materialmodelo');
                if (responseModelos.ok) {
                    const dadosModelos = await responseModelos.json();
                    const modelosFormatados = dadosModelos.map(m => ({
                        id: m.id,
                        nome: m.nome,
                        precoExibicao: m.preco,
                        quantidade: m.quantidade,
                        unidade: m.unidade
                    }));
                    setModelosPredefinidos(modelosFormatados);
                }
            } catch (e) {
                console.error("Erro ao carregar do banco:", e);
            }
        };
        carregarBanco();
    }, []);

    useEffect(() => {
        if (!retornoApi.mensagem) return;

        const temporizador = setTimeout(() => {
            setRetornoApi({ tipo: '', mensagem: '' });
        }, 90000);

        return () => clearTimeout(temporizador);
    }, [retornoApi]);



    // A função que formata o preço para R$
    const handlePrecoChange = (dadosdoinpuit) => {
        let valor = dadosdoinpuit.target.value.replace(/\D/g, "");
        if (valor === "") {
            setPreco("");
            return;
        }
        const valorDecimal = Number(valor) / 100;
        const valorFormatado = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valorDecimal);
        setPreco(valorFormatado);
    };

    // Transformamos a função em "async" (assíncrona) porque chamadas de API levam tempo para responder
    // Função para carregar os dados do banco e atualizar o estado local
    const carregarBanco = async () => {
        try {
            const response = await fetch('http://localhost:3002/api/material');
            if (response.ok) {
                const dados = await response.json();
                setMateriaisDoBanco(dados);
                // Opcional: recarregar o relatório também se necessário
            }
            const responseModelos = await fetch('http://localhost:3002/api/materialmodelo');
            if (responseModelos.ok) {
                const dadosModelos = await responseModelos.json();
                setModelosPredefinidos(dadosModelos.map(m => ({
                    id: m.id,
                    nome: m.nome,
                    precoExibicao: m.preco,
                    quantidade: m.quantidade,
                    unidade: m.unidade
                })));
            }
        } catch (e) {
            console.error("Erro ao carregar do banco:", e);
        }
    };

    async function adicionarmaterial() {
        const nomematerial = document.getElementById('material').value.trim();
        const precoStr = document.getElementById('preco').value;
        const quantidadeInp = parseFloat(document.getElementById('quantidade_medida').value);
        const unidademedida = document.getElementById('unidade_medida').value;
        const categoriaMaterial = document.getElementById('categoria').value || categoria;

        if (!nomematerial || !precoStr || isNaN(quantidadeInp)) {
            setRetornoApi({ tipo: 'erro', mensagem: 'Preencha todos os campos corretamente!' });
            return;
        }

        const digitosPreco = precoStr.replace(/\D/g, '');
        const precoPostgres = Number(digitosPreco) / 100;

        const { quantidade: qtdNovaBase, unidade: unidadepadrao } = converterEPadronizarUnidade(quantidadeInp, unidademedida);

        const nomeBusca = padronizarTexto(nomematerial);

        // Busca se o material já existe no banco
        const extrairjson = materiaisDoBanco.find(m => padronizarTexto(m.nome) === nomeBusca);

        let finalQtd = qtdNovaBase;
        let finalUnidade = unidadepadrao;

        // Se o material já existe, somamos ao estoque atual
        if (extrairjson) {
            // Convertemos o atual para a base antes de somar
            const { quantidade: qtdAtualBase } = converterEPadronizarUnidade(extrairjson.quantidade, extrairjson.unidade);
            finalQtd = qtdAtualBase + qtdNovaBase;
            // A unidade final será a padronizada (g ou ml)
            const { unidade: uFinal } = converterEPadronizarUnidade(0, extrairjson.unidade);
            finalUnidade = uFinal;
        }

        try {
            const method = extrairjson ? 'PUT' : 'POST';
            const url = extrairjson ? `http://localhost:3002/api/material/${extrairjson.id}` : 'http://localhost:3002/api/material';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nomematerial,
                    preco: precoPostgres,
                    quantidade: finalQtd,
                    unidade: finalUnidade,
                    categoria: categoriaMaterial,
                    status: true
                })
            });

            if (res.ok) {
                setRetornoApi({
                    tipo: 'sucesso',
                    mensagem: extrairjson ? 'Estoque atualizado com sucesso!' : 'Novo material adicionado!'
                });

                // Limpa campos
                document.getElementById('material').value = '';
                document.getElementById('preco').value = '';
                document.getElementById('quantidade_medida').value = '';
                setPreco('');
                setCategoria('outros');

                // Atualiza lista
                carregarBanco();
            } else {
                const erro = await res.json();
                setRetornoApi({ tipo: 'erro', mensagem: erro.erro || 'Erro na operação.' });
            }
        } catch (error) {
            console.error(error);
            setRetornoApi({ tipo: 'erro', mensagem: 'Erro de conexão com o servidor.' });
        }
    }

    async function salvarmodelo() {
        const nomematerial = document.getElementById('material').value.trim();
        const precoModelo = document.getElementById('preco').value;
        const quantidadeRaw = document.getElementById('quantidade_medida').value;
        const unidadeRaw = document.getElementById('unidade_medida').value;
        const categoriaModelo = document.getElementById('categoria').value || categoria;

        if (!nomematerial || !precoModelo || !quantidadeRaw) {
            setRetornoApi({
                tipo: 'erro',
                mensagem: 'Preencha nome, preco e quantidade para salvar modelo.',
            });
            return;
        }

        const { quantidade: qFinal, unidade: uFinal } = converterEPadronizarUnidade(quantidadeRaw, unidadeRaw);

        // Converter preco formatado (R$ 10,00) para número (10.00)
        const precoNumerico = parseFloat(precoModelo.replace(/\D/g, '')) / 100;

        var guardarmodelo = {
            nome: nomematerial,
            preco: precoNumerico,
            quantidade: qFinal,
            unidade: uFinal,
            categoria: categoriaModelo
        };

        if (modeloEmEdicaoId) {
            try {
                const resposta = await fetch(`http://localhost:3002/api/materialmodelo/${modeloEmEdicaoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(guardarmodelo)
                });

                if (resposta.ok) {
                    const materialAtualizado = await resposta.json();

                    setModelosPredefinidos((estadoAnterior) =>
                        estadoAnterior.map((modelo) =>
                            modelo.id === modeloEmEdicaoId
                                ? {
                                    ...modelo,
                                    nome: materialAtualizado.nome,
                                    precoExibicao: materialAtualizado.preco,
                                    quantidade: materialAtualizado.quantidade,
                                    unidade: materialAtualizado.unidade,
                                    categoria: materialAtualizado.categoria,
                                }
                                : modelo
                        )
                    );
                    setModeloEmEdicaoId(null);
                    setRetornoApi({ tipo: 'sucesso', mensagem: 'Modelo atualizado no banco com sucesso!' });
                } else {
                    setRetornoApi({ tipo: 'erro', mensagem: 'Erro ao atualizar o modelo.' });
                }
            } catch (error) {
                console.error("Erro ao atualizar no banco:", error);
                setRetornoApi({ tipo: 'erro', mensagem: 'Erro de conexão com o servidor.' });
            }
            return;
        }

        try {
            const resposta = await fetch('http://localhost:3002/api/materialmodelo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(guardarmodelo),
            });

            const dados = await resposta.json();

            if (dados.sucesso) {
                setModelosPredefinidos((estadoAnterior) => [
                    {
                        id: dados.materialCadastrado.id,
                        nome: dados.materialCadastrado.nome,
                        precoExibicao: dados.materialCadastrado.preco,
                        quantidade: dados.materialCadastrado.quantidade,
                        unidade: dados.materialCadastrado.unidade,
                        categoria: dados.materialCadastrado.categoria,
                    },
                    ...estadoAnterior,
                ]);

                setRetornoApi({
                    tipo: 'sucesso',
                    mensagem: 'Modelo salvo no banco com sucesso!',
                });
            } else {
                setRetornoApi({
                    tipo: 'erro',
                    mensagem: dados.erro || 'Erro ao salvar modelo.',
                });
            }
        } catch (error) {
            console.error("Erro ao salvar modelo:", error);
            setRetornoApi({
                tipo: 'erro',
                mensagem: 'Erro de conexão com o servidor.',
            });
        }
    };

    function preencherFormularioComModelo(modelo) {
        document.getElementById('material').value = modelo.nome;
        document.getElementById('preco').value = modelo.precoExibicao;
        document.getElementById('quantidade_medida').value = modelo.quantidade;
        document.getElementById('unidade_medida').value = modelo.unidade;
        document.getElementById('categoria').value = modelo.categoria || 'outros';
        setPreco(modelo.precoExibicao);
        setCategoria(modelo.categoria || 'outros');
    }

    function usarModelo(modelo) {
        preencherFormularioComModelo(modelo);
        setModeloEmEdicaoId(null);
        setRetornoApi({
            tipo: 'sucesso',
            mensagem: `Modelo "${modelo.nome}" aplicado no formulario.`,
        });
    }

    function editarModelo(modelo) {
        preencherFormularioComModelo(modelo);
        setModeloEmEdicaoId(modelo.id);
        setRetornoApi({
            tipo: 'sucesso',
            mensagem: `Editando modelo "${modelo.nome}". Clique em Salvar Modelo para confirmar.`,
        });
    }

    async function excluirModelo(modeloId) {
        try {
            const res = await fetch(`http://localhost:3002/api/materialmodelo/${modeloId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setModelosPredefinidos((estadoAnterior) =>
                    estadoAnterior.filter((modelo) => modelo.id !== modeloId)
                );
                if (modeloEmEdicaoId === modeloId) {
                    setModeloEmEdicaoId(null);
                }
                setModeloExclusaoId(null); // Limpa o estado de exclusão

                setRetornoApi({
                    tipo: 'sucesso',
                    mensagem: 'Modelo excluído com sucesso.',
                });
            } else {
                setRetornoApi({
                    tipo: 'erro',
                    mensagem: 'Erro ao excluir modelo.',
                });
            }
        } catch (error) {
            console.error("Erro ao excluir modelo:", error);
            setRetornoApi({
                tipo: 'erro',
                mensagem: 'Erro de conexão ao excluir modelo.',
            });
        }
    }


    return (
        <div className='principal'>

            {/* Coluna esquerda — formulário + opções pré definidas */}
            <div className='coluna-esq-cima'>
                <form className='form'>
                    <label className='letrasform'>Nome do Material</label>
                    <input type='text' placeholder='Carne, Frango etc.....' id='material' className='caixaformulario' list='sugestoes-materiais'></input>
                    <datalist id="sugestoes-materiais">
                        {materiaisDoBanco.map(m => (
                            <option key={m.id} value={m.nome} />
                        ))}
                    </datalist>

                    <label className='letrasform'>Preço</label>
                    <input
                        type="text"
                        value={preco}
                        onChange={handlePrecoChange}
                        placeholder="R$ 0,00"
                        id='preco'
                        className='caixaformulario'
                    />

                    <label className='letrasform'>Conteúdo da Embalagem</label>
                    <div className='linha-embalagem'>
                        <input type='number' placeholder='Qtd' id='quantidade_medida' className='caixaformulario' style={{ flex: 0.5 }} />
                        <select id="unidade_medida" className='caixaformulario'>
                            <option value="uni">Uni</option>
                            <option value="kg">KG</option>
                            <option value="g">G</option>
                            <option value="mg">Mg</option>
                            <option value="l">L</option>
                            <option value="ml">ML</option>
                        </select>
                    </div>

                    <label className='letrasform'>Categoria</label>
                    <select
                        id="categoria"
                        className='caixaformulario'
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                    >
                        <option value="massas">Massas</option>
                        <option value="molhos">Molhos</option>
                        <option value="recheios">Recheios</option>
                        <option value="outros">Outros</option>
                    </select>

                    <button id='botaoenvio' type='button' onClick={adicionarmaterial}>
                        <FaPlus /> Adicionar Material
                    </button>
                    <button id='botaosalvar' type='button' onClick={salvarmodelo}>
                        <FaSave /> {modeloEmEdicaoId ? 'Atualizar Modelo' : 'Salvar Modelo'}
                    </button>
                </form>
                <div className='coluna-esq-baixo'>
                    <section className='predefinicao'>
                        <h2 className='titulo-sec'><FaBoxOpen /> Opções Pré Definidas</h2>
                        {modelosPredefinidos.length === 0 ? (
                            <p className='empty-msg'>Nenhum modelo salvo.</p>
                        ) : (
                            modelosPredefinidos.map((modelo) => (
                                <div key={modelo.id} className='log-card modelo-card'>
                                    <div className='modelo-info-row'>
                                        <span className='modelo-nome'>{modelo.nome}</span>
                                        <span className='modelo-detalhe'>Preço: {modelo.precoExibicao}</span>
                                        <span className='modelo-detalhe'>Conteúdo: {formatarExibicao(modelo.quantidade, modelo.unidade)}</span>
                                        <span className={`modelo-detalhe modelo-cat-${modelo.categoria || 'outros'}`}>
                                            {modelo.categoria || 'outros'}
                                        </span>
                                    </div>
                                    <div className='modelo-acoes'>
                                        {modeloExclusaoId === modelo.id ? (
                                            <>
                                                <button type='button' className='btn-pill-acao excluir' onClick={() => excluirModelo(modelo.id)}>
                                                    Confirmar
                                                </button>
                                                <button type='button' className='btn-pill-acao cancelar' onClick={() => setModeloExclusaoId(null)}>
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : modeloEmEdicaoId === modelo.id ? (
                                            <button type='button' className='btn-pill-acao cancelar' onClick={() => setModeloEmEdicaoId(null)}>
                                                Cancelar Edição
                                            </button>
                                        ) : (
                                            <>
                                                <button type='button' className='btn-pill-acao usar' onClick={() => usarModelo(modelo)}>
                                                    Usar
                                                </button>
                                                <button type='button' className='btn-pill-acao editar' onClick={() => editarModelo(modelo)}>
                                                    <FaEdit />
                                                </button>
                                                <button type='button' className='btn-pill-acao excluir' onClick={() => setModeloExclusaoId(modelo.id)}>
                                                    <FaTrash />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                </div>
            </div>



            {/* Coluna direita — materiais cadastrados + relatórios */}
            <div className='coluna-dir-cima'>
                <section className='listagem-banco'>
                    <h2 className='titulo-sec'>Estoque</h2>
                    <div className='scrollable-list' style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                        {materiaisDoBanco.length === 0 ? (
                            <p className='empty-msg'>Nenhum material no banco.</p>
                        ) : (
                            materiaisDoBanco.map((material) => (
                                <div key={material.id} className='log-card'>
                                    {idEditando === material.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                                            <input
                                                className='input-cat'
                                                value={formEditando.nome}
                                                onChange={(e) => setFormEditando({ ...formEditando, nome: e.target.value })}
                                                placeholder='Nome'
                                            />
                                            <input
                                                className='input-cat'
                                                value={formEditando.preco}
                                                onChange={(e) => setFormEditando({ ...formEditando, preco: e.target.value })}
                                                type="number"
                                                placeholder='Preço'
                                            />
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input
                                                    className='input-cat'
                                                    value={formEditando.quantidade}
                                                    onChange={(e) => setFormEditando({ ...formEditando, quantidade: e.target.value })}
                                                    type="number"
                                                    style={{ flex: 1 }}
                                                    placeholder='Qtd'
                                                />
                                                <select
                                                    className='input-cat'
                                                    value={formEditando.unidade}
                                                    onChange={(e) => setFormEditando({ ...formEditando, unidade: e.target.value })}
                                                    style={{ width: '70px', padding: '8px' }}
                                                >
                                                    <option value="kg">kg</option>
                                                    <option value="g">g</option>
                                                    <option value="mg">mg</option>
                                                    <option value="l">l</option>
                                                    <option value="ml">ml</option>
                                                    <option value="un">un</option>
                                                    <option value="caixa">caixa</option>
                                                    <option value="pacote">pacote</option>
                                                </select>
                                            </div>
                                            <select
                                                className='input-cat'
                                                value={formEditando.categoria || 'outros'}
                                                onChange={(e) => setFormEditando({ ...formEditando, categoria: e.target.value })}
                                                style={{ padding: '8px' }}
                                            >
                                                <option value="massas">Massas</option>
                                                <option value="molhos">Molhos</option>
                                                <option value="recheios">Recheios</option>
                                                <option value="outros">Outros</option>
                                            </select>
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                <button type='button' className='btn-cat-add' onClick={() => salvarEdicaoInline(material.id)} style={{ flex: 1, padding: '8px', fontSize: '12px', margin: 0 }}>
                                                    <FaSave /> Salvar
                                                </button>
                                                <button type='button' className='btn-cat-secundario' onClick={() => setIdEditando(null)} style={{ flex: 1, padding: '8px', fontSize: '12px', margin: 0 }}>
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className='log-title'>
                                                <span>{material.nome}</span>
                                            </div>
                                            <div className='log-info'>
                                                Preco: R$ {material.preco ? Number(material.preco).toFixed(2).replace('.', ',') : '0,00'}
                                            </div>
                                            <div className='log-info'>
                                                Conteudo: {formatarExibicao(material.quantidade, material.unidade)}
                                            </div>
                                            <div className={`log-info categoria-tag ${material.categoria || 'outros'}`}>
                                                {material.categoria || 'outros'}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                                <button type='button' className='modelo-acao-btn' onClick={() => { setIdEditando(material.id); setFormEditando(material); }}>
                                                    <FaEdit /> Editar
                                                </button>
                                                <button type='button' className='modelo-acao-btn excluir' onClick={() => excluirMaterialBanco(material.id)}>
                                                    <FaTrash /> Excluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>
                <div className='coluna-dir-baixo'>
                    <section className='relatoriomaterial'>
                        <h2 className='titulo-sec'><FaChartLine /> Receita da Massa</h2>
                        <div className='grid-relatorio' style={{ display: 'block' }}>
                            <div className='coluna-ingredientes' style={{ width: '100%', border: 'none', padding: 20 }}>
                                <p className='subtitulo-relatorio'>{categoriaAtual.porcaoReferencia}</p>
                                <div className='slots-massas'>
                                    {[4, 6, 8, 10, 12, 16].map((slot) => (
                                        <button
                                            key={slot}
                                            type='button'
                                            className={`slot-btn ${slotPecas === slot ? 'ativo' : ''}`}
                                            onClick={() => setSlotPecas(slot)}
                                        >
                                            {slot} pedacos
                                        </button>
                                    ))}
                                </div>
                                <div className='lista-ingredientes'>
                                    {(categoriaAtual.itens || []).map((item) => {
                                        const necValue = (item.quantidadeNecessaria * fatorSlot);
                                        const abaixoDoNecessario = item.quantidadeAtual < necValue;

                                        return (
                                            <div className='linha-ingrediente linha-ingrediente-detalhe' key={`ingrediente-${item.material}`}>
                                                <div className='ingrediente-coluna-nome'>
                                                    <span>{item.material}</span>
                                                </div>
                                                <div className='ingrediente-coluna-valores'>
                                                    <small>
                                                        <strong>Nec:</strong> {necValue.toFixed(2).replace('.', ',')} {item.unidade}
                                                    </small>
                                                    <small className={abaixoDoNecessario ? 'valor-abaixo' : ''}>
                                                        <strong>Atual:</strong> {item.quantidadeAtual} {item.unidade}
                                                    </small>
                                                </div>
                                                <button
                                                    type='button'
                                                    className='btn-editar-ingrediente'
                                                    onClick={() => editarQuantidadeNecessaria(item.material, 'massas')}
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className='resultado-massas'>
                                    <p><strong>Massas possiveis ({slotPecas} pedacos):</strong> {quantidadeMassasPossivel}</p>
                                    <p>
                                        <strong>Ingredientes abaixo do necessario:</strong>{' '}
                                        {ingredientesAbaixoDoNecessario.length > 0
                                            ? ingredientesAbaixoDoNecessario.join(', ')
                                            : 'Nenhum'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>



            <RetornoApi tipo={retornoApi.tipo} mensagem={retornoApi.mensagem} />

            {editorIngrediente.aberto && (
                <div className='modal-edicao-overlay'>
                    <div className='modal-edicao-card'>
                        <h3>Editar ingrediente</h3>
                        <label className='letrasform'>Ingrediente</label>
                        <input
                            className='caixaformulario'
                            type='text'
                            value={editorIngrediente.materialNome}
                            disabled
                        />

                        <label className='letrasform'>Quantidade necessaria ({editorIngrediente.unidade})</label>
                        <input
                            className='caixaformulario'
                            type='text'
                            value={editorIngrediente.valorNecessario}
                            onChange={(event) =>
                                setEditorIngrediente((estadoAnterior) => ({
                                    ...estadoAnterior,
                                    valorNecessario: event.target.value,
                                }))
                            }
                        />

                        <div className='modal-edicao-acoes'>
                            <button type='button' className='btn-modal-secundario' onClick={fecharEditorIngrediente}>
                                Cancelar
                            </button>
                            <button type='button' className='btn-modal-primario' onClick={salvarEdicaoIngrediente}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default Material

