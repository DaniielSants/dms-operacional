import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';

export default function EditarChecklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [titulo, setTitulo] = useState('');
  const [questoes, setQuestoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const templateId = parseInt(id, 10);

      // 1. Busca dados do template no Supabase
      const { data: template, error: errTemplate } = await supabase
        .from('checklists_templates')
        .select('titulo')
        .eq('id', templateId)
        .maybeSingle();

      if (errTemplate) throw errTemplate;
      if (template) setTitulo(template.titulo);

      // 2. Busca questões do template
      const { data: qData, error: errQuestoes } = await supabase
        .from('questoes')
        .select('*')
        .eq('template_id', templateId)
        .order('id', { ascending: true });

      if (errQuestoes) throw errQuestoes;
      setQuestoes(qData || []);

    } catch (err) {
      console.error("Erro ao carregar checklist para edição:", err);
      alert("Erro ao carregar os dados do checklist.");
    } finally {
      setCarregando(false);
    }
  };

  const handleAdicionarQuestao = () => {
    setQuestoes([
      ...questoes,
      { label: '', tipo: 'texto', opcoes: '' }
    ]);
  };

  const handleRemoverQuestao = (index) => {
    const novas = questoes.filter((_, i) => i !== index);
    setQuestoes(novas);
  };

  const handleQuestaoChange = (index, campo, valor) => {
    const novas = [...questoes];
    novas[index][campo] = valor;
    setQuestoes(novas);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return alert("O título não pode ficar em branco!");

    setSalvando(true);
    try {
      const templateId = parseInt(id, 10);

      // 1. Atualiza o título do modelo
      const { error: errUpdate } = await supabase
        .from('checklists_templates')
        .update({ titulo })
        .eq('id', templateId);

      if (errUpdate) throw errUpdate;

      // 2. Apaga as questões anteriores
      const { error: errDelete } = await supabase
        .from('questoes')
        .delete()
        .eq('template_id', templateId);

      if (errDelete) throw errDelete;

      // 3. Insere a nova lista de questões
      if (questoes.length > 0) {
        const novasQuestoes = questoes.map(q => ({
          template_id: templateId,
          label: q.label,
          tipo: q.tipo,
          opcoes: q.opcoes || null
        }));

        const { error: errInsert } = await supabase
          .from('questoes')
          .insert(novasQuestoes);

        if (errInsert) throw errInsert;
      }

      alert("✅ Checklist atualizado com sucesso!");
      navigate('/checklists');

    } catch (err) {
      console.error("Erro ao salvar edições no Supabase:", err);
      alert(`❌ Erro ao salvar alterações: ${err.message || 'Verifique a conexão.'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div className="p-20 text-center font-bold text-gray-500">Carregando formulário...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/checklists')}
          className="flex items-center gap-2 text-gray-500 mb-6 font-bold hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={20} /> VOLTAR
        </button>

        <form onSubmit={salvarEdicao} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 p-6 md:p-8 text-white">
            <p className="text-xs opacity-75 font-bold uppercase tracking-widest mb-1">DMS OPERACIONAL</p>
            <h1 className="text-xl md:text-2xl font-bold italic tracking-tighter uppercase">Editar Modelo de Checklist</h1>
          </div>

          <div className="p-4 md:p-8 space-y-6">
            {/* TÍTULO DO FORMULÁRIO */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">Título do Checklist</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full border-2 rounded-xl p-3 outline-none focus:border-blue-500 font-semibold"
                placeholder="Ex: Inspeção Diária de Empilhadeira"
              />
            </div>

            {/* LISTAGEM E EDIÇÃO DAS PERGUNTAS */}
            <div className="space-y-4">
              <label className="block font-bold text-gray-700">Perguntas do Formulário</label>
              
              {questoes.map((q, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-600 uppercase">Pergunta #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoverQuestao(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                      title="Excluir Pergunta"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Digite o enunciado da pergunta"
                    value={q.label}
                    onChange={(e) => handleQuestaoChange(index, 'label', e.target.value)}
                    className="w-full border-2 rounded-xl p-3 bg-white outline-none focus:border-blue-500"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Resposta</label>
                      <select
                        value={q.tipo}
                        onChange={(e) => handleQuestaoChange(index, 'tipo', e.target.value)}
                        className="w-full border-2 rounded-xl p-3 bg-white outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="texto">Texto Curto</option>
                        <option value="select">Seleção (Opções separadas por ;)</option>
                        <option value="imagem">Foto / Evidência</option>
                        <option value="telefone">Telefone</option>
                      </select>
                    </div>

                    {(q.tipo === 'select' || q.tipo === 'escolha') && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Opções (Separadas por ponto e vírgula)</label>
                        <input
                          type="text"
                          placeholder="Conforme;Não Conforme;N/A"
                          value={q.opcoes || ''}
                          onChange={(e) => handleQuestaoChange(index, 'opcoes', e.target.value)}
                          className="w-full border-2 rounded-xl p-3 bg-white outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* BOTÃO PARA ADICIONAR NOVA PERGUNTA */}
            <button
              type="button"
              onClick={handleAdicionarQuestao}
              className="w-full py-3 border-2 border-dashed border-blue-400 text-blue-600 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-blue-50 transition-colors"
            >
              <Plus size={20} /> Adicionar Nova Pergunta
            </button>

            {/* BOTÃO DE SALVAR EDICÃO */}
            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <Loader2 className="animate-spin" size={22} /> SALVANDO ALTERAÇÕES...
                </>
              ) : (
                <>
                  <Save size={22} /> SALVAR ATUALIZAÇÃO
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}