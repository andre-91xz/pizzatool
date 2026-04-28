import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './sidebar.css';
import { FiHome, FiPackage, FiTruck, FiUser, FiSettings, FiCpu, FiMenu, FiSun, FiMoon, FiShoppingCart } from 'react-icons/fi';
import { FaChartLine } from 'react-icons/fa';
import { useTheme } from '../../../hooks/useTheme';

const NAV_ITEMS = [
  { id: 'home_page',    icon: FiHome,       label: 'Home',          path: '/home' },
  { id: 'cardapio',     icon: FiMenu,       label: 'Cardápio',    path: '/cardapio' },
  { id: 'estoque',      icon: FiPackage,     label: 'Estoque',       path: '/estoque' },
  { id: 'entregadores', icon: FiTruck,       label: 'Entregadores',  path: '/entregadores' },
  { id: 'perfil',       icon: FiUser,        label: 'Perfil',        path: '/perfil' },
  { id: 'financeiro',   icon: FaChartLine,   label: 'Financeiro',    path: '/financeiro' },
  { id: 'assistente',   icon: FiCpu,         label: 'Assistente IA', path: '/assistente' },
  { id: 'configuracoes',icon: FiSettings,    label: 'Configurações', path: '/configuracoes' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState('');
  const { theme, toggle } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = time.toLocaleDateString('pt-BR', { weekday: 'long' });
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && <span className="logo-text">Andre 91xz</span>}
        <button className="toggle-btn" onClick={() => setCollapsed(c => !c)}>
          <FiMenu size={20} />
        </button>
      </div>

      {/* Nav links */}
      <ul className="nav-links">
        {NAV_ITEMS.map(({ id, icon: Icon, label, path }) => (
          <li key={id}>
            <NavLink
              to={path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onMouseEnter={() => collapsed && setTooltip(label)}
              onMouseLeave={() => setTooltip('')}
            >
              <span className="icon"><Icon size={19} /></span>
              {!collapsed && <span className="link-text">{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Clock Display */}
      <div className="sidebar-clock">
        {!collapsed ? (
          <>
            <div className="clock-day">{dayName.charAt(0).toUpperCase() + dayName.slice(1)}</div>
            <div className="clock-time">{hours}:{minutes}</div>
          </>
        ) : (
          <div className="clock-collapsed">
            <span>{hours}</span>
            <span>{minutes}</span>
          </div>
        )}
      </div>

      {/* Footer: tema toggle */}
      <div className="sidebar-footer">
        <button
          className="theme-toggle-btn"
          onClick={toggle}
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          onMouseEnter={() => collapsed && setTooltip(theme === 'dark' ? 'Claro' : 'Escuro')}
          onMouseLeave={() => setTooltip('')}
        >
          {theme === 'dark' ? <FiSun size={15} /> : <FiMoon size={15} />}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </button>
      </div>

      {/* Tooltip quando collapsed */}
      {tooltip && collapsed && (
        <div className="sidebar-tooltip">{tooltip}</div>
      )}
    </div>
  );
};

export default Sidebar;