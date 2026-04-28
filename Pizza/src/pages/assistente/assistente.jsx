import { useState, useEffect, useRef } from 'react';
import { FiCpu, FiSend, FiChevronDown, FiAlertCircle, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import './assistente.css';

const API = 'http://localhost:4000';
const API1 = 'http://localhost:3002';

function Assistente() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [notificacao, setNotificacao] = useState(null);
  const endRef = useRef();

  // Carrega perfis disponíveis
  useEffect(() => {


    // CARREGAR PERFIS FAZ A REQUISIÇÃO
    // GUARDA EM JSON EM data
    // A VARIÁVEL ATIVOS FILTRA TODOS QUE ESTÃO COM O VALOR BOOLEANO TRUE NO BANCO DE DADOS POSTGRESS E MOSTRA
    // O ESTADO (USE STATE) MOSTRA TODOS QUE ESTÃO DISPONÍVEIS NA CAIXA DE SELEÇÃO DE IA COMO UMA LISTA ARRAY
    // O IF SERVE PARA FILTRAR SE TEM MAIS 1 ATIVOS PARA PODER SELECIONAR QUAL PERFIL DE IA VAI APARECER NA CAIXA DE SELEÇÃO TODA VEZ QUE ENTRAR NO CHAT ASSISTENTE
    const carregarPerfis = async () => {
      try {
        const r = await fetch(`${API1}/api/ia/profiles`);
        const data = await r.json();
        const ativos = data.filter(p => p.id);
        const atual = data.find(a => a.is_active); // pega o que está ativo 
        setProfiles(ativos);
        if (ativos.length > 0) {
          // Tenta pegar o perfil ativo ou o primeiro disponível
          // a IA sugeriu essa linha setSelectedProfileId(atual ? atual.id : ativos[0].id);
          // como o valor é certo e não tem como ele ser desativado vou usar atual.id
          // Quando se procura com find ou filter dentro de uma lista ou json eu ainda tenho que colocar a propriedade que eu quero acessar com o . após a variável para poder usar o valor
          setSelectedProfileId(atual.id);
        }
      } catch (err) {
        console.error("Erro ao carregar perfis:", err);
      }
    };
    carregarPerfis();
  }, []);

  // Carrega histórico salvo no Backend
  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        const r = await fetch(`${API}/api/historico`);
        const data = await r.json();
        if (data.length > 0) {
          setMensagens(data);
        } else {
          setMensagens([{ role: 'assistant', content: 'Olá! Sou o assistente da sua Pizzaria Gourmet 🍕. Como posso ajudar?' }]);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      }
    };
    carregarHistorico();
  }, []);

  const limparConversa = async () => {
    if (!window.confirm("Deseja apagar todo o histórico da conversa?")) return;
    try {
      await fetch(`${API}/api/historico`, { method: 'DELETE' });
      setMensagens([{ role: 'assistant', content: 'Histórico apagado. Como posso ajudar agora?' }]);
      setNotificacao("Conversa reiniciada");
      setTimeout(() => setNotificacao(null), 3000);
    } catch (err) {
      console.error("Erro ao limpar histórico:", err);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);


  // handleProfileChange = selecionar perfil do modelo IA
  const selecionarPerfilIA = async (id) => {
    const numericId = Number(id);
    setSelectedProfileId(numericId);
    const profile = profiles.find(p => p.id === numericId);

    if (profile) {
      try {
        /// Quando selecionar o perfil vai buscar o que estava ativo anteriomente para desativar ele
        // Crie um objeto para pegar em lista o primeiro perfil ativo para guardar os dados no obj desativarperfil para usar para fazer requisição
        // API para desativar

        async function getPerfil() {
          const buscarperfis = await fetch(`${API1}/api/ia/profiles`);
          const dadosperfis = await buscarperfis.json();
          const perfilAtivoAtual = dadosperfis.find(p => p.is_active);
          return { dadosperfis, perfilAtivoAtual }
        }
        const getperfiluser = await getPerfil();
        if (getperfiluser.perfilAtivoAtual.id !== numericId) {

          const desativarperfil = {
            name: getperfiluser.perfilAtivoAtual.name,
            provider: getperfiluser.perfilAtivoAtual.provider,
            model: getperfiluser.perfilAtivoAtual.model,
            api_key: getperfiluser.perfilAtivoAtual.api_key,
            base_url: getperfiluser.perfilAtivoAtual.base_url,
            is_active: false
          }

          const res = await fetch(`http://localhost:3002/api/ia/profiles/${getperfiluser.perfilAtivoAtual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(desativarperfil)
          });


          if (res.ok) {
            const acharperfil = getperfiluser.dadosperfis.find(p => p.id === numericId);
            const ativarperfil = {
              name: acharperfil.name,
              provider: acharperfil.provider,
              model: acharperfil.model,
              api_key: acharperfil.api_key,
              base_url: acharperfil.base_url,
              is_active: true
            }

            const res = await fetch(`http://localhost:3002/api/ia/profiles/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ativarperfil)
            })


          } else {
            alert("Erro ao Ativar.");
          }
        }
      }
      catch (error) {
        console.error("Erro no servidor!!:", error);

      }




    }


    setNotificacao(`IA alterada para: ${profile.name}`);

    setTimeout(() => setNotificacao(null), 3000);
  };


  const enviar = async () => {


    async function getPerfil() {
      const buscarperfis = await fetch(`${API1}/api/ia/profiles`);
      const dadosperfis = await buscarperfis.json();
      const perfilAtivoAtual = dadosperfis.find(p => p.is_active);
      return { dadosperfis, perfilAtivoAtual }
    }
    const getperfiluser = await getPerfil();


    const texto = input.trim();
    if (!texto || carregando) return;

    const novasMsgs = [...mensagens, { role: 'user', content: texto }];
    setMensagens(novasMsgs);
    setInput('');
    setCarregando(true);

    try {
      const res = await fetch(`${API}/api/assistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: texto,
        }),
      });
      console.log(novasMsgs)
      const data = await res.json();

      if (res.status !== 200 || data.erro_config) {
        setMensagens(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Erro no Assistente: ${data.resposta || 'Falha na comunicação com a IA.'}`
        }]);
      } else {
        setMensagens(prev => [...prev, { role: 'assistant', content: data.resposta }]);
      }
    } catch (err) {
      setMensagens(prev => [...prev, { role: 'assistant', content: '❌ Erro crítico: O servidor não respondeu. Verifique se o backend está ativo.' }]);
    } finally {
      setCarregando(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <div className="header-info">
          <FiCpu size={20} className="icon-main" />
          <div>
            <span className="chat-titulo">Assistente IA</span>
            <span className="chat-sub">
              {selectedProfile ? `Usando ${selectedProfile.name}` : 'Aguardando servidor...'}
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="header-actions">
          <button className="btn-limpar" onClick={limparConversa} title="Limpar Conversa">
            <FiTrash2 size={18} />
          </button>
        </div>

        {/* Notificação Temporária */}
        {notificacao && (
          <div className="chat-toast">
            <FiCheckCircle /> {notificacao}
          </div>
        )}

        {/* Seletor de Perfil IA */}
        <div className="profile-selector-wrapper">
          <select
            className={`profile-select ${selectedProfile?.provider}`}
            value={selectedProfileId || ''}
            onChange={(e) => selecionarPerfilIA(e.target.value)}
          >
            {profiles.length === 0 && <option value="">Carregando...</option>}
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.provider})
              </option>
            ))}
          </select>
          <FiChevronDown className="select-arrow" />
        </div>
      </div>

      <div className="chat-mensagens">
        {mensagens.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            {m.role === 'assistant' && (
              <div className="chat-avatar"><FiCpu size={14} /></div>
            )}
            <div className="chat-bubble">
              <div className="chat-text">{m.content}</div>
            </div>
          </div>
        ))}
        {carregando && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-avatar"><FiCpu size={14} /></div>
            <div className="chat-bubble chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          rows={2}
          placeholder={selectedProfile ? `Perguntar ao ${selectedProfile.name}...` : "Configure uma IA para começar"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!selectedProfileId}
        />
        <button
          className="btn-enviar"
          onClick={enviar}
          disabled={carregando || !input.trim() || !selectedProfileId}
        >
          <FiSend size={18} />
        </button>
      </div>
    </div>
  );
}

export default Assistente;
