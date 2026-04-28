import { useState, useEffect, useRef } from 'react';
import { FaBookOpen, FaFilePdf, FaPrint, FaImage, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import './cardapio.css';

const API = 'http://localhost:3002';

// Ingredientes a ocultar no cardápio público
const OCULTAR = ['azeitona', 'azeite'];

const ocultarIngrediente = (nome) =>
  !OCULTAR.some(o => (nome || '').toLowerCase().includes(o));

function Cardapio() {
  const [pizzas, setPizzas] = useState([]);
  const [perfil, setPerfil] = useState({ nome_pizzaria: 'Sua Pizzaria', instagram: '', whatsapp: '' });
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [resCardapio, resPerfil] = await Promise.all([
          fetch(`${API}/api/cardapio`),
          fetch(`${API}/api/perfil`)
        ]);
        
        if (resCardapio.ok) {
          const data = await resCardapio.json();
          setPizzas(Array.isArray(data) ? data : []);
        }
        
        if (resPerfil.ok) {
          const data = await resPerfil.json();
          if (data && data.nome_pizzaria) {
            setPerfil(data);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, []);

  // Agrupa por categoria, depois por tamanho
  const grupos = pizzas.reduce((acc, pizza) => {
    const cat = pizza.categoria || 'Especial';
    if (!acc[cat]) acc[cat] = {};
    
    // Fallback: se tamanho for nulo (pizzas antigas), tenta pegar da receita_ui
    const ui = pizza.receita_ui || {};
    const ingMassa = ui.ingredientesLista?.find(i => i.categoria === 'massas');
    const tam = pizza.tamanho || (ingMassa ? `${ingMassa.pedacos} Pedaços` : '8 Pedaços');

    if (!acc[cat][tam]) acc[cat][tam] = [];
    acc[cat][tam].push(pizza);
    return acc;
  }, {});

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#F5F0E6',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('cardapio-pizzaria.pdf');
    } catch (e) {
      console.error('Erro ao exportar PDF:', e);
      alert('Erro ao gerar PDF.');
    } finally {
      setExportando(false);
    }
  };

  const exportarPNG = async () => {
    setExportando(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        backgroundColor: '#F5F0E6',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'cardapio-pizzaria.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Erro ao exportar PNG:', e);
      alert('Erro ao gerar PNG.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="cd-wrapper">
      <div className="cd-topbar">
        <h1 className="cd-titulo"><FaBookOpen /> Gestão de Cardápio</h1>
        <div className="cd-acoes">
          <button className="btn-cd-pdf" onClick={exportarPDF} disabled={exportando}>
            <FaFilePdf /> {exportando ? '...' : 'Exportar PDF'}
          </button>
          <button className="btn-cd-png" onClick={exportarPNG} disabled={exportando}>
            <FaImage /> {exportando ? '...' : 'Salvar Imagem'}
          </button>
          <button className="btn-cd-imprimir" onClick={() => window.print()}>
            <FaPrint /> Imprimir
          </button>
        </div>
      </div>

      {carregando && <p className="cd-loading">Preparando a experiência culinária...</p>}

      <div className="cd-print-area" ref={printRef} id="cardapio-print">
        {/* Header simplificado sem imagens */}
        <div className="cd-header-simple">
          <div className="cd-ornament-top"></div>
          <div className="cd-brand-center">
            <h2 className="cd-nome-pizzaria-main">{perfil.nome_pizzaria}</h2>
            <div className="cd-divider-elegant">
              <span className="dot"></span>
              <span className="line"></span>
              <span className="dot"></span>
            </div>
            <p className="cd-slogan-minimal">TRADIÇÃO & QUALIDADE</p>
          </div>
          <div className="cd-ornament-bottom"></div>
        </div>

        <div className="cd-main-content">
          <div className="cd-social-bar">
            {perfil.instagram && <span><FaInstagram /> {perfil.instagram.split('/').pop()}</span>}
            {perfil.whatsapp && <span><FaWhatsapp /> {perfil.whatsapp}</span>}
          </div>

          {pizzas.length === 0 && !carregando ? (
            <div className="cd-vazio">
              <p>O cardápio está sendo preparado pelo chef.</p>
            </div>
          ) : (
            <div className="cd-menu-columns">
              {Object.entries(grupos).map(([categoria, tamanhos], catIdx) => (
                <div key={categoria} className="cd-category-group" style={{ animationDelay: `${catIdx * 0.1}s` }}>
                  <div className="cd-category-header">
                    <span className="decoration left"></span>
                    <h3 className="cd-category-title">{categoria}</h3>
                    <span className="decoration right"></span>
                  </div>

                  {Object.entries(tamanhos).map(([tamanho, pizzasDo]) => (
                    <div key={tamanho} className="cd-size-block">
                      <div className="cd-size-header">
                        <span className="cd-size-name">{tamanho}</span>
                        <div className="cd-size-line"></div>
                      </div>

                      <div className="cd-items-list">
                        {pizzasDo.map((p) => {
                          const ingredientesVisiveis = (p.ingredientes || p.descricao || '')
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s && ocultarIngrediente(s));

                          return (
                            <div key={p.id} className="cd-menu-item">
                              <div className="cd-item-main">
                                <span className="cd-item-name">{p.nome}</span>
                                <span className="cd-item-dots"></span>
                                <span className="cd-item-price">
                                  R$ {Number(p.preco || p.preco_venda || 0).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <p className="cd-item-description">
                                {ingredientesVisiveis.length > 0
                                  ? ingredientesVisiveis.join(', ')
                                  : (p.descricao || 'Consulte nosso chef')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cd-footer-traditional">
          <div className="cd-footer-decoration">
            <div className="it-flag">
              <span className="green"></span>
              <span className="white"></span>
              <span className="red"></span>
            </div>
          </div>
          <p>BUON APPETITO!</p>
          <span className="cd-footer-note">Preços válidos para consumo local e delivery.</span>
        </div>
      </div>
    </div>
  );
}

export default Cardapio;
