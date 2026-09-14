import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, FileText, Clock, Eye, User, Trash2 } from 'lucide-react';

export default function MeusRelatorios() {
  const [relatorios, setRelatorios] = useState([]);
  const navigate = useNavigate();
  const email = localStorage.getItem('email');
  const empresaId = localStorage.getItem('empresa_id');
  const cargo = localStorage.getItem('cargo');

  useEffect(() => {
    carregarRelatorios();
  }, [email, empresaId, cargo]);

  const carregarRelatorios = async () => {
    let query = supabase
      .from('respostas_executadas')
      .select(`
        id,
        data_finalizada,
        usuario_email,
        checklists_templates ( titulo )
      `)
      .eq('empresa_id', empresaId)
      .order('id', { ascending: false });

    // Se não for admin, vê apenas os seus próprios relatórios
    if (cargo !== 'ADMIN') {
      query = query.eq('usuario_email', email);
    }

    const { data, error } = await query;

    if (!error && data) {
      const formatados = data.map(item => ({
        id: item.id,
        titulo: item.checklists_templates?.titulo || 'Checklist Sem Título',
        data_finalizada: item.data_finalizada,
        usuario_email: item.usuario_email
      }));
      setRelatorios(formatados);
    }
  };

  const handleExcluirRelatorio = async (id, titulo) => {
    if (cargo !== 'ADMIN') return alert("Apenas administradores podem excluir!");

    const confirmacao = window.confirm(`Tem certeza que deseja excluir o relatório "${titulo}"?`);
    if (!confirmacao) return;

    const { error } = await supabase
      .from('respostas_executadas')
      .delete()
      .eq('id', id);

    if (!error) {
      setRelatorios(prev => prev.filter(rel => rel.id !== id));
    } else {
      alert("Erro ao excluir o relatório no Supabase.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-gray-500 mb-6 hover:text-blue-600 transition-colors text-sm sm:text-base font-medium"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} /> 
          {cargo === 'ADMIN' ? 'Relatórios da Unidade' : 'Meus Envios'}
        </h2>

        <div className="grid gap-3 sm:gap-4">
          {relatorios.map((rel) => (
            <div 
              key={rel.id} 
              className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-row items-center justify-between gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{rel.titulo}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-400">
                      <Clock size={12} className="shrink-0" /> 
                      <span className="truncate">Finalizado: {rel.data_finalizada}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-blue-500 uppercase tracking-tight">
                      <User size={12} className="shrink-0" /> 
                      <span className="truncate">Resp: {rel.usuario_email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => navigate(`/detalhes-relatorio/${rel.id}`)}
                  className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white active:scale-95 transition-all shadow-sm"
                  title="Visualizar Detalhes"
                >
                  <Eye size={18} />
                </button>

                {cargo === 'ADMIN' && (
                  <button 
                    onClick={() => handleExcluirRelatorio(rel.id, rel.titulo)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white active:scale-95 transition-all shadow-sm"
                    title="Excluir Relatório"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {relatorios.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-4">
              <p className="text-gray-400 text-sm sm:text-base">Nenhum preenchimento encontrado no seu histórico.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}