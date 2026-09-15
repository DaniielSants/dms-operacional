import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Building2, Plus, ArrowLeft, Loader2, Trash2, UserX, FileX } from 'lucide-react';

export default function Empresas() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Dados do usuário logado para segurança
  const rawUsuario = localStorage.getItem('dms_usuario');
  const usuarioObj = rawUsuario ? JSON.parse(rawUsuario) : {};
  const meuEmail = usuarioObj.email || localStorage.getItem('email');

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('id', { ascending: true });

    if (!error) setEmpresas(data || []);
  };

  const handleCriarEmpresa = async (e) => {
    e.preventDefault();
    if (!nomeEmpresa.trim()) return;

    setCarregando(true);
    const { error } = await supabase.from('empresas').insert([{ nome: nomeEmpresa }]);

    if (error) {
      alert('Erro ao cadastrar empresa: ' + error.message);
    } else {
      setNomeEmpresa('');
      carregarEmpresas();
    }
    setCarregando(false);
  };

  // 1. RESETAR USUÁRIOS DE UMA BASE
  const handleResetarUsuarios = async (empresaId, empresaNome) => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Deseja apagar TODOS os usuários vinculados à empresa "${empresaNome}"?\n\nEsta ação não poderá ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('empresa_id', empresaId)
        .neq('email', meuEmail);

      if (error) throw error;

      alert(`✅ Usuários da empresa "${empresaNome}" foram zerados com sucesso!`);
    } catch (err) {
      console.error("Erro ao resetar usuários:", err);
      alert("❌ Erro ao resetar usuários: " + err.message);
    }
  };

  // 2. RESETAR CHECKLISTS DE UMA BASE (MODELOS E RESPOSTAS)
  const handleResetarChecklists = async (empresaId, empresaNome) => {
    const confirmacao = window.confirm(
      `📋 ATENÇÃO: Deseja apagar TODOS os checklists (modelos, perguntas e histórico de respostas) da empresa "${empresaNome}"?\n\nEsta ação não poderá ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      // Apaga o histórico de relatórios/respostas da empresa
      const { error: errRespostas } = await supabase
        .from('respostas_executadas')
        .delete()
        .eq('empresa_id', empresaId);

      if (errRespostas) throw errRespostas;

      // Apaga os modelos de formulários da empresa
      const { error: errTemplates } = await supabase
        .from('checklists_templates')
        .delete()
        .eq('empresa_id', empresaId);

      if (errTemplates) throw errTemplates;

      alert(`✅ Todos os checklists da empresa "${empresaNome}" foram limpos com sucesso!`);
    } catch (err) {
      console.error("Erro ao resetar checklists:", err);
      alert("❌ Erro ao resetar checklists: " + err.message);
    }
  };

  // 3. EXCLUIR EMPRESA/BASE COMPLETA
  const handleExcluirEmpresa = async (empresaId, empresaNome) => {
    if (empresaId === 1) {
      return alert("🚫 A empresa principal (ID: 1) não pode ser excluída por questões de segurança.");
    }

    const confirmacao = window.confirm(
      `🔴 PERIGO: Deseja apagar a empresa "${empresaNome}" (ID: ${empresaId})?\n\nIsso excluirá PERMANENTEMENTE todos os usuários, modelos e histórico de checklists associados!`
    );

    if (!confirmacao) return;

    try {
      await supabase.from('respostas_executadas').delete().eq('empresa_id', empresaId);
      await supabase.from('checklists_templates').delete().eq('empresa_id', empresaId);
      await supabase.from('usuarios').delete().eq('empresa_id', empresaId);

      const { error } = await supabase.from('empresas').delete().eq('id', empresaId);

      if (error) throw error;

      alert(`✅ Empresa "${empresaNome}" e seus dados foram excluídos!`);
      setEmpresas((prev) => prev.filter((item) => item.id !== empresaId));
    } catch (err) {
      console.error("Erro ao excluir empresa:", err);
      alert("❌ Erro ao excluir empresa: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} /> Voltar ao Dashboard
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800">Gestão de Bases / Empresas</h1>
            <p className="text-xs text-gray-400 font-medium">Cadastre, gerencie e resete as bases do sistema</p>
          </div>
        </div>

        {/* FORMULÁRIO DE CADASTRO */}
        <form onSubmit={handleCriarEmpresa} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Nome da nova empresa/base"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            className="flex-1 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={carregando}
            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {carregando ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Adicionar</>}
          </button>
        </form>

        {/* LISTA DE EMPRESAS */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 font-bold text-sm text-gray-700">
            Empresas Cadastradas ({empresas.length})
          </div>
          <div className="divide-y divide-gray-100">
            {empresas.map((emp) => (
              <div key={emp.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-gray-800 text-base">{emp.nome}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">ID da Base: #{emp.id}</p>
                </div>

                {/* BOTÕES DE AÇÃO EXCLUSIVOS DO SUPER ADMIN */}
                <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                  {/* BOTAO RESETAR CHECKLISTS */}
                  <button
                    onClick={() => handleResetarChecklists(emp.id, emp.nome)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition-all"
                    title="Zerar Checklists e Histórico de Inspeções"
                  >
                    <FileX size={16} /> Resetar Checklists
                  </button>

                  {/* BOTAO RESETAR USUÁRIOS */}
                  <button
                    onClick={() => handleResetarUsuarios(emp.id, emp.nome)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-all"
                    title="Zerar Usuários da Base"
                  >
                    <UserX size={16} /> Resetar Equipe
                  </button>

                  {/* BOTAO EXCLUIR BASE COMPLETA */}
                  {emp.id !== 1 && (
                    <button
                      onClick={() => handleExcluirEmpresa(emp.id, emp.nome)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all"
                      title="Excluir Empresa e Dados"
                    >
                      <Trash2 size={16} /> Excluir Base
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}