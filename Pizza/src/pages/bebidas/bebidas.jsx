import { useState, useEffect } from 'react'
import { FaWineGlassAlt, FaPlus, FaMoneyBillWave, FaBoxOpen, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa'
import './bebidas.css'

function Bebidas() {
    const [bebidas, setBebidas] = useState([]);
    const [bebidaNome, setBebidaNome] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [preco, setPreco] = useState('');
    
    // Estados para edição inline
    const [idEditando, setIdEditando] = useState(null);
    const [formEditando, setFormEditando] = useState({ bebida: '', preco: '', quantidade: '' });

    const fetchBebidas = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/bebidas');
            const data = await res.json();
            if (Array.isArray(data)) {
                setBebidas(data);
            }
        } catch (error) {
            console.error("Erro ao buscar bebidas:", error);
        }
    };

    useEffect(() => {
        fetchBebidas();
    }, []);

    const padronizar = (texto) => texto ? texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '') : '';

    const cadastrarBebida = async (e) => {
        e.preventDefault();
        if (!bebidaNome || !quantidade || !preco) return;
        
        const nomeBusca = padronizar(bebidaNome);
        const precoNumerico = parseFloat(preco);
        const qtdNova = parseFloat(quantidade);

        // Sistema de soma se nome e preço forem iguais (mesmo sistema de Material)
        const bebidaExistente = bebidas.find(b => padronizar(b.bebida) === nomeBusca && parseFloat(b.preco) === precoNumerico);

        try {
            let res;
            if (bebidaExistente) {
                // Atualiza somando a quantidade
                const novaQtdTotal = parseFloat(bebidaExistente.quantidade) + qtdNova;
                res = await fetch(`http://localhost:3002/api/bebidas/${bebidaExistente.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        quantidade: novaQtdTotal 
                    })
                });
            } else {
                // Cria nova
                res = await fetch('http://localhost:3002/api/bebidas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        bebida: bebidaNome, 
                        quantidade: qtdNova, 
                        preco: precoNumerico 
                    })
                });
            }

            if (res.ok) {
                setBebidaNome('');
                setQuantidade('');
                setPreco('');
                fetchBebidas();
            }
        } catch (error) {
            console.error("Erro ao processar bebida:", error);
        }
    };

    const excluirBebida = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta bebida?")) return;
        try {
            const res = await fetch(`http://localhost:3002/api/bebidas/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchBebidas();
            }
        } catch (error) {
            console.error("Erro ao excluir bebida:", error);
        }
    };

    const salvarEdicaoInline = async (id) => {
        try {
            const res = await fetch(`http://localhost:3002/api/bebidas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formEditando)
            });
            if (res.ok) {
                setIdEditando(null);
                fetchBebidas();
            } else {
                alert("Erro ao atualizar a bebida.");
            }
        } catch (error) {
            console.error("Erro ao atualizar no banco:", error);
        }
    };

    const gastoTotal = bebidas.reduce((total, item) => total + (Number(item.quantidade) * Number(item.preco)), 0);

    return (
        <div className='bebidas-principal'>
            <div className='bebidas-header-container'>
                <h1 className='titulo-bebidas'><FaWineGlassAlt /> Gestão de Bebidas</h1>
                
                <div className='bebidas-card-total'>
                    <div className='card-total-icon'>
                        <FaMoneyBillWave size={30} />
                    </div>
                    <div className='card-total-info'>
                        <span>Custo Total em Estoque</span>
                        <strong>R$ {gastoTotal.toFixed(2)}</strong>
                    </div>
                </div>
            </div>

            <div className='bebidas-container'>
                <div className='bebidas-form-container'>
                    <h2>Adicionar Bebida ao Estoque</h2>
                    <form className='bebidas-form' onSubmit={cadastrarBebida}>
                        <div className='form-group-bebida'>
                            <label>Nome da Bebida</label>
                            <input 
                                type='text' 
                                value={bebidaNome} 
                                onChange={(e) => setBebidaNome(e.target.value)} 
                                placeholder='Ex: Coca Cola 2L'
                                className='input-bebida'
                                required
                            />
                        </div>
                        <div className='form-group-bebida'>
                            <label>Quantidade</label>
                            <input 
                                type='number' 
                                value={quantidade} 
                                onChange={(e) => setQuantidade(e.target.value)} 
                                placeholder='Ex: 20'
                                className='input-bebida'
                                required
                            />
                        </div>
                        <div className='form-group-bebida'>
                            <label>Preço Unitário (R$)</label>
                            <input 
                                type='number' 
                                step='0.01'
                                value={preco} 
                                onChange={(e) => setPreco(e.target.value)} 
                                placeholder='Ex: 8.50'
                                className='input-bebida'
                                required
                            />
                        </div>
                        <button type='submit' className='btn-cadastrar-bebida'>
                            <FaPlus /> Adicionar
                        </button>
                    </form>
                </div>

                <div className='bebidas-lista'>
                    <h2>Bebidas em Estoque</h2>
                    {bebidas.length === 0 ? (
                        <div className='sem-bebidas'>
                            <FaBoxOpen size={40} style={{marginBottom: '10px'}}/>
                            <p>O estoque de bebidas está vazio.</p>
                        </div>
                    ) : (
                        <div className='bebidas-grid'>
                            {bebidas.map(b => (
                                <div key={b.id} className='bebida-card'>
                                    {idEditando === b.id ? (
                                        <div className='bebida-edit-mode'>
                                            <input 
                                                className='input-bebida-edit'
                                                value={formEditando.bebida}
                                                onChange={(e) => setFormEditando({...formEditando, bebida: e.target.value})}
                                            />
                                            <div className='edit-row'>
                                                <input 
                                                    type='number'
                                                    className='input-bebida-edit small'
                                                    value={formEditando.quantidade}
                                                    onChange={(e) => setFormEditando({...formEditando, quantidade: e.target.value})}
                                                    placeholder='Qtd'
                                                />
                                                <input 
                                                    type='number'
                                                    step='0.01'
                                                    className='input-bebida-edit small'
                                                    value={formEditando.preco}
                                                    onChange={(e) => setFormEditando({...formEditando, preco: e.target.value})}
                                                    placeholder='Preço'
                                                />
                                            </div>
                                            <div className='edit-acoes'>
                                                <button className='btn-save' onClick={() => salvarEdicaoInline(b.id)}><FaSave /> Salvar</button>
                                                <button className='btn-cancel' onClick={() => setIdEditando(null)}><FaTimes /> Sair</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className='bebida-icone-wrapper'>
                                                <FaWineGlassAlt size={24} />
                                            </div>
                                            <div className='bebida-info'>
                                                <h3>{b.bebida}</h3>
                                                <div className='bebida-detalhes'>
                                                    <span className='b-qtd'>Estoque: {Number(b.quantidade)} unid.</span>
                                                    <span className='b-preco'>R$ {Number(b.preco).toFixed(2)} /un</span>
                                                </div>
                                            </div>
                                            <div className='bebida-acoes-hover'>
                                                <button className='btn-acao edit' onClick={() => { setIdEditando(b.id); setFormEditando(b); }}><FaEdit /></button>
                                                <button className='btn-acao delete' onClick={() => excluirBebida(b.id)}><FaTrash /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Bebidas
