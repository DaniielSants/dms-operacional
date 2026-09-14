import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, CheckCircle, Camera, Loader2, Check, Clock } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function ExecutarChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('Carregando...');
  const [questoes, setQuestoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Controle individual de upload de imagem por questão
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    // Busca modelo
    const { data: template } = await supabase
      .from('checklists_templates')
      .select('titulo')
      .eq('id', id)
      .maybeSingle();

    if (template) setTitulo(template.titulo);

    // Busca questões
    const { data: qData } = await supabase
      .from('questoes')
      .select('*')
      .eq('template_id', id)
      .order('id', { ascending: true });

    if (qData) {
      setQuestoes(qData);

      // Gera a hora local atual no formato HH:mm (Ex: "20:20")
      const horaAtual = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Atribui a hora atual automaticamente a todas as perguntas do tipo 'hora'
      const respostasIniciais = {};
      qData.forEach(q => {
        if (q.tipo === 'hora') {
          respostasIniciais[q.id] = horaAtual;
        }
      });

      setRespostas(prev => ({ ...respostasIniciais, ...prev }));
    }
  };

  const handleMudarResposta = (questaoId, valor) => {
    setRespostas(prev => ({ ...prev, [questaoId]: valor }));
  };

  // FUNÇÃO AUXILIAR DE COMPRESSÃO DE IMAGEM
  const comprimirImagem = async (file) => {
    const options = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1080,
      useWebWorker: true,
      fileType: 'image/webp'
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Erro ao comprimir imagem, usando original:", error);
      return file;
    }
  };

  // UPLOAD DA IMAGEM INDIVIDUAL
  const handleFotoUpload = async (questaoId, file) => {
    if (!file) return;
    
    setUploadingId(questaoId);

    try {
      const fotoComprimida = await comprimirImagem(file);
      const rawName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${Date.now()}_${rawName}.webp`;

      const { error } = await supabase.storage
        .from('evidencias')
        .upload(fileName, fotoComprimida, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(fileName);

      handleMudarResposta(questaoId, publicUrlData.publicUrl);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao fazer upload da imagem. Certifique-se de que o bucket 'evidencias' é público no Supabase.");
    } finally {
      setUploadingId(null);
    }
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setSalvando(true);

    const userEmail = localStorage.getItem('email') || 'admin@dms.com';
    const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
    const empresaId = parseInt(rawEmpresaId, 10);

    const conteudoRespostas = questoes.map(q => ({
      pergunta: q.label,
      resposta: respostas[q.id] || ''
    }));

    const agoraIso = new Date().toISOString();

    const { error } = await supabase
      .from('respostas_executadas')
      .insert([
        {
          empresa_id: empresaId,
          template_id: parseInt(id, 10),
          usuario_email: userEmail,
          conteudo_respostas: conteudoRespostas,
          data_finalizada: agoraIso
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
                      <select 
                        required 
                        className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" 
                        value={respostas[q.id] || ''}
                        onChange={e => handleMudarResposta(q.id, e.target.value)}
                      >
                        <option value="">Selecione uma opção...</option>
                        {q.opcoes?.split(';').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {q.tipo === 'texto' && (
                      <input 
                        type="text" 
                        required 
                        className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" 
                        value={respostas[q.id] || ''}
                        onChange={e => handleMudarResposta(q.id, e.target.value)} 
                      />
                    )}

                    {q.tipo === 'telefone' && (
                      <input 
                        type="tel" 
                        required 
                        placeholder="(00) 00000-0000" 
                        className="w-full border-2 rounded-xl p-3 text-sm sm:text-base" 
                        value={respostas[q.id] || ''}
                        onChange={e => handleMudarResposta(q.id, e.target.value)} 
                      />
                    )}

                    {/* CAMPO HORA CORRIGIDO COM VALUE FIXO E AUTO-PREENCHIMENTO */}
                    {q.tipo === 'hora' && (
                      <div className="space-y-1">
                        <div className="relative flex items-center">
                          <input 
                            type="time" 
                            required
                            value={respostas[q.id] || ''} 
                            onChange={e => handleMudarResposta(q.id, e.target.value)}
                            className="w-full border-2 border-blue-200 bg-white font-bold text-gray-800 rounded-xl p-3 text-sm sm:text-base focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 italic flex items-center gap-1">
                          <Clock size={12} /> Horário capturado automaticamente. Você pode alterar se necessário.
                        </p>
                      </div>
                    )}

                    {/* CAMPO FOTO COM CARREGAMENTO ISOLADO */}
                    {q.tipo === 'imagem' && (
                      <div 
                        onClick={() => {
                          if (uploadingId !== q.id) {
                            document.getElementById(`f-${q.id}`).click();
                          }
                        }} 
                        className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all ${respostas[q.id] ? 'bg-green-50 border-green-400' : 'hover:bg-gray-50'}`}
                      >
                        {uploadingId === q.id ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                            <span className="text-xs font-semibold text-blue-600">Enviando foto...</span>
                          </div>
                        ) : respostas[q.id] ? (
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 bg-green-500 text-white rounded-full mb-1"><Check size={16} /></div>
                            <span className="text-xs font-bold text-green-700">Foto Anexada na Nuvem!</span>
                            <span className="text-[10px] text-gray-400 mt-1">Toque para substituir</span>
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

                <button 
                  type="submit" 
                  disabled={salvando || uploadingId !== null} 
                  className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50"
                >
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