import { useState, useEffect } from 'react'
import { FaMotorcycle, FaPlus, FaToggleOn, FaToggleOff, FaEdit } from 'react-icons/fa'
import './motoboy.css'

function Motoboy() {
    const [motoboys, setMotoboys] = useState([]);
    const [nome, setNome] = useState('');
    const [comissao, setComissao] = useState('');
    const [motoboyEditando, setMotoboyEditando] = useState(null);
    const [novaComissao, setNovaComissao] = useState('');
    const [mensagem, setMensagem] = useState('');

    const fetchMotoboys = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/motoboy');
            const data = await res.json();
            if (Array.isArray(data)) {
                setMotoboys(data);
            }
        } catch (error) {
            console.error("Erro ao buscar motoboys:", error);
        }
    };

    useEffect(() => {
        fetchMotoboys();
    }, []);

    const cadastrarMotoboy = async (e) => {
        e.preventDefault();
        if (!nome || !comissao) {
            setMensagem('Preencha o nome e a comissão!');
            return;
        }
        try {
            const res = await fetch('http://localhost:3002/api/motoboy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, comissao: parseFloat(comissao) })
            });

            if (res.ok) {
                setNome('');
                setComissao('');
                setMensagem('');
                fetchMotoboys();
            }
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
        }
    };

    const alternarStatus = async (id, statusAtual) => {
        const novoStatus = statusAtual === 'ativo' ? 'inativo' : 'ativo';
        
        // Se estiver reactivando, verificar se tem comissão definida
        if (novoStatus === 'ativo') {
            const motoboy = motoboys.find(m => m.id === id);
            if (!motoboy.comissao || motoboy.comissao === 0) {
                setMotoboyEditando(id);
                setNovaComissao('');
                setMensagem(`Defina a comissão para reativar ${motoboy.nome}`);
                return;
            }
        }

        try {
            const res = await fetch(`http://localhost:3002/api/motoboy/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            if (res.ok) {
                fetchMotoboys();
            }
        } catch (error) {
            console.error("Erro ao alterar status:", error);
        }
    };

    const salvarComissaoReativacao = async (id) => {
        if (!novaComissao || parseFloat(novaComissao) <= 0) {
            setMensagem('Defina um valor de comissão maior que zero');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3002/api/motoboy/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ativo', comissao: parseFloat(novaComissao) })
            });
            
            if (res.ok) {
                setMotoboyEditando(null);
                setNovaComissao('');
                setMensagem('');
                fetchMotoboys();
            }
        } catch (error) {
            console.error("Erro ao salvar comissão:", error);
        }
    };

    const editarComissao = (motoboy) => {
        setMotoboyEditando(motoboy.id);
        setNovaComissao(String(motoboy.comissao || ''));
    };

    const salvarEdicaoComissao = async (id) => {
        if (!novaComissao || parseFloat(novaComissao) < 0) {
            setMensagem('Defina um valor de comissão válido');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3002/api/motoboy/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comissao: parseFloat(novaComissao) })
            });
            
            if (res.ok) {
                setMotoboyEditando(null);
                setNovaComissao('');
                fetchMotoboys();
            }
        } catch (error) {
            console.error("Erro ao salvar comissão:", error);
        }
    };

    return (
        <div className='motoboy-principal'>
            <div className='motoboy-container'>
                <h1 className='titulo-motoboy'><FaMotorcycle /> Gestão de Motoboys</h1>
                
                {mensagem && (
                    <div className='motoboy-mensagem'>
                        {mensagem}
                    </div>
                )}

                <div className='motoboy-form-container'>
                    <h2>Cadastrar Entregador</h2>
                    <form className='motoboy-form' onSubmit={cadastrarMotoboy}>
                        <div className='form-group'>
                            <label>Nome do Motoboy *</label>
                            <input 
                                type='text' 
                                value={nome} 
                                onChange={(e) => setNome(e.target.value)} 
                                placeholder='Ex: João Silva'
                                required
                            />
                        </div>
                        <div className='form-group'>
                            <label>Comissão por Entrega (R$) *</label>
                            <input 
                                type='number' 
                                step='0.01'
                                min='0'
                                value={comissao} 
                                onChange={(e) => setComissao(e.target.value)} 
                                placeholder='5.00'
                                required
                            />
                        </div>
                        <button type='submit' className='btn-cadastrar-motoboy'>
                            <FaPlus /> Cadastrar
                        </button>
                    </form>
                </div>

                <div className='motoboys-lista'>
                    <h2>Entregadores Cadastrados</h2>
                    {motoboys.length === 0 ? (
                        <p className='sem-motoboys'>Nenhum motoboy cadastrado ainda.</p>
                    ) : (
                        <div className='motoboys-grid'>
                            {motoboys.map(m => (
                                <div key={m.id} className={`motoboy-card ${m.status === 'ativo' ? 'ativo' : 'inativo'}`}>
                                    <div className='motoboy-info'>
                                        <h3>{m.nome}</h3>
                                        {motoboyEditando === m.id ? (
                                            <div className='editar-comissao'>
                                                <input 
                                                    type='number' 
                                                    step='0.01'
                                                    min='0'
                                                    value={novaComissao}
                                                    onChange={(e) => setNovaComissao(e.target.value)}
                                                    placeholder='R$ 0,00'
                                                />
                                                <button onClick={() => salvarEdicaoComissao(m.id)}>Salvar</button>
                                                <button onClick={() => setMotoboyEditando(null)}>Cancelar</button>
                                            </div>
                                        ) : (
                                            <>
                                                <p>Comissão: R$ {Number(m.comissao || 0).toFixed(2)}</p>
                                                {m.status === 'ativo' && (
                                                    <button className='btn-editar-comissao' onClick={() => editarComissao(m)}>
                                                        <FaEdit /> Editar Comissão
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className='motoboy-status-toggle' onClick={() => alternarStatus(m.id, m.status)}>
                                        {m.status === 'ativo' ? (
                                            <span className='tag-ativo'><FaToggleOn size={28} color="#2ed573" /> Ativo</span>
                                        ) : (
                                            <span className='tag-inativo'><FaToggleOff size={28} color="#e74c3c" /> Inativo</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal para definir comissão ao reativar */}
                {motoboyEditando && mensagem.includes('Defina a comissão') && (
                    <div className='modal-comissao-overlay'>
                        <div className='modal-comissao'>
                            <h3>Definir Comissão</h3>
                            <p>Para reativar o entregador, defina o valor da comissão por entrega:</p>
                            <input 
                                type='number' 
                                step='0.01'
                                min='0'
                                value={novaComissao}
                                onChange={(e) => setNovaComissao(e.target.value)}
                                placeholder='R$ 0,00'
                                autoFocus
                            />
                            <div className='modal-comissao-botoes'>
                                <button onClick={() => { setMotoboyEditando(null); setMensagem(''); }}>Cancelar</button>
                                <button className='btn-confirmar' onClick={() => salvarComissaoReativacao(motoboyEditando)}>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Motoboy
