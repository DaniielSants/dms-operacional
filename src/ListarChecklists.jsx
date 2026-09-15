import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Trash2, Edit3, ArrowLeft, Plus, Play, Loader2 } from 'lucide-react';

export default function ListarChecklists() {
  const [checklists, setChecklists] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  // Leitura do objeto do usuário logado com fallbacks
  const rawUsuario = localStorage.getItem('dms_usuario');
  const usuarioObj = rawUsuario ? JSON.parse(rawUsuario) : {};

  const cargo = usuarioObj.cargo || localStorage.getItem('cargo') || 'OPERADOR';
  const empresaId = usuarioObj.empresa_id || localStorage.getItem('empresa_id');

  // Liberação para SUPER_ADMIN e gestores locais
  const isSuperAdmin = cargo === 'SUPER_ADMIN';
  const podeGerenciar = isSuperAdmin || ['ADMIN', 'ADMIN_EMPRESA', 'ADMIN_UNIDADE'].includes(cargo);

  useEffect(() => {
    carregarChecklists();
  }, [cargo, empresaId]);

  const carregarChecklists = async () => {
    setCarregando(true);
    try {
      let query = supabase
        .from('checklists_templates')
        .select('*')
        .order('id', { ascending: true });

      // Se não for SUPER_ADMIN, restringe os formulários à empresa atual
      if (!isSuperAdmin && empresaId) {
        query = query.eq('empresa_id', parseInt(empresaId, 10));
      }

      const { data, error } = await query;
      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      console.error("Erro ao carregar checklists:", err);
    } finally {
      setCarregando(false);
    }
  };

  const excluirChecklist = async (id) => {
    if (!podeGerenciar) return alert("Você não tem permissão para excluir formulários!");
    
    if (window.confirm("Deseja apagar este formulário permanentemente?")) {
      try {
        // Apaga as questões vinculadas ao modelo antes da remoção
        await supabase.from('questoes').delete().eq('template_id', id);

        const { error } = await supabase
          .from('checklists_templates')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert("Formulário apagado com sucesso!");
        carregarChecklists();
      } catch (err) {
        console.error("Erro ao excluir formulário:", err);
        alert("Erro ao excluir formulário: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-grow">
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-sm sm:text-base transition-colors"
          >
            <ArrowLeft size={18} /> Painel
          </button>

          {podeGerenciar && (
            <button 
              onClick={() => navigate('/criar-checklist')} 
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md hover:bg-blue-700 text-sm sm:text-base transition-all"
            >
              <Plus size={18} /> NOVO
            </button>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Meus Formulários</h2>

        {/* LISTA DE CHECKLISTS */}
        {carregando ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {checklists.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all"
              >
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-800">{item.titulo}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">ID: #{item.id}</p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                  {/* PREENCHER (LIVRE PARA TODOS) */}
                  <button 
                    onClick={() => navigate(`/executar-checklist/${item.id}`)}
                    className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all"
                  >
                    <Play size={16} fill="white" /> PREENCHER
                  </button>

                  {/* EDITAR E EXCLUIR (LIBERADOS PARA SUPER_ADMIN E ADMINS) */}
                  {podeGerenciar && (
                    <button 
                      onClick={() => navigate(`/editar-checklist/${item.id}`)} 
                      className="p-2.5 sm:p-3 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all"
                      title="Editar Modelo"
                    >
                      <Edit3 size={18} />
                    </button>
                  )}

                  {podeGerenciar && (
                    <button 
                      onClick={() => excluirChecklist(item.id)} 
                      className="p-2.5 sm:p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                      title="Apagar Modelo"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {checklists.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-gray-400 font-medium">
                Nenhum formulário encontrado.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}