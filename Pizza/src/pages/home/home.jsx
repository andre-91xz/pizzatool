import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './home.css'
import Sidebar from '../componentes/sidebar/sidebar';

// Páginas novas
import HomePage from '../home_page/home_page';
import Material from '../material/material';
import Cardapio from '../cardapio/cardapio';
import Estoque from '../estoque/estoque';
import Entregadores from '../entregadores/entregadores';
import Perfil from '../perfil/perfil';
import Financeiro from '../financeiro/financeiro';
import Assistente from '../assistente/assistente';
import Configuracoes from '../configuracoes/configuracoes';

function Home() {
    const [pedidoEmEdicao, setPedidoEmEdicao] = useState(null);

    // Aplica tema salvo ao montar
    useEffect(() => {
        const theme = localStorage.getItem('erp-theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    return (
        <div className='App'>
            <div className='Sidebar'>
                <Sidebar />
            </div>

            <div className='header'>
                <div className='renderpage'>
                    <Routes>
                        <Route path="/" element={<Navigate to="/home" replace />} />
                        <Route path="/material" element={<Material />} />
                        <Route path="/cardapio" element={<Cardapio />} />
                        <Route 
                            path="/home/*" 
                            element={<HomePage pedidoEmEdicao={pedidoEmEdicao} setPedidoEmEdicao={setPedidoEmEdicao} />} 
                        />
                        <Route path="/estoque/*" element={<Estoque />} />
                        <Route path="/entregadores" element={<Entregadores />} />
                        <Route path="/perfil" element={<Perfil />} />
                        <Route path="/financeiro" element={<Financeiro />} />
                        <Route path="/assistente" element={<Assistente />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/home" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default Home;