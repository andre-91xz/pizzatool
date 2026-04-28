import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import Pedidos from '../pedidos/pedidos';
import AbrirPedido from '../abrir_pedido/abrir_pedido';
import './home_page.css';
import { FiClipboard, FiPlusCircle } from 'react-icons/fi';

function HomePage({ pedidoEmEdicao, setPedidoEmEdicao }) {
    const navigate = useNavigate();

    return (
        <div className="hp-wrapper">
            <div className="hp-tabs">
                <NavLink
                    to="/home/pedidos"
                    className={({ isActive }) => `hp-tab${isActive ? ' ativo' : ''}`}
                >
                    <FiClipboard size={15} />
                    Pedidos em Andamento
                </NavLink>
                <NavLink
                    to="/home/abrir"
                    className={({ isActive }) => `hp-tab${isActive ? ' ativo' : ''}`}
                    onClick={() => setPedidoEmEdicao(null)}
                >
                    <FiPlusCircle size={15} />
                    Novo Pedido
                </NavLink>
            </div>

            <div className="hp-content">
                <Routes>
                    <Route path="/" element={<Navigate to="pedidos" replace />} />
                    <Route 
                        path="pedidos" 
                        element={<Pedidos editarPedido={(p) => { setPedidoEmEdicao(p); navigate('/home/abrir'); }} />} 
                    />
                    <Route 
                        path="abrir" 
                        element={<AbrirPedido pedidoEmEdicao={pedidoEmEdicao} limparEdicao={() => setPedidoEmEdicao(null)} />} 
                    />
                </Routes>
            </div>
        </div>
    );
}

export default HomePage;
