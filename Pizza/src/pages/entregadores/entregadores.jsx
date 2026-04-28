import { useState, useEffect } from 'react';
import { FaTruck, FaPlus, FaCheck, FaClock, FaTimes, FaPencilAlt, FaSave, FaUndo, FaPercentage } from 'react-icons/fa';
import './entregadores.css';

const API = 'http://localhost:3002';

function Entregadores() {
  const [entregadores, setEntregadores] = useState([]);
  const [form, setForm] = useState({ nome: '', celular: '', veiculo: '', comissao: '' });
  const [confirmDesligar, setConfirmDesligar] = useState(null);

  // Edição inline de comissão
  const [editando, setEditando] = useState(null); // { id, campo }
  const [editValor, setEditValor] = useState('');

  // Modal de reativação com comissão obrigatória
  const [modalReativar, setModalReativar] = useState(null); // { id, nome }
  const [comissaoReativar, setComissaoReativar] = useState('');

  const carregar = async () => {
    const res = await fetch(`${API}/api/motoboy`);
    const data = await res.json();
    setEntregadores(Array.isArray(data) ? data : []);
  };

  useEffect(() => { carregar(); }, []);

  const cadastrar = async () => {
    if (!form.nome.trim()) return;
    await fetch(`${API}/api/motoboy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        comissao: parseFloat(form.comissao) || 0,
        status: 'ativo',
        data_entrada: new Date().toISOString().split('T')[0],
      }),
    });
    setForm({ nome: '', celular: '', veiculo: '', comissao: '' });
    carregar();
  };

  const mudarStatus = async (id, status) => {
    await fetch(`${API}/api/motoboy/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    carregar();
  };

  // Reativar um entregador desligado — exige comissão
  const abrirReativar = (entregador) => {
    setComissaoReativar(entregador.comissao ?? '');
    setModalReativar({ id: entregador.id, nome: entregador.nome });
  };

  const confirmarReativar = async () => {
    if (comissaoReativar === '' || isNaN(parseFloat(comissaoReativar))) return;
    await fetch(`${API}/api/motoboy/${modalReativar.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ativo',
        comissao: parseFloat(comissaoReativar),
        data_saida: null,
      }),
    });
    setModalReativar(null);
    setComissaoReativar('');
    carregar();
  };

  const desligar = async (id) => {
    await fetch(`${API}/api/motoboy/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'desligado',
        data_saida: new Date().toISOString().split('T')[0],
      }),
    });
    setConfirmDesligar(null);
    carregar();
  };

  // Salvar edição inline de comissão
  const salvarEdicao = async (id) => {
    await fetch(`${API}/api/motoboy/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comissao: parseFloat(editValor) || 0 }),
    });
    setEditando(null);
    setEditValor('');
    carregar();
  };

  const ativas = entregadores.filter(e => e.status !== 'desligado');
  const desligados = entregadores.filter(e => e.status === 'desligado');

  return (
    <div className="ent-wrapper">

      {/* Form cadastro */}
      <div className="ent-form-card">
        <h1 className="ent-titulo"><FaTruck /> Entregadores</h1>
        <div className="ent-form">
          <div className="ent-field">
            <label>Nome</label>
            <input placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="ent-field">
            <label>Celular</label>
            <input placeholder="(00) 00000-0000" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} />
          </div>
          <div className="ent-field">
            <label>Veículo</label>
            <input placeholder="Moto, Bike..." value={form.veiculo} onChange={e => setForm({ ...form, veiculo: e.target.value })} />
          </div>
          <div className="ent-field ent-field-comissao">
            <label>Comissão (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.comissao}
              onChange={e => setForm({ ...form, comissao: e.target.value })}
            />
          </div>
          <button className="btn-ent-add" onClick={cadastrar}><FaPlus /> Cadastrar</button>
        </div>
      </div>

      {/* Lista ativos/inativos */}
      <div className="ent-section">
        <h2 className="ent-section-titulo">Equipe</h2>
        {ativas.length === 0 && <p className="ent-vazio">Nenhum entregador cadastrado.</p>}
        <div className="ent-grid">
          {ativas.map(e => (
            <div key={e.id} className={`ent-card ent-${e.status || 'ativo'}`}>
              <div className="ent-card-info">
                <span className="ent-nome">{e.nome}</span>
                <span className="ent-sub">{e.celular} · {e.veiculo}</span>
                {e.data_entrada && (
                  <span className="ent-data">Desde {new Date(e.data_entrada).toLocaleDateString('pt-BR')}</span>
                )}

                {/* Comissão editável */}
                <div className="ent-comissao-row">
                  <FaPercentage className="ent-comissao-icon" />
                  {editando === e.id ? (
                    <>
                      <input
                        className="ent-comissao-input"
                        type="number"
                        min="0"
                        step="0.01"
                        autoFocus
                        value={editValor}
                        onChange={ev => setEditValor(ev.target.value)}
                        onKeyDown={ev => { if (ev.key === 'Enter') salvarEdicao(e.id); if (ev.key === 'Escape') setEditando(null); }}
                      />
                      <button className="btn-comissao-salvar" title="Salvar" onClick={() => salvarEdicao(e.id)}><FaSave /></button>
                      <button className="btn-comissao-cancelar" title="Cancelar" onClick={() => setEditando(null)}><FaTimes /></button>
                    </>
                  ) : (
                    <>
                      <span className="ent-comissao-valor">
                        {e.comissao != null ? `R$ ${parseFloat(e.comissao).toFixed(2)}` : 'Não definida'}
                      </span>
                      <button
                        className="btn-comissao-editar"
                        title="Editar comissão"
                        onClick={() => { setEditando(e.id); setEditValor(e.comissao ?? ''); }}
                      >
                        <FaPencilAlt />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="ent-acoes">
                <button
                  className={`btn-status-ent ativo${e.status === 'ativo' ? ' sel' : ''}`}
                  onClick={() => mudarStatus(e.id, 'ativo')}
                  title="Ativo"
                >
                  <FaCheck />
                </button>
                <button
                  className={`btn-status-ent inativo${e.status === 'inativo' ? ' sel' : ''}`}
                  onClick={() => mudarStatus(e.id, 'inativo')}
                  title="Inativo"
                >
                  <FaClock />
                </button>
                <button
                  className="btn-status-ent desligar"
                  onClick={() => setConfirmDesligar(e.id)}
                  title="Desligar"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desligados */}
      {desligados.length > 0 && (
        <div className="ent-section">
          <h2 className="ent-section-titulo">Desligados</h2>
          <div className="ent-grid">
            {desligados.map(e => (
              <div key={e.id} className="ent-card ent-desligado">
                <div className="ent-card-info">
                  <span className="ent-nome">{e.nome}</span>
                  <span className="ent-sub">{e.celular}</span>
                  <span className="ent-data">
                    {e.data_entrada && `Entrou: ${new Date(e.data_entrada).toLocaleDateString('pt-BR')}`}
                    {e.data_saida && ` · Saiu: ${new Date(e.data_saida).toLocaleDateString('pt-BR')}`}
                  </span>
                  {e.relatorio_ia && (
                    <p className="ent-relatorio-ia">{e.relatorio_ia}</p>
                  )}
                </div>
                <div className="ent-acoes">
                  <button
                    className="btn-status-ent reativar"
                    onClick={() => abrirReativar(e)}
                    title="Reativar"
                  >
                    <FaUndo />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal confirmação de desligamento */}
      {confirmDesligar && (
        <div className="ent-modal-overlay" onClick={() => setConfirmDesligar(null)}>
          <div className="ent-modal" onClick={e => e.stopPropagation()}>
            <h3>Desligar Entregador?</h3>
            <p>Esta ação registrará a data de saída e marcará o entregador como desligado.</p>
            <div className="ent-modal-btns">
              <button className="btn-ent-cancelar" onClick={() => setConfirmDesligar(null)}>Cancelar</button>
              <button className="btn-ent-confirmar" onClick={() => desligar(confirmDesligar)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reativação com comissão obrigatória */}
      {modalReativar && (
        <div className="ent-modal-overlay" onClick={() => setModalReativar(null)}>
          <div className="ent-modal ent-modal-reativar" onClick={e => e.stopPropagation()}>
            <div className="ent-modal-reativar-icon"><FaUndo /></div>
            <h3>Reativar {modalReativar.nome}</h3>
            <p>Informe a comissão por entrega para reativar este entregador.</p>
            <div className="ent-modal-comissao-field">
              <label>Comissão por entrega (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 5,00"
                value={comissaoReativar}
                autoFocus
                onChange={e => setComissaoReativar(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmarReativar(); }}
              />
            </div>
            <div className="ent-modal-btns">
              <button className="btn-ent-cancelar" onClick={() => setModalReativar(null)}>Cancelar</button>
              <button
                className="btn-ent-reativar"
                onClick={confirmarReativar}
                disabled={comissaoReativar === '' || isNaN(parseFloat(comissaoReativar))}
              >
                <FaCheck /> Reativar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Entregadores;
