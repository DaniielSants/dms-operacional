import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, CheckCircle, Camera, Loader2, Check } from 'lucide-react';

export default function ExecutarChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('Carregando...');
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    // Busca modelo
    const { data: template, error: errTemplate } = await supabase
      .from('checklists_templates')
      .select('titulo')
      .eq('id', id)
      .maybeSingle();

    if (template) setTitulo(template.titulo);

    // Busca questões
    const { data: qData, error: errQuestoes } = await supabase
      .from('questoes')
      .select('*')
      .eq('template_id', id)
      .order('id', { ascending: true });

    if (qData) setQuestoes(qData);
  };

  const handleMudarResposta = (questaoId, valor) => {
    setRespostas(prev => ({ ...prev, [questaoId]: valor }));
  };

  // UPLOAD DA IMAGEM DIRETO PARA O BUCKET "EVIDENCIAS"
  const handleFotoUpload = async (questaoId, file) => {
    if (!file) return;
    setEnviandoImagem(true);

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('evidencias')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // URL Pública da foto
      const { data: publicUrlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(fileName);

      handleMudarResposta(questaoId, publicUrlData.publicUrl);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao fazer upload da imagem. Certifique-se de que o bucket 'evidencias' é público no Supabase.");
    } finally {
      setEnviandoImagem(false);
    }
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setSalvando(true);

    const userEmail = localStorage.getItem('email') || 'admin@dms.com';
    const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
    
    // Converte o ID para número (BIGINT no PostgreSQL)
    const empresaId = parseInt(rawEmpresaId, 10);

    // Mapeia perguntas com suas respostas
    const conteudoRespostas = questoes.map(q => ({
      pergunta: q.label,
      resposta: respostas[q.id] || ''
    }));

    const { error } = await supabase
      .from('respostas_executadas')
      .insert([
        {
          empresa_id: empresaId,
          template_id: parseInt(id, 10),
          usuario_email: userEmail,
          conteudo_respostas: conteudoRespostas
        }
      ]);

    if (!error) {
      setEnviado(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      console.error("Erro ao salvar resposta no Supabase:", error);
      alert(`Erro ao salvar o checklist: ${error.message || 'Verifique a conexão.'}`);
    }
    setSalvando(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 mb-4 sm:mb-6 font-bold text-sm sm:text-base">
          <ArrowLeft size={18} /> VOLTAR
        </button>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border overflow-hidden">
          {enviado ? (
            <div className="p-10 sm:p-20 text-center">
              <CheckCircle size={50} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold">CONCLUÍDO!</h2>
              <p className="text-gray-500 text-sm mt-2">Redirecionando para o Dashboard...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-600 p-5 sm:p-8 text-white">
                <p className="text-[10px] sm:text-xs opacity-75 font-bold uppercase tracking-widest mb-1">DMS OPERACIONAL</p>
                <h1 className="text-xl sm:text-2xl font-bold italic tracking-tighter uppercase">{titulo}</h1>
              </div>

              <form onSubmit={enviarFormulario} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                {questoes.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <label className="block font-bold text-gray-700 text-sm sm:text-base">{q.label}</label>

                    {(q.tipo === 'select' || q.tipo === 'escolha') && (
                      <select required className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" onChange={e => handleMudarResposta(q.id, e.target.value)}>
                        <option value="">Selecione uma opção...</option>
                        {q.opcoes?.split(';').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {q.tipo === 'texto' && <input type="text" required className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" onChange={e => handleMudarResposta(q.id, e.target.value)} />}
                    {q.tipo === 'telefone' && <input type="tel" required placeholder="(00) 00000-0000" className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" onChange={e => handleMudarResposta(q.id, e.target.value)} />}

                    {q.tipo === 'imagem' && (
                      <div onClick={() => document.getElementById(`f-${q.id}`).click()} className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all ${respostas[q.id] ? 'bg-green-50 border-green-400' : 'hover:bg-gray-50'}`}>
                        {enviandoImagem ? (
                          <Loader2 className="animate-spin mx-auto text-blue-600" size={24} />
                        ) : respostas[q.id] ? (
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 bg-green-500 text-white rounded-full mb-1"><Check size={16} /></div>
                            <span className="text-xs font-bold text-green-700">Foto Anexada na Nuvem!</span>
                          </div>
                        ) : (
                          <>
                            <Camera className="mx-auto text-gray-400 mb-1" size={24} />
                            <span className="text-xs font-semibold text-gray-600">Toque para tirar ou anexar foto</span>
                          </>
                        )}
                        <input id={`f-${q.id}`} type="file" accept="image/*" className="hidden" onChange={e => handleFotoUpload(q.id, e.target.files[0])} />
                      </div>
                    )}
                  </div>
                ))}

                <button type="submit" disabled={salvando || enviandoImagem} className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? "SALVANDO..." : "FINALIZAR E SALVAR"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}