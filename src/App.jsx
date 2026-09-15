import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// TELAS
import Login from './Login';
import Dashboard from './Dashboard';
import CriarChecklist from './CriarChecklist';
import ListarChecklists from './ListarChecklists';
import ExecutarChecklist from './ExecutarChecklist';
import EditarChecklist from './EditarChecklist';
import MeusRelatorios from './MeusRelatorios';
import DetalhesRelatorio from './DetalhesRelatorio';
import GerenciarUsuarios from './GerenciarUsuarios';
import Empresas from './Empresas'; // <--- IMPORTAÇÃO DA TELA DE BASES / EMPRESAS

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/criar-checklist" element={<CriarChecklist />} />
        <Route path="/checklists" element={<ListarChecklists />} />
        <Route path="/executar-checklist" element={<ListarChecklists />} />
        <Route path="/executar-checklist/:id" element={<ExecutarChecklist />} />
        
        {/* ROTA DE EDIÇÃO DE CHECKLIST */}
        <Route path="/editar-checklist/:id" element={<EditarChecklist />} />

        {/* RELATÓRIOS E HISTÓRICO */}
        <Route path="/meus-relatorios" element={<MeusRelatorios />} />
        <Route path="/historico" element={<MeusRelatorios />} />
        <Route path="/detalhes-relatorio/:id" element={<DetalhesRelatorio />} />

        {/* GESTÃO DE USUÁRIOS */}
        <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
        <Route path="/usuarios" element={<GerenciarUsuarios />} />

        {/* GESTÃO DE BASES / EMPRESAS (SUPER_ADMIN) */}
        <Route path="/empresas" element={<Empresas />} />

        {/* REDIRECIONAMENTO PARA SEGURANÇA */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;