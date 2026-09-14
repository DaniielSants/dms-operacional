import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, FileText, Clock, Eye, User, Trash2, Folder, ChevronRight } from 'lucide-react';

export default function MeusRelatorios() {
  const [modelos, setModelos] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [modeloSelecionado, setModeloSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const email = localStorage.getItem('email');
  const rawEmpresaId = localStorage.getItem('empresa_id');
  const cargo = localStorage.getItem('cargo');

  useEffect(() => {
    carregarInicial();
  }, [email, rawEmpresaId, cargo]);

  // FORMATADOR QUE EXTRAI A HORA REGISTRADA DAS RESPOSTAS SEM DAR BUG DE FUSO
  const formatarDataBR = (item) => {
    if (Array.isArray(item.conteudo_respostas)) {
      const respHora = item.conteudo_respostas.find(r => {
        const p = String(r.pergunta || '').toLowerCase();
        const resp = String(r.resposta || '').trim();
        const ehFormatoHora = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(resp);
        return p.includes('hora') || p.includes('horário') || p.includes('data') || ehFormatoHora;
      });

      if (respHora && respHora.resposta) {
        const rawDate = item.created_at || item.data_finalizada;
        if (rawDate) {
          const stringData = String(rawDate).split('T')[0];
          const partes = stringData.split('-');
          if (partes.length === 3) {
            const [ano, mes, dia] = partes;
            return `${dia}/${mes}/${ano}, ${respHora.resposta}`;
          }
        }
        return respHora.resposta;
      }
    }

    const dataBruta = item.created_at || item.data_finalizada || item.createdat;
    if (!dataBruta) return 'Sem Data';

    const stringData = String(dataBruta);

    if (stringData.includes('T') && stringData.includes('Z')) {
      try {
        const dt = new Date(stringData);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        console.error("Erro ao formatar data ISO:", e);
      }
    }

    const partes = stringData.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }

    return stringData;
  };

  // NÍVEL 1: CARREGA OS MODELOS E CONTABILIZA OS REGISTROS DE CADA UM
  const carregarInicial = async () => {
    try {
      setLoading(true);
      const empresaIdNum = rawEmpresaId ? parseInt(rawEmpresaId, 10) : null;

      // 1. Busca todos os templates cadastrados
      let queryTemplates = supabase.from('checklists_templates').select('id, titulo');
      if (empresaIdNum) queryTemplates = queryTemplates.eq('empresa_id', empresaIdNum);
      const { data: templatesData } = await queryTemplates;

      // 2. Busca todas as respostas executadas
      let queryRespostas = supabase.from('respostas_executadas').select('id, template_id, usuario_email');
      if (empresaIdNum) queryRespostas = queryRespostas.eq('empresa_id', empresaIdNum);
      if (cargo !== 'ADMIN' && email) queryRespostas = queryRespostas.eq('usuario_email', email);
      const { data: respostasData } = await queryRespostas;

      const envios = respostasData || [];
      const templates = templatesData || [];

      // Monta o dicionário de modelos
      const mapaModelos = {};

      templates.forEach(t => {
        mapaModelos[t.id] = {
          id: t.id,
          titulo: t.titulo,
          total: 0
        };
      });

      envios.forEach(r => {
        if (r.template_id && mapaModelos[r.template_id]) {
          mapaModelos[r.template_id].total += 1;
        } else if (r.template_id) {
          mapaModelos[r.template_id] = {
            id: r.template_id,
            titulo: `Checklist #${r.template_id}`,
            total: 1
          };
        }
      });

      setModelos(Object.values(mapaModelos));
    } catch (err) {
      console.error("Erro ao carregar modelos:", err);
    } finally {
      setLoading(false);
    }
  };

  // NÍVEL 2: BUSCA OS REGISTROS ESPECÍFICOS DO MODELO CLICADO
  const selecionarModelo = async (modelo) => {
    setModeloSelecionado(modelo);
    setLoading(true);

    try {
      const empresaIdNum = rawEmpresaId ? parseInt(rawEmpresaId, 10) : null;

      let query = supabase
        .from('respostas_executadas')
        .select('*')
        .eq('template_id', modelo.id)
        .order('id', { ascending: false });

      if (empresaIdNum) query = query.eq('empresa_id', empresaIdNum);
      if (cargo !== 'ADMIN' && email) query = query.eq('usuario_email', email);

      const { data, error } = await query;

      if (!error && data) {
        const formatados = data.map(item => ({
          id: item.id,
          titulo: modelo.titulo,
          data_finalizada: formatarDataBR(item),
          usuario_email: item.usuario_email
        }));
        setRelatorios(formatados);
      } else {
        setRelatorios([]);
      }
    } catch (err) {
      console.error("Erro ao carregar registros do modelo:", err);
    } finally {
      setLoading(false);
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
      setModelos(prev => prev.map(m => m.id === modeloSelecionado.id ? { ...m, total: Math.max(0, m.total - 1) } : m));
    } else {
      alert("Erro ao excluir o relatório no Supabase.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* NAVEGAÇÃO DE VOLTAR */}
        <button 
          onClick={() => {
            if (modeloSelecionado) {
              setModeloSelecionado(null);
            } else {
              navigate('/dashboard');
            }
          }} 
          className="flex items-center gap-2 text-gray-500 mb-6 hover:text-blue-600 transition-colors text-sm sm:text-base font-medium"
        >
          <ArrowLeft size={18} /> {modeloSelecionado ? 'Voltar aos Checklists' : 'Voltar'}
        </button>

        {/* TÍTULO DINÂMICO */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} /> 
          {modeloSelecionado ? (
            <span>Registros de: <strong className="text-blue-600">{modeloSelecionado.titulo}</strong></span>
          ) : (
            <span>{cargo === 'ADMIN' ? 'Histórico de Checklists' : 'Meus Envios'}</span>
          )}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">
            Carregando...
          </div>
        ) : !modeloSelecionado ? (
          /* NÍVEL 1: LISTA DE PASTAS/MODELOS DE CHECKLIST */
          <div className="grid gap-3 sm:gap-4">
            {modelos.map((mod) => (
              <div 
                key={mod.id} 
                onClick={() => selecionarModelo(mod)}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <Folder size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate">{mod.titulo}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {mod.total} {mod.total === 1 ? 'registro encontrado' : 'registros encontrados'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <span className="hidden sm:inline">Ver Registros</span>
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}

            {modelos.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-4">
                <p className="text-gray-400 text-sm sm:text-base">Nenhum checklist preenchido foi encontrado.</p>
              </div>
            )}
          </div>
        ) : (
          /* NÍVEL 2: REGISTROS FILTRADOS POR ESSE CHECKLIST */
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
                        <span className="truncate">RESP: {rel.usuario_email}</span>
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
                <p className="text-gray-400 text-sm sm:text-base">Nenhum registro encontrado para este checklist.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}