import { useState, useEffect } from 'react';
import { FiUser, FiSave, FiInstagram } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import './perfil.css';

const API = 'http://localhost:3002';

function Perfil() {
  const [perfil, setPerfil] = useState({ nome_pizzaria: '', instagram: '', whatsapp: '' });
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);

  const carregar = async () => {
    try {
      const res = await fetch(`${API}/api/perfil`);
      const data = await res.json();
      if (data) {
        setPerfil(data);
      }
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      await fetch(`${API}/api/perfil`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_pizzaria: perfil.nome_pizzaria,
          instagram: perfil.instagram,
          whatsapp: perfil.whatsapp
        })
      });
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="perfil-wrapper">
      <div className="perfil-glass-container">
        <header className="perfil-header">
          <div className="perfil-title-group">
            <h1 className="perfil-main-title">Identidade da Marca</h1>
            <p className="perfil-subtitle">Sincronize o nome e contatos oficiais do seu delivery</p>
          </div>
          <div className="perfil-icon-circle">
            <FiUser />
          </div>
        </header>

        <main className="perfil-content">
          <section className="perfil-form-section">
            <div className="form-grid">
              <div className="premium-input-group">
                <label>Nome da Pizzaria</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Ex: Pizzaria Napoli"
                    value={perfil.nome_pizzaria || ''}
                    onChange={e => setPerfil({ ...perfil, nome_pizzaria: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="premium-input-group">
                  <label><FiInstagram /> Instagram</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="https://instagram.com/suapizzaria"
                      value={perfil.instagram || ''}
                      onChange={e => setPerfil({ ...perfil, instagram: e.target.value })}
                    />
                  </div>
                </div>

                <div className="premium-input-group">
                  <label><FaWhatsapp /> WhatsApp</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="5511999999999"
                      value={perfil.whatsapp || ''}
                      onChange={e => setPerfil({ ...perfil, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="perfil-footer">
          <div className="status-message">
            {ok && <span className="save-toast">✓ Alterações sincronizadas com sucesso</span>}
          </div>
          <button 
            className={`btn-save-perfil ${salvando ? 'loading' : ''}`} 
            onClick={salvar} 
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : <><FiSave /> Sincronizar Dados</>}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Perfil;
