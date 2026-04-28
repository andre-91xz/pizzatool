import { useState, useEffect } from 'react'
import { FaCashRegister, FaPizzaSlice, FaMapMarkerAlt, FaMotorcycle, FaWineGlassAlt, FaTrash, FaCheck, FaUndo, FaPlus, FaUser, FaPhoneAlt, FaWallet, FaReceipt } from 'react-icons/fa'
import './abrir_pedido.css'

function AbrirPedido({ pedidoEmEdicao, limparEdicao }) {
    const [cliente, setCliente] = useState({ nome: '', celular: '' });
    const [bairros, setBairros] = useState([]);
    const [bairroSelecionado, setBairroSelecionado] = useState('');
    const [formaPagamento, setFormaPagamento] = useState('dinheiro');

    const [cardapio, setCardapio] = useState([]);
    const [pizzaSelecionada, setPizzaSelecionada] = useState('');
    const [quantidadePizza, setQuantidadePizza] = useState(1);

    const [bordas, setBordas] = useState([]);
    const [bordaSelecionada, setBordaSelecionada] = useState('');

    const [pizzasSelecionadas, setPizzasSelecionadas] = useState([]);

    const [bebidas, setBebidas] = useState([]);
    const [bebidasSelecionadas, setBebidasSelecionadas] = useState([]);
    const [notificacao, setNotificacao] = useState(null);


    const [retornoApi, setRetornoApi] = useState({ tipo: '', mensagem: '' });

    useEffect(() => {
        const carregarDados = async () => {
            try {
                const resBairros = await fetch('http://localhost:3002/api/bairros');
                setBairros(await resBairros.json());

                const resCardapio = await fetch('http://localhost:3002/api/cardapio');
                setCardapio(await resCardapio.json());

                const resBebidas = await fetch('http://localhost:3002/api/bebidas');
                setBebidas(await resBebidas.json());

                const resBordas = await fetch('http://localhost:3002/api/bordas');
                const fetchedBordas = await resBordas.json();

                const bordasValidas = Array.isArray(fetchedBordas) ? fetchedBordas : [];

                if (bordasValidas.length === 0) {
                    setBordas([
                        { id: 'm1', nome: 'Catupiry Original', valor_adicional: 8.00 },
                        { id: 'm2', nome: 'Cheddar Premium', valor_adicional: 9.50 },
                        { id: 'm3', nome: 'Chocolate ao Leite', valor_adicional: 12.00 }
                    ]);
                } else {
                    setBordas(bordasValidas);
                }
            } catch (error) {
                console.error("Erro ao carregar dados do PDV:", error);
            }
        };
        carregarDados();
    }, []);

    useEffect(() => {
        if (pedidoEmEdicao && cardapio.length > 0 && bebidas.length > 0) {
            setCliente({ nome: pedidoEmEdicao.nome, celular: pedidoEmEdicao.celular });
            setBairroSelecionado(pedidoEmEdicao.bairro);

            let tBebidas = 0;
            const bebidasStr = pedidoEmEdicao.itens_completos[0]?.bebidas;
            if (bebidasStr) {
                const parsed = [];
                const parts = bebidasStr.split(', ');
                parts.forEach(part => {
                    const match = part.match(/^(\d+)x\s+(.+)$/);
                    if (match) {
                        const qtd = parseInt(match[1]);
                        const nomeB = match[2];
                        const bDb = bebidas.find(b => b.bebida === nomeB);
                        if (bDb) {
                            parsed.push({ id: bDb.id, bebida: bDb.bebida, preco: Number(bDb.preco), quantidade: qtd });
                            tBebidas += Number(bDb.preco) * qtd;
                        }
                    }
                });
                setBebidasSelecionadas(parsed);
            }

            const mappedPizzas = pedidoEmEdicao.itens_completos.map((item, index) => {
                const cObj = cardapio.find(c => c.id === item.cardapio_id);
                let precoFinal = Number(item.preco);
                if (index === 0) precoFinal -= tBebidas;

                return {
                    unique_id: Math.random(),
                    cardapio_id: item.cardapio_id,
                    nomeExibicao: cObj ? cObj.nome : `Pizza ID ${item.cardapio_id} (Recarregada)`,
                    quantidade: item.quantidade,
                    borda_id: '',
                    precoTotal: precoFinal
                };
            });

            setPizzasSelecionadas(mappedPizzas);
        }
    }, [pedidoEmEdicao, cardapio, bebidas]);

    const bairroObj = bairros.find(b => b.bairro === bairroSelecionado);
    const taxaEntrega = bairroObj ? Number(bairroObj.valor) : 0;

    const adicionarPizza = () => {
        if (!pizzaSelecionada) return;
        const pizzaObj = cardapio.find(c => c.id.toString() === pizzaSelecionada);
        const bordaObj = bordas.find(b => b.id.toString() === bordaSelecionada);

        const precoP = Number(pizzaObj.preco) * quantidadePizza;
        const precoB = bordaObj ? Number(bordaObj.valor_adicional) * quantidadePizza : 0;
        const nomeExibicao = bordaObj ? `${pizzaObj.nome} (Borda: ${bordaObj.nome})` : pizzaObj.nome;

        setPizzasSelecionadas([...pizzasSelecionadas, {
            unique_id: Date.now(),
            cardapio_id: pizzaObj.id,
            nomeExibicao,
            quantidade: quantidadePizza,
            borda_id: bordaSelecionada,
            precoTotal: precoP + precoB
        }]);

        setPizzaSelecionada('');
        setQuantidadePizza(1);
        setBordaSelecionada('');
    };

    const removerPizza = (uid) => {
        setPizzasSelecionadas(prev => prev.filter(p => p.unique_id !== uid));
    };

    const adicionarBebida = (idBebida) => {
        if (!idBebida) return;
        const bebidaDb = bebidas.find(b => b.id.toString() === idBebida);
        if (!bebidaDb) return;

        const jaAdicionada = bebidasSelecionadas.find(b => b.id.toString() === idBebida);
        if (jaAdicionada) {
            setBebidasSelecionadas(prev => prev.map(b => b.id.toString() === idBebida ? { ...b, quantidade: b.quantidade + 1 } : b));
        } else {
            setBebidasSelecionadas(prev => [...prev, { id: bebidaDb.id, bebida: bebidaDb.bebida, preco: Number(bebidaDb.preco), quantidade: 1 }]);
        }
    };

    const removerBebida = (idBebida) => {
        setBebidasSelecionadas(prev => prev.filter(b => b.id !== idBebida));
    };

    const totalPizzas = pizzasSelecionadas.reduce((acc, p) => acc + p.precoTotal, 0);
    const totalBebidas = bebidasSelecionadas.reduce((acc, b) => acc + (b.preco * b.quantidade), 0);
    const totalPedido = totalPizzas + totalBebidas + taxaEntrega;

    const limparFormulario = (force = false) => {
        if (force || window.confirm('Deseja realmente desfazer e limpar todo o pedido?')) {
            setCliente({ nome: '', celular: '' });
            setBairroSelecionado('');
            setPizzasSelecionadas([]);
            setPizzaSelecionada('');
            setQuantidadePizza(1);
            setBordaSelecionada('');
            setBebidasSelecionadas([]);
            setFormaPagamento('dinheiro');
            if (limparEdicao) limparEdicao();
        }
    };

    const lancarPedido = async (e) => {
        e.preventDefault();
        if (pizzasSelecionadas.length === 0) return alert("Adicione pelo menos uma pizza!");
        if (!bairroSelecionado) return alert("Selecione o bairro de entrega!");
        if (!cliente.nome || !cliente.celular) return alert("Preencha os dados do cliente!");

        const itensPayload = [
            ...pizzasSelecionadas.map(p => {
                const pizzaDb = cardapio.find(c => c.id === p.cardapio_id);
                return {
                    tipo: 'pizza',
                    catalogo_id: pizzaDb ? pizzaDb.id : null,
                    cardapio_id: p.cardapio_id,
                    nome: p.nomeExibicao,
                    quantidade: p.quantidade,
                    preco: p.precoTotal,
                    custo_estimado: pizzaDb ? pizzaDb.custo_estimado : 0,
                };
            }),
            ...bebidasSelecionadas.map(b => ({
                tipo: 'bebida',
                id_bebida: b.id,
                nome: b.bebida,
                quantidade: b.quantidade,
                preco: b.preco,
                custo_estimado: 0
            }))
        ];

        const payload = {
            cliente: cliente.nome,
            telefone: cliente.celular,
            endereco: '',
            bairro: bairroSelecionado,
            itens: itensPayload,
            total: totalPedido,
            taxa_entrega: taxaEntrega,
            metodo_pagamento: formaPagamento,
            motoboy_id: null,
            created_at: pedidoEmEdicao ? pedidoEmEdicao.created_at : null
        };

        try {
            if (pedidoEmEdicao && pedidoEmEdicao.id) {
                await fetch('http://localhost:3002/api/pedidos', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [pedidoEmEdicao.id] })
                });
            }

            const response = await fetch('http://localhost:3002/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setNotificacao(pedidoEmEdicao ? "Pedido atualizado com sucesso!" : "Pedido lançado com sucesso!");
                setTimeout(() => setNotificacao(null), 3000);
                limparFormulario(true);
            } else {
                setNotificacao("Erro ao lançar pedido.");
                setTimeout(() => setNotificacao(null), 3000);
            }
        } catch (error) {
            console.error(error);
            setNotificacao("Erro de conexão com o servidor.");
            setTimeout(() => setNotificacao(null), 3000);
        }
    };

    return (


        <div className='pdv-principal'>
            <div className='pdv-header'>
                <h1 className='titulo-pdv'><FaCashRegister /> {pedidoEmEdicao ? 'Edição' : 'Novo Pedido'}</h1>
                <button type="button" className='btn-desfazer' onClick={() => limparFormulario(false)}>
                    <FaUndo /> {pedidoEmEdicao ? 'Cancelar' : 'Limpar'}
                </button>
            </div>
            {/* Notificação Temporária */}
            {notificacao && (
                <div className={`chat-toast ${notificacao.includes('Erro') ? 'erro' : ''}`}>
                    <FaCheck /> {notificacao}
                </div>
            )}
            <form className='pdv-layout' onSubmit={lancarPedido}>
                {/* Coluna Esquerda: Form de Cadastro */}
                <div className='pdv-coluna'>
                    <div className='pdv-card'>
                        <h2><FaUser /> Identificação e Entrega</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' }}>
                            <div className='form-group-pdv'>
                                <label>Nome do Cliente</label>
                                <input type='text' value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} placeholder='Nome completo' required />
                            </div>
                            <div className='form-group-pdv'>
                                <label>Celular</label>
                                <input type='text' value={cliente.celular} onChange={(e) => setCliente({ ...cliente, celular: e.target.value })} placeholder='(00) 00000-0000' required />
                            </div>
                        </div>
                        <div className='form-group-pdv'>
                            <label><FaMapMarkerAlt /> Bairro de Entrega</label>
                            <select value={bairroSelecionado} onChange={(e) => setBairroSelecionado(e.target.value)} required>
                                <option value="">Onde vamos entregar?</option>
                                {bairros.map(b => (
                                    <option key={b.id} value={b.bairro}>{b.bairro} (+ R$ {Number(b.valor).toFixed(2)})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className='pdv-card'>
                        <h2><FaPizzaSlice /> Seleção de Produtos</h2>
                        <div className='form-group-pdv'>
                            <label>Pizza</label>
                            <select value={pizzaSelecionada} onChange={(e) => setPizzaSelecionada(e.target.value)}>
                                <option value="">Escolha o sabor...</option>
                                {cardapio.filter(c => c.status).map(c => (
                                    <option key={c.id} value={c.id}>{c.nome} - R$ {Number(c.preco).toFixed(2)}</option>
                                ))}
                            </select>
                        </div>

                        <div className='row-pizza-pdv'>
                            <div className='form-group-pdv'>
                                <label>Qtd.</label>
                                <input type='number' min="1" value={quantidadePizza} onChange={(e) => setQuantidadePizza(Number(e.target.value))} />
                            </div>
                            <div className='form-group-pdv'>
                                <label>Borda</label>
                                <select value={bordaSelecionada} onChange={(e) => setBordaSelecionada(e.target.value)}>
                                    <option value="">Sem Borda Recheada</option>
                                    {bordas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nome} (+ R$ {Number(b.valor_adicional).toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button type="button" className='btn-add-pdv' onClick={adicionarPizza}>
                            <FaPlus /> Adicionar ao Pedido
                        </button>

                        <div className='form-group-pdv' style={{ marginTop: '20px' }}>
                            <label><FaWineGlassAlt /> Bebidas</label>
                            <select onChange={(e) => { adicionarBebida(e.target.value); e.target.value = ''; }}>
                                <option value="">Adicionar bebida...</option>
                                {bebidas.filter(b => b.status).map(b => (
                                    <option key={b.id} value={b.id}>{b.bebida} - R$ {Number(b.preco).toFixed(2)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Itens Adicionados */}
                    {(pizzasSelecionadas.length > 0 || bebidasSelecionadas.length > 0) && (
                        <div className='pdv-lista-itens'>
                            {pizzasSelecionadas.map(p => (
                                <div key={p.unique_id} className='pdv-item-selecionado'>
                                    <div className='item-icon'><FaPizzaSlice /></div>
                                    <div className='item-info'>
                                        <span className='b-nome'>{p.quantidade}x {p.nomeExibicao}</span>
                                        <span className='b-valor'>R$ {p.precoTotal.toFixed(2)}</span>
                                    </div>
                                    <button type="button" className='btn-remove' onClick={() => removerPizza(p.unique_id)}><FaTrash /></button>
                                </div>
                            ))}
                            {bebidasSelecionadas.map(b => (
                                <div key={b.id} className='pdv-item-selecionado'>
                                    <div className='item-icon'><FaWineGlassAlt /></div>
                                    <div className='item-info'>
                                        <span className='b-nome'>{b.quantidade}x {b.bebida}</span>
                                        <span className='b-valor'>R$ {(b.preco * b.quantidade).toFixed(2)}</span>
                                    </div>
                                    <button type="button" className='btn-remove' onClick={() => removerBebida(b.id)}><FaTrash /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Coluna Direita: Resumo Minimalista */}
                <div className='pdv-coluna pdv-resumo-wrapper'>
                    <div className='pdv-resumo-card'>
                        <div className='resumo-header'>
                            <FaReceipt size={16} />
                            <h2>Checkout</h2>
                        </div>

                        <div className='resumo-itens-scroll'>
                            {[...pizzasSelecionadas, ...bebidasSelecionadas.map(b => ({ ...b, nomeExibicao: b.bebida, precoTotal: b.preco * b.quantidade }))].map((item, idx) => (
                                <div key={idx} className='resumo-linha'>
                                    <span>{item.quantidade}x {item.nomeExibicao}</span>
                                    <strong>R$ {item.precoTotal.toFixed(2)}</strong>
                                </div>
                            ))}
                        </div>

                        <div className='resumo-financas'>
                            <div className='resumo-linha taxa'>
                                <span>Entrega</span>
                                <strong>R$ {taxaEntrega.toFixed(2)}</strong>
                            </div>

                            <div className='resumo-pagamento'>
                                <label><FaWallet /> Pagamento</label>
                                <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">Pix</option>
                                    <option value="cartao_credito">Cartão de Crédito</option>
                                    <option value="cartao_debito">Cartão de Débito</option>
                                </select>
                            </div>

                            <div className='resumo-total'>
                                <div className='total-info'>
                                    <span>Valor Total</span>
                                    <strong>R$ {totalPedido.toFixed(2)}</strong>
                                </div>
                            </div>

                            <button type="submit" className='btn-confirmar-pdv'>
                                <FaCheck /> Finalizar Pedido
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default AbrirPedido
