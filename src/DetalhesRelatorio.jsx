import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  ArrowLeft, 
  Printer, 
  Calendar, 
  User, 
  ClipboardCheck, 
  ImageIcon, 
  Trash2, 
  Loader2 
} from 'lucide-react';

export default function DetalhesRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Perfil do usuário para validar permissões de exclusão
  const rawUsuario = localStorage.getItem('dms_usuario');
  const usuarioObj = rawUsuario ? JSON.parse(rawUsuario) : {};
  const cargo = usuarioObj.cargo || localStorage.getItem('cargo') || 'OPERADOR';
  const podeExcluir = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_EMPRESA'].includes(cargo);

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
    setCarregando(true);
    try {
      // 1. Busca no respostas_executadas
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

      // 2. Busca o nome do template
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
        id: data.id,
        titulo: tituloChecklist,
        data_finalizada: formatarDataHora(data.created_at || data.data_finalizada),
        usuario_email: data.usuario_email || 'Não informado',
        conteudo_respostas: Array.isArray(data.conteudo_respostas) ? data.conteudo_respostas : []
      });
    } catch (e) {
      console.error("Erro inesperado:", e);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };

  const handleExcluirRelatorio = async () => {
    if (!window.confirm('Tem certeza de que deseja apagar permanentemente este relatório?')) return;

    try {
      const { error } = await supabase
        .from('respostas_executadas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Relatório excluído com sucesso!');
      navigate('/historico');
    } catch (err) {
      alert('Erro ao apagar relatório: ' + err.message);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 font-bold text-gray-500">
          <Loader2 className="animate-spin text-blue-600" size={24} /> Carregando relatório...
        </div>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="font-bold text-red-500 text-lg">Erro ao carregar os detalhes do relatório.</p>
        <button 
          onClick={() => navigate('/historico')} 
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
        >
          Voltar aos relatórios
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6 md:p-8">
      {/* Estilos para ocultar botões na impressão do navegador */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-xl { box-shadow: none !important; }
          .border { border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-4">
        
        {/* BARRA DE AÇÕES (VOLTAR, IMPRIMIR E DELETAR) */}
        <div className="flex justify-between items-center no-print">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold text-sm"
          >
            <ArrowLeft size={18} /> Voltar
          </button>

          <div className="flex items-center gap-2">
            {podeExcluir && (
              <button 
                onClick={handleExcluirRelatorio} 
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
                title="Excluir Relatório"
              >
                <Trash2 size={16} /> Excluir
              </button>
            )}

            <button 
              onClick={() => window.print()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md text-sm transition-all"
            >
              <Printer size={16} /> Imprimir / PDF
            </button>
          </div>
        </div>

        {/* FICHA DO RELATÓRIO */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* CABEÇALHO */}
          <div className="bg-blue-600 p-5 sm:p-8 text-white">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter">DMS OPERACIONAL</h1>
            <p className="text-blue-100 text-xs sm:text-sm font-bold uppercase tracking-widest mt-0.5">
              Relatório de Inspeção Finalizado
            </p>
          </div>

          <div className="p-4 sm:p-8 space-y-6">
            
            {/* INFORMAÇÕES DE CABEÇALHO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <ClipboardCheck size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-black text-gray-400">Checklist</p>
                  <p className="font-bold text-sm text-gray-800 truncate">{dados.titulo}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400">Data e Hora</p>
                  <p className="font-bold text-sm text-gray-800">{dados.data_finalizada}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-black text-gray-400">Responsável</p>
                  <p className="font-bold text-sm text-gray-800 truncate">{dados.usuario_email}</p>
                </div>
              </div>
            </div>

            {/* RESPOSTAS REGISTRADAS */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Respostas Registradas</h2>

              {dados.conteudo_respostas.map((item, index) => {
                const valorResposta = String(item.resposta || '');
                const ehImagem = valorResposta.startsWith('http') || valorResposta.startsWith('data:image');

                return (
                  <div key={index} className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-3">
                    <p className="text-sm sm:text-base font-bold text-gray-800">{item.pergunta}</p>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      {ehImagem ? (
                        <div className="space-y-3">
                          <span className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                            <ImageIcon size={16} /> Evidência Fotográfica
                          </span>
                          <img 
                            src={valorResposta} 
                            alt="Evidência Fotográfica" 
                            className="w-full max-w-md h-auto rounded-xl border border-gray-200 shadow-sm object-cover"
                          />
                        </div>
                      ) : (
                        <p className="font-semibold text-gray-700 text-sm">{valorResposta || 'Sem resposta'}</p>
                      )}
                    </div>
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