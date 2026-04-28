import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaBorderNone } from 'react-icons/fa';
import './bordas.css';

function Bordas() {
    const [bordas, setBordas] = useState([]);
    const [materiais, setMateriais] = useState([]);

    // Form de cadastro / edição
    const [form, setForm] = useState({ nome: '', valor_adicional: '' });
    const [ingredientes, setIngredientes] = useState([]); // ficha técnica
    const [editandoId, setEditandoId] = useState(null);

    // Campo para adicionar ingrediente
    const [novoIng, setNovoIng] = useState({ material_id: '', quantidade: '', unidade: 'g' });

    const UNIDADES = ['g', 'kg', 'ml', 'l', 'un', 'mg'];

    // ──────────────── Carregamento ────────────────
    const carregarDados = async () => {
        try {
            const [resBordas, resMat] = await Promise.all([
                fetch('http://localhost:3002/api/bordas'),
                fetch('http://localhost:3002/api/material')
            ]);
            const bordaData = await resBordas.json();
            const matData   = await resMat.json();
            setBordas(Array.isArray(bordaData) ? bordaData : []);
            setMateriais(Array.isArray(matData) ? matData : []);
        } catch (err) {
            console.error('Erro ao carregar bordas:', err);
        }
    };

    useEffect(() => { carregarDados(); }, []);

    // ──────────────── Ingredientes ────────────────
    const adicionarIngrediente = () => {
        if (!novoIng.material_id || !novoIng.quantidade) return;
        const mat = materiais.find(m => m.id.toString() === novoIng.material_id.toString());
        setIngredientes(prev => [
            ...prev,
            {
                material_id: parseInt(novoIng.material_id),
                material_nome: mat?.nome || '?',
                quantidade: parseFloat(novoIng.quantidade),
                unidade: novoIng.unidade
            }
        ]);
        setNovoIng({ material_id: '', quantidade: '', unidade: 'g' });
    };

    const removerIngrediente = (idx) => {
        setIngredientes(prev => prev.filter((_, i) => i !== idx));
    };

    // ──────────────── Salvar ────────────────
    const salvar = async () => {
        if (!form.nome.trim()) return alert('Informe o nome da borda.');

        const payload = {
            nome: form.nome,
            valor_adicional: parseFloat(form.valor_adicional) || 0,
            ingredientes
        };

        try {
            if (editandoId) {
                await fetch(`http://localhost:3002/api/bordas/${editandoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('http://localhost:3002/api/bordas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            resetForm();
            carregarDados();
        } catch (err) {
            console.error('Erro ao salvar borda:', err);
        }
    };

    const resetForm = () => {
        setForm({ nome: '', valor_adicional: '' });
        setIngredientes([]);
        setEditandoId(null);
    };

    const iniciarEdicao = (borda) => {
        setEditandoId(borda.id);
        setForm({ nome: borda.nome, valor_adicional: borda.valor_adicional });
        setIngredientes(Array.isArray(borda.ingredientes) ? borda.ingredientes : []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deletar = async (id) => {
        if (!window.confirm('Deseja excluir esta borda?')) return;
        await fetch(`http://localhost:3002/api/bordas/${id}`, { method: 'DELETE' });
        carregarDados();
    };

    // ──────────────── Render ────────────────
    return (
        <div className="bordas-principal">

            {/* ── Formulário ── */}
            <div className="bordas-form-container">
                <h1 className="bordas-titulo">
                    <FaBorderNone />
                    {editandoId ? 'Editar Borda' : 'Nova Borda'}
                </h1>

                <div className="bordas-form-grid">
                    <div className="bordas-field">
                        <label>Nome da Borda</label>
                        <input
                            type="text"
                            placeholder="Ex: Catupiry Original"
                            value={form.nome}
                            onChange={e => setForm({ ...form, nome: e.target.value })}
                        />
                    </div>
                    <div className="bordas-field">
                        <label>Valor Adicional (R$)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.50"
                            placeholder="0,00"
                            value={form.valor_adicional}
                            onChange={e => setForm({ ...form, valor_adicional: e.target.value })}
                        />
                    </div>
                </div>

                {/* Ficha Técnica — Ingredientes */}
                <div className="bordas-ficha">
                    <h2 className="bordas-subtitulo">Ficha Técnica de Ingredientes</h2>
                    <p className="bordas-hint">
                        Defina quais materiais do estoque serão consumidos ao usar esta borda em um pedido.
                    </p>

                    <div className="bordas-add-ing">
                        <select
                            value={novoIng.material_id}
                            onChange={e => setNovoIng({ ...novoIng, material_id: e.target.value })}
                        >
                            <option value="">Selecionar material...</option>
                            {materiais.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Qtd"
                            value={novoIng.quantidade}
                            onChange={e => setNovoIng({ ...novoIng, quantidade: e.target.value })}
                        />
                        <select
                            value={novoIng.unidade}
                            onChange={e => setNovoIng({ ...novoIng, unidade: e.target.value })}
                        >
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button type="button" className="btn-add-ing" onClick={adicionarIngrediente}>
                            <FaPlus /> Adicionar
                        </button>
                    </div>

                    {ingredientes.length > 0 ? (
                        <div className="bordas-lista-ings">
                            {ingredientes.map((ing, i) => (
                                <div key={i} className="bordas-ing-item">
                                    <span className="ing-mat-nome">{ing.material_nome}</span>
                                    <span className="ing-mat-qtd">{ing.quantidade} {ing.unidade}</span>
                                    <button className="btn-remover-ing" onClick={() => removerIngrediente(i)}>
                                        <FaTimes />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="bordas-ing-vazio">Nenhum ingrediente adicionado ainda.</p>
                    )}
                </div>

                <div className="bordas-acoes">
                    {editandoId && (
                        <button className="btn-borda-cancelar" onClick={resetForm}>
                            <FaTimes /> Cancelar
                        </button>
                    )}
                    <button className="btn-borda-salvar" onClick={salvar}>
                        <FaSave /> {editandoId ? 'Salvar Alterações' : 'Cadastrar Borda'}
                    </button>
                </div>
            </div>

            {/* ── Lista de Bordas ── */}
            <div className="bordas-lista-container">
                <h2 className="bordas-lista-titulo">Bordas Cadastradas</h2>

                {bordas.length === 0 ? (
                    <p className="bordas-vazio">Nenhuma borda cadastrada ainda.</p>
                ) : (
                    <div className="bordas-grid">
                        {bordas.map(borda => (
                            <div key={borda.id} className="borda-card">
                                <div className="borda-card-header">
                                    <div>
                                        <span className="borda-card-nome">{borda.nome}</span>
                                        <span className="borda-card-valor">
                                            {Number(borda.valor_adicional) === 0
                                                ? 'Sem adicional'
                                                : `+ R$ ${Number(borda.valor_adicional).toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="borda-card-btns">
                                        <button onClick={() => iniciarEdicao(borda)} title="Editar">
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => deletar(borda.id)} title="Excluir" className="btn-del">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>

                                {Array.isArray(borda.ingredientes) && borda.ingredientes.length > 0 ? (
                                    <div className="borda-card-ings">
                                        <span className="borda-card-ings-label">Ingredientes:</span>
                                        <div className="borda-ing-tags">
                                            {borda.ingredientes.map((ing, i) => (
                                                <span key={i} className="ing-tag">
                                                    {ing.material_nome} · {ing.quantidade}{ing.unidade}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="borda-sem-ings">Sem ficha técnica definida</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Bordas;
