import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Material from '../material/material';
import Bebidas from '../bebidas/bebidas';
import Bordas from '../bordas/bordas';
import Catalogo from '../catalogo/catalogo';
import './estoque.css';
import { FiBox, FiDroplet, FiCircle, FiBook } from 'react-icons/fi';

const ABAS = [
  { id: 'material',  label: 'Material',  icon: FiBox,      path: '/estoque/material' },
  { id: 'bebidas',   label: 'Bebidas',   icon: FiDroplet,  path: '/estoque/bebidas' },
  { id: 'bordas',    label: 'Bordas',    icon: FiCircle,   path: '/estoque/bordas' },
  { id: 'catalogo',  label: 'Catálogo',  icon: FiBook,     path: '/estoque/catalogo' },
];

function Estoque() {
  return (
    <div className="estoque-wrapper">
      <div className="estoque-tabs">
        {ABAS.map(({ id, label, icon: Icon, path }) => (
          <NavLink
            key={id}
            to={path}
            className={({ isActive }) => `estoque-tab${isActive ? ' ativo' : ''}`}
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>
      <div className="estoque-content">
        <Routes>
          <Route path="/" element={<Navigate to="material" replace />} />
          <Route path="material" element={<Material />} />
          <Route path="bebidas" element={<Bebidas />} />
          <Route path="bordas" element={<Bordas />} />
          <Route path="catalogo" element={<Catalogo />} />
        </Routes>
      </div>
    </div>
  );
}

export default Estoque;
