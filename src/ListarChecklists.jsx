import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Trash2, Edit3, ArrowLeft, Plus, Play } from 'lucide-react';

export default function ListarChecklists() {
  const [checklists, setChecklists] = useState([]);
  const navigate = useNavigate();
  const cargo = localStorage.getItem('cargo');
  const empresaId = localStorage.getItem('empresa_id');

  useEffect(() => {
    carregarChecklists();
  }, []);

  const carregarChecklists = async () => {
    const { data, error } = await supabase
      .from('checklists_templates')
      .select('*')
      .eq('empresa_id', empresaId);

    if (!error) setChecklists(data || []);
  };

  const excluirChecklist = async (id) => {
    if (cargo !== 'ADMIN') return alert("Apenas administradores podem excluir!");
    
    if (window.confirm("Deseja apagar este formulário?")) {
      const { error } = await supabase
        .from('checklists_templates')
        .delete()
        .eq('id', id);

      if (!error) {
        alert("Formulário apagado!");
        carregarChecklists();
      } else {
        alert("Erro ao excluir formulário.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-grow">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-sm sm:text-base">
            <ArrowLeft size={18} /> Painel
          </button>

          {cargo === 'ADMIN' && (
            <button onClick={() => navigate('/criar-checklist')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md hover:bg-blue-700 text-sm sm:text-base">
              <Plus size={18} /> NOVO
            </button>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Meus Formulários</h2>

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {checklists.map((item) => (
            <div key={item.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-800">{item.titulo}</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">ID: #{item.id}</p>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                <button 
                  onClick={() => navigate(`/executar-checklist/${item.id}`)}
                  className="flex-1 sm:flex-none bg-green-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm"
                >
                  <Play size={16} fill="white" /> PREENCHER
                </button>

                {cargo === 'ADMIN' && (
                  <button onClick={() => navigate(`/editar-checklist/${item.id}`)} className="p-2.5 sm:p-3 text-amber-600 bg-amber-50 rounded-xl">
                    <Edit3 size={18} />
                  </button>
                )}

                {cargo === 'ADMIN' && (
                  <button onClick={() => excluirChecklist(item.id)} className="p-2.5 sm:p-3 text-red-500 bg-red-50 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {checklists.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed text-gray-400">
              Nenhum formulário encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}