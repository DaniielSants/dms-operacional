import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';

export default function CriarChecklist() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [questoes, setQuestoes] = useState([{ label: '', tipo: 'texto', opcoes: '' }]);
  const [salvando, setSalvando] = useState(false);

  const adicionarPergunta = () => {
    setQuestoes([...questoes, { label: '', tipo: 'texto', opcoes: '' }]);
  };

  const removerPergunta = (index) => {
    const novas = questoes.filter((_, i) => i !== index);
    setQuestoes(novas);
  };

  const atualizarPergunta = (index, campo, valor) => {
    const novas = [...questoes];
    novas[index][campo] = valor;
    setQuestoes(novas);
  };

  const salvar = async () => {
    if (!titulo.trim()) return alert("Dê um título ao checklist!");
    
    // Valida se as perguntas possuem título
    const perguntaVazia = questoes.some(q => !q.label.trim());
    if (perguntaVazia) return alert("Preencha o texto de todas as perguntas antes de salvar!");

    setSalvando(true);

    try {
      const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
      const empresaId = parseInt(rawEmpresaId, 10);

      // 1. Criar o template no Supabase
      const { data: template, error: errTemplate } = await supabase
        .from('checklists_templates')
        .insert([{ empresa_id: empresaId, titulo }])
        .select()
        .single();

      if (errTemplate) throw errTemplate;

      // 2. Mapear e criar as questões associadas ao ID do template recém-criado
      const questoesFormatadas = questoes.map(q => ({
        template_id: template.id,
        label: q.label,
        tipo: q.tipo,
        opcoes: q.opcoes || null
      }));

      const { error: errQuestoes } = await supabase
        .from('questoes')
        .insert(questoesFormatadas);

      if (errQuestoes) throw errQuestoes;

      alert("✅ Checklist salvo com sucesso no Supabase!");
      navigate('/dashboard');

    } catch (error) {
      console.error("Erro ao salvar checklist:", error);
      alert(`❌ Erro ao salvar: ${error.message || 'Verifique a conexão.'}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Voltar ao Painel
          </button>
          
          <button 
            onClick={salvar} 
            disabled={salvando}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {salvando ? "SALVANDO..." : "SALVAR CHECKLIST"}
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
          <label className="text-xs font-black text-blue-600 uppercase tracking-widest">Título do Formulário</label>
          <input 
            type="text" 
            placeholder="Ex: Checklist de Abertura" 
            className="w-full text-2xl font-bold border-b-2 outline-none focus:border-blue-500 pb-2 transition-all"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {questoes.map((q, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl border shadow-sm flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-1 space-y-4">
                <input 
                  placeholder="Digite a pergunta ou instrução..." 
                  className="w-full border-none text-lg font-bold text-gray-700 outline-none"
                  value={q.label}
                  onChange={(e) => atualizarPergunta(index, 'label', e.target.value)}
                />
                <div className="flex gap-4">
                  <select 
                    className="bg-gray-50 border rounded-lg p-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={q.tipo}
                    onChange={(e) => atualizarPergunta(index, 'tipo', e.target.value)}
                  >
                    <option value="texto">Texto Curto</option>
                    <option value="select">Múltipla Escolha</option>
                    <option value="imagem">Foto/Câmera</option>
                    <option value="telefone">Telefone</option>
                  </select>
                  {q.tipo === 'select' && (
                    <input 
                      placeholder="Opções (separe por ponto e vírgula ;)" 
                      className="flex-1 border-b text-sm outline-none focus:border-blue-500"
                      value={q.opcoes}
                      onChange={(e) => atualizarPergunta(index, 'opcoes', e.target.value)}
                    />
                  )}
                </div>
              </div>
              {questoes.length > 1 && (
                <button onClick={() => removerPergunta(index)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={adicionarPergunta}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:bg-white hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> ADICIONAR NOVA PERGUNTA
        </button>

        {/* ASSINATURA DMS */}
        <div className="pt-8 text-center">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            Developed by <span className="text-blue-500">Daniel Santos</span>
          </p>
        </div>
      </div>
    </div>
  );
}