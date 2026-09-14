import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, Printer, Calendar, User, ClipboardCheck, ImageIcon } from 'lucide-react';

export default function DetalhesRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  const formatarDataHora = (dataString) => {
    if (!dataString) return 'Data N/A';
    const stringData = String(dataString);
    if (stringData.includes('T')) {
      return new Date(stringData).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    const partes = stringData.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return stringData;
  };

  const carregarDetalhes = async () => {
    try {
      // 1. Busca pura no respostas_executadas sem dependência de join
      const { data, error } = await supabase
        .from('respostas_executadas')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error("Erro Supabase:", error);
        setErro(true);
        return;
      }

      let tituloChecklist = `Inspeção #${data.id}`;

      // 2. Busca o nome do template separadamente para não quebrar a tela se falhar
      if (data.template_id) {
        const { data: tData } = await supabase
          .from('checklists_templates')
          .select('titulo')
          .eq('id', data.template_id)
          .maybeSingle();

        if (tData?.titulo) {
          tituloChecklist = tData.titulo;
        }
      }

      setDados({
        titulo: tituloChecklist,
        data_finalizada: formatarDataHora(data.created_at || data.data_finalizada),
        usuario_email: data.usuario_email || 'Não informado',
        conteudo_respostas: data.conteudo_respostas || []
      });
    } catch (e) {
      console.error("Erro inesperado:", e);
      setErro(true);
    }
  };

  if (erro) {
    return (
      <div className="p-10 text-center font-bold text-red-500 space-y-4">
        <p>Erro ao carregar o relatório.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
        >
          Voltar aos relatórios
        </button>
      </div>
    );
  }

  if (!dados) return <div className="p-20 text-center font-bold text-gray-500">Carregando relatório...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6 no-print">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium text-sm sm:text-base">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md text-sm sm:text-base">
            <Printer size={16} /> <span className="hidden sm:inline">IMPRIMIR PDF</span><span className="sm:hidden">PDF</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 p-5 sm:p-8 text-white">
            <h1 className="text-xl sm:text-2xl font-black italic">DMS OPERACIONAL</h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-widest">Relatório de Inspeção Finalizado</p>
          </div>

          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-lg shrink-0"><ClipboardCheck size={20} className="text-blue-600"/></div>
                <div className="min-w-0"><p className="text-[10px] uppercase font-black text-gray-400">Checklist</p><p className="font-bold text-sm sm:text-base truncate">{dados.titulo}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-lg shrink-0"><Calendar size={20} className="text-blue-600"/></div>
                <div><p className="text-[10px] uppercase font-black text-gray-400">Data e Hora</p><p className="font-bold text-sm sm:text-base">{dados.data_finalizada}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-50 rounded-lg shrink-0"><User size={20} className="text-blue-600"/></div>
                <div className="min-w-0"><p className="text-[10px] uppercase font-black text-gray-400">Responsável</p><p className="font-bold text-sm sm:text-base truncate">{dados.usuario_email}</p></div>
              </div>
            </div>

            <div className="space-y-4">
              {dados.conteudo_respostas.map((item, index) => {
                const valorResposta = String(item.resposta || '');
                const ehUrlFoto = valorResposta.startsWith('http');

                return (
                  <div key={index} className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100">
                    <p className="text-base sm:text-lg font-bold text-gray-800 mb-3">{item.pergunta}</p>
                    
                    <div className="flex justify-between items-center bg-white p-3.5 sm:p-4 rounded-xl shadow-sm">
                      <p className="font-medium text-gray-600 text-sm sm:text-base truncate pr-2">
                        {ehUrlFoto ? (
                          <span className="flex items-center gap-2 text-blue-500 font-bold">
                            <ImageIcon size={18}/> Evidência Anexada
                          </span>
                        ) : valorResposta}
                      </p>
                    </div>

                    {ehUrlFoto && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-[10px] uppercase font-black text-gray-400 mb-2 flex items-center gap-1">
                          <ImageIcon size={14} className="text-blue-600" /> Evidência Fotográfica
                        </p>
                        <img 
                          src={valorResposta} 
                          alt="Evidência Fotográfica" 
                          className="w-full max-w-full md:max-w-md h-auto rounded-lg border border-gray-200 shadow-sm object-cover"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}