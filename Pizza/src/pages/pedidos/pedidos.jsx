import { useState, useEffect, useMemo } from 'react'
import { 
    FaClipboardList, FaMotorcycle, FaCheckCircle, FaClock, FaMapMarkerAlt, 
    FaPhone, FaTimes, FaEdit, FaTrash, FaBan, FaPrint, FaReceipt, 
    FaCreditCard, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaCheckDouble
} from 'react-icons/fa'
import './pedidos.css'

function Pedidos({ editarPedido }) {
    const [pedidosRaw, setPedidosRaw] = useState([]);
    const [motoboys, setMotoboys] = useState([]);
    const [modalDespacho, setModalDespacho] = useState({ visivel: false, grupo: null });
    const [modalComprovante, setModalComprovante] = useState({ visivel: false, grupo: null });
    
    // Novos estados de filtro e navegação
    const [filtroStatus, setFiltroStatus] = useState('andamento'); // andamento, entregue, cancelado, pendente, todos
    const [dataReferencia, setDataReferencia] = useState(new Date());

    const fetchPedidos = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/pedidos');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPedidosRaw(data);
            }
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
        }
    };

    const fetchMotoboys = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/motoboy');
            const data = await res.json();
            if (Array.isArray(data)) {
                setMotoboys(data.filter(m => m.status === 'ativo'));
            }
        } catch (error) {
            console.error("Erro ao buscar motoboys:", error);
        }
    };

    useEffect(() => {
        fetchPedidos();
        fetchMotoboys();
        const interval = setInterval(fetchPedidos, 10000);
        return () => clearInterval(interval);
    }, []);

    // Lógica de filtragem interativa
    const pedidosFiltrados = useMemo(() => {
        return pedidosRaw.filter(p => {
            if (!p.created_at) return false;

            // Função para converter string BR (DD/MM/YYYY) ou ISO para objeto Date
            const parseDataBR = (str) => {
                if (str.includes('/')) {
                    const [data, horaPart] = str.split(', ');
                    const [d, m, y] = data.split('/');
                    const [h, min, s] = (horaPart || "00:00:00").split(':');
                    return new Date(y, m - 1, d, h, min, s);
                }
                return new Date(str);
            };

            const dataPedido = parseDataBR(p.created_at);
            
            // Filtro de Data (Hoje/Dia Específico)
            const mesmoDia = dataPedido.getDate() === dataReferencia.getDate() &&
                             dataPedido.getMonth() === dataReferencia.getMonth() &&
                             dataPedido.getFullYear() === dataReferencia.getFullYear();
            
            if (!mesmoDia) return false;

            // Filtro de Status
            if (filtroStatus === 'andamento') {
                return p.status !== 'entregue' && p.status !== 'cancelado';
            }
            if (filtroStatus === 'todos') return true;
            return p.status === filtroStatus;
        }).map(p => {
            let itensParseados = [];
            try {
                itensParseados = typeof p.itens === 'string' ? JSON.parse(p.itens) : p.itens;
            } catch (e) { console.error("Erro parse itens", e); }

            let qtdItens = (itensParseados || []).reduce((acc, i) => acc + (parseInt(i.quantidade) || 1), 0);

            return {
                id: p.id,
                ids: [p.id],
                nome: p.cliente,
                celular: p.telefone,
                bairro: p.bairro,
                data_completa: p.created_at,
                statuspedido: p.status, 
                valor_entrega: Number(p.taxa_entrega) || 0,
                total_itens: Number(p.total) - (Number(p.taxa_entrega) || 0),
                total: Number(p.total),
                qtd_itens: qtdItens,
                itens_completos: itensParseados || [],
                pagamento: p.metodo_pagamento || 'Não informado'
            };
        });
    }, [pedidosRaw, filtroStatus, dataReferencia]);

    // Estatísticas rápidas
    const estatisticas = useMemo(() => {
        const total = pedidosFiltrados.reduce((acc, p) => acc + p.total, 0);
        return {
            qtd: pedidosFiltrados.length,
            valor: total
        };
    }, [pedidosFiltrados]);

    const navegarDia = (offset) => {
        const novaData = new Date(dataReferencia);
        novaData.setDate(novaData.getDate() + offset);
        setDataReferencia(novaData);
    };

    const irParaHoje = () => setDataReferencia(new Date());

    const formatarDataExibicao = (data) => {
        const hoje = new Date();
        if (data.getDate() === hoje.getDate() && 
            data.getMonth() === hoje.getMonth() && 
            data.getFullYear() === hoje.getFullYear()) return 'Hoje';
        
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const formatarDiaSemana = (data) => {
        return data.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
    };

    const atualizarStatusGrupo = async (grupoIds, novoStatus) => {
        for (let id of grupoIds) {
            await fetch(`http://localhost:3002/api/pedidos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statuspedido: novoStatus })
            });
        }
        fetchPedidos();
    };

    const excluirGrupo = async (grupoIds) => {
        if (!window.confirm("Deseja EXCLUIR este pedido?")) return;
        try {
            await fetch('http://localhost:3002/api/pedidos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: grupoIds })
            });
            fetchPedidos();
        } catch (error) { console.error("Erro ao excluir:", error); }
    };

    const despacharGrupo = async (motoboyId) => {
        const { ids, bairro } = modalDespacho.grupo;
        const idsText = ids.map(id => `#${id}`).join(', ');

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const isFirst = i === 0;
            await fetch(`http://localhost:3002/api/pedidos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    statuspedido: 'saiu_entrega',
                    motoboy_id: isFirst ? motoboyId : null,
                    pedido_ids_agrupados: isFirst ? idsText : null,
                    bairro: isFirst ? bairro : null
                })
            });
        }
        setModalDespacho({ visivel: false, grupo: null });
        fetchPedidos();
    };

    const renderizarBotoes = (grupo) => {
        switch (grupo.statuspedido) {
            case 'pendente':
                return <button className='btn-status btn-preparo' onClick={() => atualizarStatusGrupo(grupo.ids, 'em_preparo')}>Em Preparação</button>;
            case 'em_preparo':
                return <button className='btn-status btn-despachar' onClick={() => setModalDespacho({ visivel: true, grupo })}>Despachar Pedido</button>;
            case 'saiu_entrega':
                return <button className='btn-status btn-entregue' onClick={() => atualizarStatusGrupo(grupo.ids, 'entregue')}>Entregue</button>;
            default:
                return null;
        }
    };

    return (
        <div className='pedidos-principal'>
            {/* Header Interativo e Premium */}
            <div className='pedidos-header-premium'>
                <div className='header-top'>
                    <h1 className='titulo-pedidos-moderno'>
                        <FaClipboardList className='icon-gold' /> Dashboard de Pedidos
                    </h1>
                    
                    <div className='time-travel-controls'>
                        <button className='btn-nav-dia' onClick={() => navegarDia(-1)}><FaChevronLeft /></button>
                        <div className='data-exibicao' onClick={irParaHoje}>
                            <span className='dia-text'>{formatarDataExibicao(dataReferencia)}</span>
                            <span className='semana-text'>{formatarDiaSemana(dataReferencia)}</span>
                        </div>
                        <button className='btn-nav-dia' onClick={() => navegarDia(1)}><FaChevronRight /></button>
                    </div>

                    <div className='stats-quick-view'>
                        <div className='stat-item'>
                            <span className='stat-label'>Pedidos</span>
                            <span className='stat-value'>{estatisticas.qtd}</span>
                        </div>
                        <div className='stat-item'>
                            <span className='stat-label'>Faturamento</span>
                            <span className='stat-value'>R$ {estatisticas.valor.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className='filter-bar-pills'>
                    <button className={`pill ${filtroStatus === 'andamento' ? 'active' : ''}`} onClick={() => setFiltroStatus('andamento')}>
                        <FaClock /> Em Andamento
                    </button>
                    <button className={`pill ${filtroStatus === 'pendente' ? 'active' : ''}`} onClick={() => setFiltroStatus('pendente')}>
                        <FaReceipt /> Pendentes
                    </button>
                    <button className={`pill ${filtroStatus['entregue'] === 'entregue' || filtroStatus === 'entregue' ? 'active' : ''}`} onClick={() => setFiltroStatus('entregue')}>
                        <FaCheckDouble /> Entregues
                    </button>
                    <button className={`pill ${filtroStatus === 'cancelado' ? 'active' : ''}`} onClick={() => setFiltroStatus('cancelado')}>
                        <FaBan /> Cancelados
                    </button>
                    <button className={`pill ${filtroStatus === 'todos' ? 'active' : ''}`} onClick={() => setFiltroStatus('todos')}>
                        <FaCalendarAlt /> Todos
                    </button>
                </div>
            </div>

            <div className='pedidos-container'>
                {pedidosFiltrados.length === 0 ? (
                    <div className='pedidos-placeholder'>
                        <div className='placeholder-icon-wrapper'>
                            <FaClipboardList size={60} />
                        </div>
                        <h2>Sem pedidos para este filtro</h2>
                        <p>Tente mudar a data ou o status acima para ver outros registros.</p>
                        <button className='btn-cat-add' onClick={irParaHoje} style={{marginTop: '20px'}}>Voltar para Hoje</button>
                    </div>
                ) : (
                    <div className='pedidos-grid'>
                        {pedidosFiltrados.map(grupo => (
                            <div key={grupo.ids.join('-')} className={`pedido-card-moderno ${grupo.statuspedido}`}>
                                <div className='pedido-card-header'>
                                    <span className='pedido-id'>#{grupo.id}</span>
                                    <span className={`status-badge ${grupo.statuspedido}`}>
                                        {grupo.statuspedido.replace('_', ' ')}
                                    </span>
                                </div>
                                
                                <div className='pedido-card-body'>
                                    <h3 className='cliente-nome'>{grupo.nome}</h3>
                                    <div className='info-row'>
                                        <FaMapMarkerAlt className='mini-icon' />
                                        <span>{grupo.bairro}</span>
                                    </div>
                                    <div className='info-row'>
                                        <FaPhone className='mini-icon' />
                                        <span>{grupo.celular || '--'}</span>
                                    </div>
                                    
                                    <div className='pedido-detalhes-compact'>
                                        <div className='detalhe-item'>
                                            <span className='d-label'>Itens</span>
                                            <span className='d-value'>{grupo.qtd_itens}</span>
                                        </div>
                                        <div className='detalhe-item'>
                                            <span className='d-label'>Pagamento</span>
                                            <span className='d-value'>{grupo.pagamento}</span>
                                        </div>
                                    </div>

                                    <div className='valor-box'>
                                        <span className='v-label'>Total do Pedido</span>
                                        <span className='v-total'>R$ {grupo.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className='pedido-card-footer'>
                                    {renderizarBotoes(grupo)}
                                </div>

                                <div className='card-hover-actions'>
                                    <button onClick={() => setModalComprovante({ visivel: true, grupo })} title="Comprovante"><FaReceipt /></button>
                                    <button onClick={() => editarPedido && editarPedido(grupo)} title="Editar"><FaEdit /></button>
                                    <button onClick={() => excluirGrupo(grupo.ids)} className='btn-danger-icon' title="Excluir"><FaTrash /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modais mantidos e estilizados via CSS */}
            {modalDespacho.visivel && (
                <div className='modal-backdrop'>
                    <div className='modal-content'>
                        <div className='modal-header'>
                            <h2>Despachar Pedido</h2>
                            <button className='btn-fechar' onClick={() => setModalDespacho({ visivel: false, grupo: null })}><FaTimes /></button>
                        </div>
                        <div className='modal-body'>
                            <div className='lista-motoboys-modal'>
                                {motoboys.map(m => (
                                    <div key={m.id} className='motoboy-opcao' onClick={() => despacharGrupo(m.id)}>
                                        <FaMotorcycle className='m-icon' />
                                        <div className='m-info'>
                                            <h4>{m.nome}</h4>
                                            <span>Comissão: R$ {Number(m.comissao).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalComprovante.visivel && modalComprovante.grupo && (
                <div className='modal-backdrop'>
                    <div className='modal-content recibo-modal'>
                        <div className='modal-header'>
                            <h2>Comprovante</h2>
                            <button className='btn-fechar' onClick={() => setModalComprovante({ visivel: false, grupo: null })}><FaTimes /></button>
                        </div>
                        <div className='modal-body' id="area-recibo">
                            <div className='recibo-content-premium'>
                                <div className='recibo-topo'>
                                    <h2 className='pizzaria-nome-recibo'>BELLA NAPOLI</h2>
                                    <p className='pedido-num-recibo'>Pedido #{Math.max(...modalComprovante.grupo.ids)}</p>
                                    <p>{new Date(modalComprovante.grupo.data_completa).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className='recibo-secao'>
                                    <p><strong>Cliente:</strong> {modalComprovante.grupo.nome}</p>
                                    <p><strong>Bairro:</strong> {modalComprovante.grupo.bairro}</p>
                                    <p><strong>Pagamento:</strong> {modalComprovante.grupo.pagamento}</p>
                                </div>
                                <div className='recibo-itens-lista'>
                                    {modalComprovante.grupo.itens_completos.map((item, i) => (
                                        <div key={i} className='recibo-item'>
                                            <span>{item.quantidade}x {item.nome}</span>
                                            <span>R$ {Number(item.preco).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className='recibo-total-final'>
                                    <div className='total-row'><span>Subtotal</span><span>R$ {modalComprovante.grupo.total_itens.toFixed(2)}</span></div>
                                    <div className='total-row'><span>Entrega</span><span>R$ {modalComprovante.grupo.valor_entrega.toFixed(2)}</span></div>
                                    <div className='total-row final'><span>TOTAL</span><span>R$ {modalComprovante.grupo.total.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <button className='btn-print-recibo' onClick={() => window.print()}>
                                <FaPrint /> Imprimir Comprovante
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Pedidos;
