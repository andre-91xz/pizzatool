import { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiAlertTriangle, FiCpu, FiGlobe, FiCheckCircle } from 'react-icons/fi';
import './configuracoes.css';

const API = 'http://localhost:3002';

const MODELOS_SUGESTAO = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter: ['qwen/qwen3-coder:free', 'anthropic/claude-3-haiku', 'google/gemini-2.0-flash-lite:free']
};

function Configuracoes() {
  const [profiles, setProfiles] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [confirmLimpar, setConfirmLimpar] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [notificacao, setNotificacao] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/ia/profiles`);
        const data = await r.json();
        setProfiles(data);
      } catch (err) {
        console.error("Erro ao carregar perfis:", err);
      }
    };
    load();
  }, []);

  const salvarPerfil = async (profile) => {
    setSalvando(true);
    try {
      await fetch(`${API}/api/ia/profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      setSuccessId(profile.id);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      alert("Erro ao salvar perfil");
    } finally {
      setSalvando(false);
    }
  };

  const updateProfile = async (id, field, value) => {
    // 1. Se o usuário estiver marcando a caixinha como ATIVA (true)
    if (field === 'is_active' && value === true) {
      // Encontra qual era o perfil que estava ativo antes de clicar
      const perfilAnterior = profiles.find(p => p.is_active && p.id !== id);

      // Se existia um perfil ativo antes, manda um aviso pro banco desativar ele
      if (perfilAnterior) {
        try {
          await fetch(`${API}/api/ia/profiles/${perfilAnterior.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...perfilAnterior, is_active: false }), // Mandando como false
          });
        } catch (err) {
          console.error("Erro ao desativar o perfil anterior no banco:", err);
        }
      }
    }

    // 2. Atualiza o visual no React (Local State)
    setProfiles(prev => {
      const novosProfiles = prev.map(p => {
        if (field === 'is_active' && value === true) {
          return p.id === id ? { ...p, [field]: value } : { ...p, [field]: false };
        }
        return p.id === id ? { ...p, [field]: value } : p;
      });

      const profileAtivado = novosProfiles.find(p => p.id === id && field === 'is_active' && value === true);

      if (profileAtivado) {
        // Atualiza o localStorage
        localStorage.setItem('foco-ia-ativa', JSON.stringify(profileAtivado));

        // Notificação visual
        setNotificacao(`IA alterada para: ${profileAtivado.name}`);
        setTimeout(() => setNotificacao(null), 3000);

        // EXTRA: Já salva o NOVO perfil ativo no banco automaticamente para você
        // não precisar clicar no botão "Salvar" só para a caixinha!
        fetch(`${API}/api/ia/profiles/${profileAtivado.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileAtivado),
        }).catch(err => console.error("Erro ao salvar o novo perfil:", err));
      }

      return novosProfiles;
    });
  };



  const limparBanco = async () => {
    setLimpando(true);
    try {
      await fetch(`${API}/api/dados`, { method: 'DELETE' });
      alert('Dados limpos com sucesso!');
    } catch {
      alert('Erro ao limpar dados.');
    } finally {
      setLimpando(false);
      setConfirmLimpar(false);
    }
  };

  return (
    <div className="cfg-wrapper">
      <div className="cfg-header-main">
        <h1 className="cfg-titulo"><FiSettings /> Configurações do Sistema</h1>
        <p className="cfg-subtitle">Gerencie seus motores de IA e dados operacionais.</p>
      </div>
      {/* Notificação Temporária */}
      {notificacao && (
        <div className="chat-toast">
          <FiCheckCircle /> {notificacao}
        </div>
      )}
      <div className="cfg-grid-ia">
        {profiles.map((p, idx) => (
          <div className={`cfg-card ia-profile-card ${p.provider}`} key={p.id}>
            <div className="ia-card-header">
              <div>
                <div className="ia-badge">{p.provider.toUpperCase()}</div>
                <h2>{p.name || `IA #${idx + 1}`}</h2>
              </div>
            </div>

            <div className="cfg-fields">
              <div className="cfg-field">
                <label>Modelo da IA</label>
                <input
                  type="text"
                  list={`models-${p.id}`}
                  value={p.model}
                  onChange={e => updateProfile(p.id, 'model', e.target.value)}
                  placeholder="Selecione ou digite o modelo..."
                />
                <datalist id={`models-${p.id}`}>
                  {(MODELOS_SUGESTAO[p.provider] || []).map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div className="cfg-field">
                <label>Chave de API</label>
                <div className="api-key-container">
                  <input
                    type="password"
                    value={p.api_key}
                    onChange={e => updateProfile(p.id, 'api_key', e.target.value)}
                    placeholder="Cole sua chave aqui (sk-...)"
                  />
                </div>
              </div>

              <div className="cfg-field">
                <label className="switch-label">
                  <span className="label-text">Usar este perfil como padrão</span>
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    onChange={e => updateProfile(p.id, 'is_active', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="ia-card-footer">
              {successId === p.id && <span className="msg-success"><FiCheckCircle /> Alterações Salvas</span>}
              <button className="btn-salvar-ia" onClick={() => salvarPerfil(p)} disabled={salvando}>
                <FiSave /> Salvar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Zona de perigo */}
      <div className="cfg-card cfg-danger-zone">
        <h2 className="cfg-section-title danger">⚠ Zona de Perigo</h2>
        <div className="danger-content">
          <p>
            Esta ação apagará permanentemente todos os pedidos, materiais, entregadores, bebidas e demais dados operacionais.
            <strong> Esta ação não pode ser desfeita.</strong>
          </p>
          <button className="btn-limpar-banco" onClick={() => setConfirmLimpar(true)}>
            <FiAlertTriangle /> Limpar Todos os Dados do Sistema
          </button>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmLimpar && (
        <div className="cfg-modal-overlay" onClick={() => setConfirmLimpar(false)}>
          <div className="cfg-modal" onClick={e => e.stopPropagation()}>
            <h3>⚠ Confirmar Exclusão Total?</h3>
            <p>Todos os registros operacionais serão removidos. O perfil da pizzaria e as configurações de IA serão preservados.</p>
            <div className="cfg-modal-btns">
              <button className="btn-cfg-cancelar" onClick={() => setConfirmLimpar(false)}>Manter Dados</button>
              <button className="btn-cfg-confirmar" onClick={limparBanco} disabled={limpando}>
                {limpando ? 'Limpando...' : 'Sim, apagar tudo'}
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
}

export default Configuracoes;
