import { useState } from 'react'
import { FaMapMarkerAlt, FaPlus, FaRoute, FaTrash } from 'react-icons/fa'
import './rotas.css'

function Rotas() {
    const [rotas, setRotas] = useState([]);
    const [valorInput, setValorInput] = useState('');

    const handleValorChange = (e) => {
        let valor = e.target.value.replace(/\D/g, "");
        if (valor === "") {
            setValorInput("");
            return;
        }
        const valorDecimal = Number(valor) / 100;
        const valorFormatado = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(valorDecimal);
        setValorInput(valorFormatado);
    };

    const cadastrarRota = () => {
        const bairro = document.getElementById('rota-bairro').value.trim();
        
        if (!bairro || !valorInput) return;

        const novaRota = {
            id: Date.now(),
            bairro,
            valor: valorInput
        };

        setRotas(prev => [novaRota, ...prev]);

        document.getElementById('rota-bairro').value = '';
        setValorInput('');
    };

    const removerRota = (id) => {
        setRotas(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className='rotas-principal'>
            
            {/* Coluna 1: Lista de Rotas */}
            <div className='rotas-lista'>
                <h1 className='titulo-rota'><FaRoute /> Rotas de Entrega</h1>
                
                {rotas.length === 0 ? (
                    <p style={{ color: '#4e535f', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
                        Nenhuma rota cadastrada no momento.
                    </p>
                ) : (
                    rotas.map(rota => (
                        <div key={rota.id} className='rota-card'>
                            <div className='rota-info-wrapper'>
                                <div className='rota-icon-wrapper'>
                                    <FaMapMarkerAlt />
                                </div>
                                <div className='rota-nome'>{rota.bairro}</div>
                            </div>
                            
                            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                <div className='rota-valor'>{rota.valor}</div>
                                <button 
                                    style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer'}} 
                                    onClick={() => removerRota(rota.id)}
                                >
                                    <FaTrash size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Coluna 2: Cadastrar Rota */}
            <div className='rotas-cadastro'>
                <h2 className='titulo-rota'><FaPlus /> Cadastrar Nova Rota</h2>
                
                <form className='form-rota'>
                    <label className='label-rota'>Nome do Bairro</label>
                    <input type='text' id='rota-bairro' className='input-rota' placeholder='Ex: Centro, Vila Nova...' />

                    <label className='label-rota'>Valor da Entrega</label>
                    <input 
                        type='text' 
                        value={valorInput}
                        onChange={handleValorChange}
                        className='input-rota' 
                        placeholder='R$ 0,00' 
                    />

                    <button type='button' className='btn-rota-add' onClick={cadastrarRota}>
                        <FaPlus /> Adicionar Rota
                    </button>
                </form>
            </div>

        </div>
    )
}

export default Rotas
