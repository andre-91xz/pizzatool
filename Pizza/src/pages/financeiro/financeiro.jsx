import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  FaChartLine, FaTable, FaAlignLeft, FaArrowUp, FaArrowDown,
  FaDollarSign, FaBoxes, FaExclamationTriangle, FaMotorcycle
} from 'react-icons/fa';
import './financeiro.css';

const API  = 'http://localhost:3002';
const GOLD = '#CEAD5A';
const CORES = ['#CEAD5A','#2E7D52','#1D5C8A','#B5342A','#8A5E1A','#6B6245'];

const PERIODOS = [
  { id: 'dia',    label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes',    label: 'Mês' },
  { id: 'ano',    label: 'Ano' },
];

const MODOS = [
  { id: 'grafico', label: 'Gráfico',  icon: FaChartLine },
  { id: 'tabela',  label: 'Tabela',   icon: FaTable },
  { id: 'estoque', label: 'Estoque',  icon: FaBoxes },
  { id: 'texto',   label: 'Texto',    icon: FaAlignLeft },
];

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtN = (v, dec = 3) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: dec });

const formatarLabel = (label, p) => {
  if (!label) return label;

  if (p === 'dia') {
    const hoje = new Date();
    const diaNome = hoje.toLocaleDateString('pt-BR', { weekday: 'short' });
    return `${label} (${diaNome.charAt(0).toUpperCase() + diaNome.slice(1)})`;
  }

  if (p === 'semana') {
    const parts = label.split('/');
    if (parts.length === 2) {
      const [d, m] = parts;
      const ano = new Date().getFullYear();
      const data = new Date(ano, parseInt(m) - 1, parseInt(d));
      if (!isNaN(data)) {
        const diaNome = data.toLocaleDateString('pt-BR', { weekday: 'long' });
        return diaNome.charAt(0).toUpperCase() + diaNome.slice(1).split('-')[0];
      }
    }
    return label;
  }

  if (p === 'mes') {
    const match = label.match(/\((\d{2}\/\d{2})\)/);
    if (match) {
      const inicioStr = match[1];
      const [d, m] = inicioStr.split('/');
      const ano = new Date().getFullYear();
      const inicio = new Date(ano, parseInt(m) - 1, parseInt(d));
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);
      const fimStr = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `De ${inicioStr} até ${fimStr}`;
    }
    return label;
  }

  if (p === 'ano') {
    const parts = label.split('/');
    if (parts.length === 2) {
      const [m, a] = parts;
      const data = new Date(parseInt(a), parseInt(m) - 1, 1);
      if (!isNaN(data)) {
        const mesNome = data.toLocaleDateString('pt-BR', { month: 'long' });
        return mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
      }
    }
    return label;
  }

  return label;
};

function Financeiro() {
  const [periodo, setPeriodo]           = useState('mes');
  const [modo, setModo]                 = useState('grafico');
  const [dados, setDados]               = useState(null);
  const [estoque, setEstoque]           = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando]     = useState(true);
  
  const [paginaMateriais, setPaginaMateriais] = useState(1);
  const [paginaBebidas, setPaginaBebidas] = useState(1);
  const ITENS_POR_PAGINA = 50;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    const carregarResumo = async () => {
      setCarregando(true);
      try {
        const [resRel, resEst] = await Promise.all([
          fetch(`${API}/api/financeiro/relatorios?periodo=${periodo}`).catch(() => null),
          fetch(`${API}/api/estoque/valorado?pagina=1&limite=${ITENS_POR_PAGINA}`).catch(() => null),
        ]);

        if (resRel?.ok) setDados(await resRel.json());
        if (resEst?.ok) setEstoque(await resEst.json());
      } catch (e) {
        console.error(e);
      } finally {
        setCarregando(false);
      }
    };
    
    timeoutRef.current = setTimeout(carregarResumo, 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [periodo]);

  const materiaisPaginados = useMemo(() => {
    if (!estoque?.materiais) return [];
    const inicio = (paginaMateriais - 1) * ITENS_POR_PAGINA;
    return estoque.materiais.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [estoque?.materiais, paginaMateriais]);

  const bebidasPaginadas = useMemo(() => {
    if (!estoque?.bebidas) return [];
    const inicio = (paginaBebidas - 1) * ITENS_POR_PAGINA;
    return estoque.bebidas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [estoque?.bebidas, paginaBebidas]);

  const totalPaginasMateriais = estoque?.total_paginas_materiais || 1;
  const totalPaginasBebidas = estoque?.total_paginas_bebidas || 1;

  useEffect(() => {
    if (modo === 'tabela') {
      const carregarMovimentacoes = async () => {
        try {
          const resMov = await fetch(`${API}/api/financeiro`).catch(() => null);
          if (resMov?.ok) setMovimentacoes((await resMov.json()).movimentacoes || []);
        } catch (e) {
          console.error(e);
        }
      };
      carregarMovimentacoes();
    }
  }, [modo]);

  const textoRelatorio = useMemo(() => {
    if (!dados) return 'Sem dados suficientes para o período selecionado.';
    const p = PERIODOS.find(x => x.id === periodo)?.label || periodo;
    const f = dados.faturamento || {};
    const c = dados.custos || {};
    const l = dados.lucro || 0;
    const piz = dados.pizzas || {};
    const beb = dados.bebidas || {};
    const pag = dados.pagamentos || {};
    const tax = dados.taxas || {};
    const est = dados.estoque || {};
    const top3piz = (piz.por_sabor || []).slice(0, 3).map(x => `${x.nome} (${x.quantidade}un)`).join(', ');
    const top3beb = (beb.por_tipo  || []).slice(0, 3).map(x => `${x.nome} (${x.quantidade}un)`).join(', ');
    const topPag  = (pag.por_forma || [])[0];
    return `
 📊 RELATÓRIO — ${p.toUpperCase()}

 💰 Faturamento Bruto:        ${fmt(f.total)}
 🛵 Taxas de Entrega:         ${fmt(tax.total)}
 🧾 Custo Ingredientes:       ${fmt(c.custo_ingredientes)}
 🏍️  Custo Comissões:         ${fmt(c.custo_comissoes)}
 📉 Custo Total:              ${fmt(c.total)}
 📈 Lucro Líquido:            ${fmt(l)}

 📦 Valor em Estoque Atual:   ${fmt(est.valor_total)}
    • Materiais:              ${fmt(est.valor_materiais)}
    • Bebidas:                ${fmt(est.valor_bebidas)}
    • Itens críticos:         ${est.criticos || 0}

 🍕 Pizzas mais vendidas: ${top3piz || 'Sem dados'}
 🥤 Bebidas mais vendidas: ${top3beb || 'Sem dados'}
 💳 Forma de pagamento principal: ${topPag ? `${topPag.forma} (${topPag.percentual}%)` : 'Sem dados'}
    `.trim();
  }, [dados, periodo]);

  const nivelCor = (n) => ({
    ok:      'var(--success)',
    baixo:   '#E8A838',
    critico: 'var(--danger)',
    zerado:  '#888',
  }[n] || 'var(--text-muted)');

  return (
    <div className="fin-wrapper">

      {/* Header */}
      <div className="fin-header">
        <h1 className="fin-titulo"><FaChartLine /> Financeiro</h1>
        <div className="fin-controles">
          <div className="fin-pills">
            {PERIODOS.map(p => (
              <button key={p.id} className={`fin-pill${periodo === p.id ? ' ativo' : ''}`}
                onClick={() => setPeriodo(p.id)}>{p.label}</button>
            ))}
          </div>
          <div className="fin-pills">
            {MODOS.map(m => (
              <button key={m.id} className={`fin-pill${modo === m.id ? ' ativo' : ''}`}
                onClick={() => setModo(m.id)}>
                <m.icon size={12} /> {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="fin-cards">
        <div className="fin-card entrada">
          <span className="fin-card-label">Faturamento</span>
          <span className="fin-card-valor"><FaArrowUp /> {fmt(dados?.faturamento?.total)}</span>
        </div>
        <div className="fin-card saida">
          <span className="fin-card-label">Custos (Ingredientes + Comissões)</span>
          <span className="fin-card-valor"><FaArrowDown /> {fmt(dados?.custos?.total)}</span>
          <span className="fin-card-detalhe">
            🧾 {fmt(dados?.custos?.custo_ingredientes)} ingredientes &nbsp;|&nbsp;
            🏍️ {fmt(dados?.custos?.custo_comissoes)} comissões
          </span>
        </div>
        <div className="fin-card lucro">
          <span className="fin-card-label">Lucro do Período</span>
          <span className="fin-card-valor"><FaDollarSign /> {fmt(dados?.lucro)}</span>
        </div>
        <div className="fin-card estoque">
          <span className="fin-card-label"><FaBoxes /> Valor em Estoque</span>
          <span className="fin-card-valor">{fmt(estoque?.valor_total)}</span>
          {estoque?.criticos > 0 && (
            <span className="fin-card-alerta">
              <FaExclamationTriangle /> {estoque.criticos} itens críticos
            </span>
          )}
        </div>
      </div>

      {carregando && <p className="fin-loading">Carregando dados...</p>}

      {/* ─── MODO GRÁFICO ─────────────────────────────────────── */}
      {modo === 'grafico' && (
        <div className="fin-graficos">

          {dados?.faturamento?.por_dia?.length > 0 && (
            <div className="fin-grafico-card">
              <h2 className="fin-section-title">
                {periodo === 'dia' ? 'Faturamento por Hora' : 
                 periodo === 'semana' ? 'Faturamento por Dia' : 
                 periodo === 'mes' ? 'Faturamento por Semana' : 
                 'Faturamento por Mês'}
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                {periodo === 'ano' || periodo === 'mes' ? (
                  <BarChart data={dados.faturamento.por_dia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
                      tickFormatter={(v) => formatarLabel(v, periodo)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `R$${v}`} />
                    <Tooltip 
                      labelFormatter={(v) => formatarLabel(v, periodo)}
                      formatter={v => fmt(v)} 
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }} 
                    />
                    <Bar dataKey="valor" fill={GOLD} radius={[6,6,0,0]} name="Faturamento" />
                  </BarChart>
                ) : (
                  <LineChart data={dados.faturamento.por_dia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }} 
                      tickFormatter={(v) => formatarLabel(v, periodo)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `R$${v}`} />
                    <Tooltip 
                      labelFormatter={(v) => formatarLabel(v, periodo)}
                      formatter={v => fmt(v)} 
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }} 
                    />
                    <Line type="monotone" dataKey="valor" stroke={GOLD} strokeWidth={3} dot={{ fill: GOLD, r: 4 }} activeDot={{ r: 6, stroke: 'var(--surface)', strokeWidth: 2 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Custo por sabor */}
          {dados?.pizzas?.por_sabor?.length > 0 && (
            <>
              <div className="fin-grafico-card">
                <h2 className="fin-section-title">Pizzas: Qtd Vendida × Custo Total</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dados.pizzas.por_sabor}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="left" orientation="left" stroke={GOLD} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#B5342A" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(v, name) => name === 'Custo Total (R$)' ? fmt(v) : v}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} 
                    />
                    <Bar yAxisId="left" dataKey="quantidade" fill={GOLD} radius={[4,4,0,0]} name="Qtd Vendida" />
                    <Bar yAxisId="right" dataKey="custo_total" fill="#B5342A" radius={[4,4,0,0]} name="Custo Total (R$)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Novo gráfico de pizza de vendas (agora em barras como solicitado) */}
              <div className="fin-grafico-card">
                <h2 className="fin-section-title">Ranking de Vendas por Sabor (unidades)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dados.pizzas.por_sabor} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="quantidade" fill={GOLD} radius={[0, 4, 4, 0]} name="Unidades Vendidas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {dados?.pagamentos?.por_forma?.length > 0 && (
            <div className="fin-grafico-card fin-grafico-half">
              <h2 className="fin-section-title">Formas de Pagamento (Faturamento)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados.pagamentos.por_forma} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="forma" width={90} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="total" fill={GOLD} radius={[0, 4, 4, 0]} name="Total Bruto" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bairros */}
          {dados?.bairros?.por_bairro?.length > 0 && (
            <div className="fin-grafico-card fin-grafico-half">
              <h2 className="fin-section-title">Pedidos por Bairro</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados.bairros.por_bairro} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="quantidade" fill={GOLD} radius={[0, 4, 4, 0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bebidas */}
          {dados?.bebidas?.por_tipo?.length > 0 && (
            <div className="fin-grafico-card">
              <h2 className="fin-section-title">Venda de Bebidas por Tipo</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados.bebidas.por_tipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="quantidade" fill="#1D5C8A" radius={[4, 4, 0, 0]} name="Qtd Vendida" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {dados?.comissoes?.por_entregador?.length > 0 && (
            <div className="fin-grafico-card fin-grafico-half">
              <h2 className="fin-section-title"><FaMotorcycle /> Comissões por Entregador</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados.comissoes.por_entregador} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="total_comissao" fill="#2E7D52" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!dados && !carregando && (
            <div className="fin-vazio-graficos">
              <p>Sem dados suficientes para gerar gráficos.</p>
              <p style={{ fontSize: 12 }}>Registre pedidos entregues para ver os relatórios aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODO TABELA ──────────────────────────────────────── */}
      {modo === 'tabela' && (
        <div className="fin-tabela-container">

          {/* Custo por pizza */}
          {dados?.pizzas?.por_sabor?.length > 0 && (
            <>
              <h2 className="fin-section-title">Custo por Sabor de Pizza</h2>
              <table className="fin-tabela">
                <thead><tr>
                  <th>Pizza</th><th>Qtd Vendida</th>
                  <th>Custo Unit.</th><th>Custo Total</th>
                </tr></thead>
                <tbody>
                  {dados.pizzas.por_sabor.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nome}</td>
                      <td>{p.quantidade}x</td>
                      <td>{fmt(p.custo_unitario)}</td>
                      <td className="val-saida">{fmt(p.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Movimentações */}
          <h2 className="fin-section-title" style={{ marginTop: 24 }}>Movimentações</h2>
          {movimentacoes.length === 0 ? (
            <p className="fin-vazio">Nenhuma movimentação registrada.</p>
          ) : (
            <table className="fin-tabela">
              <thead><tr>
                <th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th>
              </tr></thead>
              <tbody>
                {movimentacoes.map((m, i) => (
                  <tr key={i} className={m.tipo}>
                    <td>{new Date(m.data_movimentacao || m.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>{m.descricao || '—'}</td>
                    <td><span className="fin-tag-cat">{m.categoria || '—'}</span></td>
                    <td><span className={`tag-tipo ${m.tipo}`}>{m.tipo}</span></td>
                    <td className={`val-${m.tipo}`}>{m.tipo === 'entrada' ? '+' : '-'} {fmt(m.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Comissões */}
          {dados?.comissoes?.por_entregador?.length > 0 && (
            <>
              <h2 className="fin-section-title" style={{ marginTop: 24 }}>Comissões por Entregador</h2>
              <table className="fin-tabela">
                <thead><tr><th>Entregador</th><th>Entregas</th><th>Comissão Total</th></tr></thead>
                <tbody>
                  {dados.comissoes.por_entregador.map((c, i) => (
                    <tr key={i}>
                      <td>{c.nome}</td>
                      <td>{c.entregas}</td>
                      <td className="val-saida">{fmt(c.total_comissao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Pedidos por bairro */}
          {dados?.bairros?.por_bairro?.length > 0 && (
            <>
              <h2 className="fin-section-title" style={{ marginTop: 24 }}>Pedidos por Bairro</h2>
              <table className="fin-tabela">
                <thead><tr><th>Bairro</th><th>Entregas</th><th>Faturamento</th></tr></thead>
                <tbody>
                  {dados.bairros.por_bairro.map((b, i) => (
                    <tr key={i}>
                      <td>{b.nome}</td><td>{b.quantidade}</td>
                      <td className="val-entrada">{fmt(b.faturamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ─── MODO ESTOQUE ─────────────────────────────────────── */}
      {modo === 'estoque' && (
        <div className="fin-tabela-container">

          {/* Resumo do estoque */}
          <div className="fin-estoque-resumo">
            <div className="fin-estoque-card">
              <span>Materiais</span>
              <strong>{fmt(estoque?.valor_total_materiais)}</strong>
            </div>
            <div className="fin-estoque-card">
              <span>Bebidas</span>
              <strong>{fmt(estoque?.valor_total_bebidas)}</strong>
            </div>
            <div className="fin-estoque-card total">
              <span>Total Investido</span>
              <strong>{fmt(estoque?.valor_total)}</strong>
            </div>
          </div>

          {/* Gráfico de Estoque por Categoria (Barras horizontais para consistência) */}
          {estoque?.por_categoria?.length > 0 && (
            <div className="fin-grafico-card" style={{ marginBottom: 24 }}>
              <h2 className="fin-section-title">Distribuição do Valor em Estoque por Categoria</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={estoque.por_categoria} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="categoria" width={100} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="valor" fill={GOLD} radius={[0, 4, 4, 0]} name="Valor em Estoque" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Itens críticos */}
          {estoque?.criticos?.length > 0 && (
            <>
              <h2 className="fin-section-title" style={{ color: 'var(--danger)', marginTop: 16 }}>
                <FaExclamationTriangle /> Itens Críticos / Zerados
              </h2>
              <table className="fin-tabela">
                <thead><tr><th>Item</th><th>Quantidade</th><th>Unidade</th><th>Valor</th><th>Nível</th></tr></thead>
                <tbody>
                  {estoque.criticos.map((it, i) => (
                    <tr key={i}>
                      <td>{it.nome}</td>
                      <td>{fmtN(it.quantidade)}</td>
                      <td>{it.unidade || 'un'}</td>
                      <td className="val-saida">{fmt(it.valor_total)}</td>
                      <td>
                        <span style={{ color: nivelCor(it.nivel), fontWeight: 700, fontSize: 11 }}>
                          {it.nivel?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Todos os materiais */}
          <h2 className="fin-section-title" style={{ marginTop: 20 }}>Materiais em Estoque <span style={{fontSize: 12, fontWeight: 400}}>({(estoque?.total_materiais || 0)} itens)</span></h2>
          <table className="fin-tabela">
            <thead><tr>
              <th>Material</th><th>Categoria</th><th>Qtd</th><th>Unid</th>
              <th>Custo/un</th><th>Valor Total</th><th>Nível</th>
            </tr></thead>
            <tbody>
              {materiaisPaginados.map((m, i) => (
                <tr key={i}>
                  <td>{m.nome}</td>
                  <td><span className="fin-tag-cat">{m.categoria}</span></td>
                  <td>{fmtN(m.quantidade)}</td>
                  <td>{m.unidade}</td>
                  <td>{fmt(m.preco)}</td>
                  <td className="val-entrada">{fmt(m.valor_total)}</td>
                  <td>
                    <span style={{ color: nivelCor(m.nivel), fontWeight: 700, fontSize: 11 }}>
                      {m.nivel?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPaginasMateriais > 1 && (
            <div className="fin-paginacao">
              <button onClick={() => setPaginaMateriais(p => Math.max(1, p - 1))} disabled={paginaMateriais === 1}>Anterior</button>
              <span>Página {paginaMateriais} de {totalPaginasMateriais}</span>
              <button onClick={() => setPaginaMateriais(p => Math.min(totalPaginasMateriais, p + 1))} disabled={paginaMateriais >= totalPaginasMateriais}>Próxima</button>
            </div>
          )}

          {/* Bebidas */}
          <h2 className="fin-section-title" style={{ marginTop: 20 }}>Bebidas em Estoque <span style={{fontSize: 12, fontWeight: 400}}>({(estoque?.total_bebidas || 0)} itens)</span></h2>
          <table className="fin-tabela">
            <thead><tr>
              <th>Bebida</th><th>Qtd</th><th>Preço Venda</th><th>Custo Compra</th><th>Valor Estoque</th><th>Nível</th>
            </tr></thead>
            <tbody>
              {bebidasPaginadas.map((b, i) => (
                <tr key={i}>
                  <td>{b.nome}</td>
                  <td>{b.quantidade}un</td>
                  <td>{fmt(b.preco_venda)}</td>
                  <td>{fmt(b.preco)}</td>
                  <td className="val-entrada">{fmt(b.valor_total)}</td>
                  <td>
                    <span style={{ color: nivelCor(b.nivel), fontWeight: 700, fontSize: 11 }}>
                      {b.nivel?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPaginasBebidas > 1 && (
            <div className="fin-paginacao">
              <button onClick={() => setPaginaBebidas(p => Math.max(1, p - 1))} disabled={paginaBebidas === 1}>Anterior</button>
              <span>Página {paginaBebidas} de {totalPaginasBebidas}</span>
              <button onClick={() => setPaginaBebidas(p => Math.min(totalPaginasBebidas, p + 1))} disabled={paginaBebidas >= totalPaginasBebidas}>Próxima</button>
            </div>
          )}
        </div>
      )}

      {/* ─── MODO TEXTO ───────────────────────────────────────── */}
      {modo === 'texto' && (
        <div className="fin-texto-container">
          <pre className="fin-texto-relatorio">{textoRelatorio}</pre>
        </div>
      )}
    </div>
  );
}

export default Financeiro;
