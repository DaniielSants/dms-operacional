import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  FileText, 
  ClipboardList, 
  Users, 
  History, 
  PlusCircle, 
  LogOut, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_templates: 0,
    concluidos_hoje: 0,
    total_usuarios: 0,
    total_historico: 0
  });

  // Leitura com fallback entre o objeto dms_usuario e chaves individuais do localStorage
  const rawUsuario = localStorage.getItem('dms_usuario');
  const usuarioObj = rawUsuario ? JSON.parse(rawUsuario) : {};

  const nome = usuarioObj.nome || localStorage.getItem('nome') || 'Usuário';
  const cargo = usuarioObj.cargo || localStorage.getItem('cargo') || 'OPERADOR';
  const rawEmpresaId = usuarioObj.empresa_id || localStorage.getItem('empresa_id') || '1';
  const empresaId = parseInt(rawEmpresaId, 10);

  const isSuperAdmin = cargo === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || cargo === 'ADMIN' || cargo === 'ADMIN_EMPRESA' || cargo === 'ADMIN_UNIDADE';

  useEffect(() => {
    carregarEstatisticasSupabase();
  }, [empresaId, cargo]);

  const carregarEstatisticasSupabase = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Queries base
      let qTemplates = supabase.from('checklists_templates').select('*', { count: 'exact', head: true });
      let qHoje = supabase.from('respostas_executadas').select('*', { count: 'exact', head: true }).eq('data_finalizada', hoje);
      let qHistorico = supabase.from('respostas_executadas').select('*', { count: 'exact', head: true });
      let qUsuarios = supabase.from('usuarios').select('*', { count: 'exact', head: true });

      // Se não for SUPER_ADMIN, filtra obrigatoriamente pela empresa logada
      if (!isSuperAdmin && empresaId) {
        qTemplates = qTemplates.eq('empresa_id', empresaId);
        qHoje = qHoje.eq('empresa_id', empresaId);
        qHistorico = qHistorico.eq('empresa_id', empresaId);
        qUsuarios = qUsuarios.eq('empresa_id', empresaId);
      }

      const [
        { count: totalTemplates },
        { count: concluidosHoje },
        { count: totalHistorico },
        { count: totalUsuarios }
      ] = await Promise.all([qTemplates, qHoje, qHistorico, qUsuarios]);

      setStats({
        total_templates: totalTemplates || 0,
        concluidos_hoje: concluidosHoje || 0,
        total_historico: totalHistorico || 0,
        total_usuarios: totalUsuarios || 0
      });
    } catch (err) {
      console.error("Erro ao carregar estatísticas do Supabase:", err);
    }
  };

  const handleSair = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* CABEÇALHO DO DASHBOARD RESPONSIVO */}
        <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shrink-0">
              <Building2 size={24} className="sm:size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {cargo}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight mt-0.5">
                Olá, {nome}!
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">Painel DMS Operacional</p>
            </div>
          </div>

          <button
            onClick={handleSair}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold rounded-xl transition-all text-sm"
          >
            <LogOut size={18} /> Sair do Sistema
          </button>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-2.5 bg-blue-50 text-blue-600 w-fit rounded-xl mb-2 sm:mb-3">
              <ClipboardList size={20} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Modelos</p>
            <h3 className="text-xl sm:text-3xl font-black text-gray-800">{stats.total_templates}</h3>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-2.5 bg-green-50 text-green-600 w-fit rounded-xl mb-2 sm:mb-3">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Hoje</p>
            <h3 className="text-xl sm:text-3xl font-black text-gray-800">{stats.concluidos_hoje}</h3>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-2.5 bg-amber-50 text-amber-600 w-fit rounded-xl mb-2 sm:mb-3">
              <History size={20} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico</p>
            <h3 className="text-xl sm:text-3xl font-black text-gray-800">{stats.total_historico}</h3>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-2.5 bg-purple-50 text-purple-600 w-fit rounded-xl mb-2 sm:mb-3">
              <Users size={20} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Equipe</p>
            <h3 className="text-xl sm:text-3xl font-black text-gray-800">{stats.total_usuarios}</h3>
          </div>
        </div>

        {/* MENU DE AÇÕES RÁPIDAS */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Ações Rápidas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* EXECUTAR CHECKLIST */}
            <div 
              onClick={() => navigate('/checklists')}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                  <ClipboardList size={24} />
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Ir →</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">Executar Checklist</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Selecione um modelo e realize as inspeções em campo.</p>
              </div>
            </div>

            {/* HISTÓRICO DE RELATÓRIOS */}
            <div 
              onClick={() => navigate('/meus-relatorios')}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                  <FileText size={24} />
                </div>
                <span className="text-xs font-bold text-green-600 group-hover:translate-x-1 transition-transform">Ir →</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">Histórico de Relatórios</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Consulte inspeções finalizadas e imprima evidências.</p>
              </div>
            </div>

            {/* AÇÕES DE ADMINISTRADORES */}
            {isAdmin && (
              <>
                <div 
                  onClick={() => navigate('/criar-checklist')}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                      <PlusCircle size={24} />
                    </div>
                    <span className="text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">Ir →</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg">Novo Modelo</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Crie novos formulários e perguntas para a equipe.</p>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/gerenciar-usuarios')}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                      <Users size={24} />
                    </div>
                    <span className="text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">Ir →</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg">Gerenciar Equipe</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Cadastre, edite e remova acessos de usuários.</p>
                  </div>
                </div>
              </>
            )}

            {/* AÇÃO EXCLUSIVA SUPER_ADMIN (GESTAO DE BASES) */}
            {isSuperAdmin && (
              <div 
                onClick={() => navigate('/empresas')}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                    <Building2 size={24} />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">Ir →</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base sm:text-lg">Gestão de Bases</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">Cadastre empresas, filiais e configure os acessos master.</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}