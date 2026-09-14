import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Users, ArrowLeft, Edit2, Trash2, UserPlus, Shield, Loader2 } from 'lucide-react';

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estado para o Novo Usuário
  const [novoUsuario, setNovoUsuario] = useState({ 
    nome: '', 
    email: '', 
    senha: '', 
    cargo: 'OPERADOR' 
  });
  
  const navigate = useNavigate();
  const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
  const empresaId = parseInt(rawEmpresaId, 10);

  useEffect(() => {
    const cargo = localStorage.getItem('cargo');
    if (cargo !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    carregarUsuarios();
  }, [navigate]);

  // 1. LISTAR USUÁRIOS DO SUPABASE
  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('id', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error("Erro ao carregar colaboradores:", err);
    } finally {
      setCarregando(false);
    }
  };

  // 2. CRIAR NOVO USUÁRIO
  const handleCriar = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const rawUnidadeId = localStorage.getItem('unidade_id') || '1';
      const unidadeId = parseInt(rawUnidadeId, 10);

      const { error } = await supabase
        .from('usuarios')
        .insert([
          {
            empresa_id: empresaId,
            unidade_id: unidadeId,
            nome: novoUsuario.nome,
            email: novoUsuario.email,
            senha: novoUsuario.senha,
            cargo: novoUsuario.cargo
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          alert("❌ Este e-mail já está cadastrado!");
        } else {
          throw error;
        }
      } else {
        alert("✅ Colaborador cadastrado com sucesso!");
        setModalAberto(false);
        setNovoUsuario({ nome: '', email: '', senha: '', cargo: 'OPERADOR' });
        carregarUsuarios();
      }
    } catch (err) {
      console.error("Erro ao criar usuário:", err);
      alert(`❌ Erro ao criar colaborador: ${err.message || 'Verifique a conexão.'}`);
    } finally {
      setSalvando(false);
    }
  };

  // 3. EDITAR USUÁRIO EXISTENTE
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editando.nome,
          email: editando.email,
          senha: editando.senha,
          cargo: editando.cargo
        })
        .eq('id', editando.id);

      if (error) throw error;

      alert("✅ Permissões atualizadas com sucesso!");
      setEditando(null);
      carregarUsuarios();
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
      alert(`❌ Erro ao atualizar colaborador: ${err.message || 'Verifique a conexão.'}`);
    } finally {
      setSalvando(false);
    }
  };

  // 4. DELETAR USUÁRIO
  const handleDeletar = async (id, email) => {
    if (email === localStorage.getItem('email')) {
      return alert("Você não pode excluir a sua própria conta de usuário!");
    }

    if (window.confirm("Remover este colaborador permanentemente?")) {
      try {
        const { error } = await supabase
          .from('usuarios')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert("Colaborador removido com sucesso!");
        carregarUsuarios();
      } catch (err) {
        console.error("Erro ao deletar usuário:", err);
        alert("Erro ao remover colaborador.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold italic tracking-tighter">EQUIPE <span className="text-blue-500">DMS</span></h1>
          </div>
          <div className="flex gap-3 w-full sm:w-auto justify-between">
            <button 
              onClick={() => setModalAberto(true)} 
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all text-sm"
            >
              <UserPlus size={18} /> NOVO COLABORADOR
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>
        </header>

        {/* TABELA DE USUÁRIOS */}
        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {carregando ? (
            <div className="p-12 text-center text-gray-400 font-semibold">Carregando lista de usuários...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-semibold">Nenhum colaborador encontrado nesta empresa.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                  <tr>
                    <th className="p-5">Nome / E-mail</th>
                    <th className="p-5">Cargo</th>
                    <th className="p-5">Senha</th>
                    <th className="p-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-t border-white/5 hover:bg-white/10 transition-all">
                      <td className="p-5">
                        <p className="font-bold text-gray-200">{u.nome}</p>
                        <p className="text-xs text-gray-400 font-mono">{u.email}</p>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${u.cargo === 'ADMIN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                          {u.cargo}
                        </span>
                      </td>
                      <td className="p-5 font-mono text-gray-400">{u.senha}</td>
                      <td className="p-5 flex justify-center gap-2">
                        <button 
                          onClick={() => setEditando(u)} 
                          className="p-2 hover:bg-blue-500/20 rounded-xl text-blue-400 transition-all"
                          title="Editar Colaborador"
                        >
                          <Edit2 size={18}/>
                        </button>
                        <button 
                          onClick={() => handleDeletar(u.id, u.email)} 
                          className="p-2 hover:bg-red-500/20 rounded-xl text-red-400 transition-all"
                          title="Excluir Colaborador"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ADICIONAR COLABORADOR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><UserPlus className="text-blue-500" /> Cadastrar Acesso</h2>
            <form onSubmit={handleCriar} className="space-y-4">
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-blue-500 text-sm font-semibold" 
                placeholder="Nome Completo" 
                required 
                value={novoUsuario.nome}
                onChange={e => setNovoUsuario({...novoUsuario, nome: e.target.value})} 
              />
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-blue-500 text-sm font-semibold" 
                placeholder="E-mail de Acesso" 
                type="email" 
                required 
                value={novoUsuario.email}
                onChange={e => setNovoUsuario({...novoUsuario, email: e.target.value})} 
              />
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-blue-500 text-sm font-semibold" 
                placeholder="Senha" 
                required 
                value={novoUsuario.senha}
                onChange={e => setNovoUsuario({...novoUsuario, senha: e.target.value})} 
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold ml-1 uppercase">Tipo de Acesso</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none text-sm font-semibold text-gray-300" 
                  value={novoUsuario.cargo} 
                  onChange={e => setNovoUsuario({...novoUsuario, cargo: e.target.value})}
                >
                  <option value="OPERADOR" className="bg-slate-800 text-white">OPERADOR (Apenas Checklists)</option>
                  <option value="ADMIN" className="bg-slate-800 text-white">ADMINISTRADOR (Acesso Total)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="flex-1 bg-blue-600 py-3.5 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="animate-spin" size={18} /> : null}
                  {salvando ? "CRIANDO..." : "CRIAR CONTA"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setModalAberto(false)} 
                  className="flex-1 bg-white/5 py-3.5 rounded-2xl font-bold text-gray-400 hover:bg-white/10 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield className="text-emerald-500" /> Editar Permissões</h2>
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-emerald-500 text-sm font-semibold" 
                value={editando.nome} 
                onChange={e => setEditando({...editando, nome: e.target.value})} 
              />
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-emerald-500 text-sm font-semibold" 
                value={editando.email} 
                onChange={e => setEditando({...editando, email: e.target.value})} 
              />
              <input 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none focus:border-emerald-500 font-mono text-sm" 
                value={editando.senha} 
                onChange={e => setEditando({...editando, senha: e.target.value})} 
              />
              <select 
                className="w-full bg-black/20 border border-white/10 p-3.5 rounded-2xl outline-none text-sm font-semibold text-gray-300" 
                value={editando.cargo} 
                onChange={e => setEditando({...editando, cargo: e.target.value})}
              >
                <option value="OPERADOR" className="bg-slate-800 text-white">OPERADOR</option>
                <option value="ADMIN" className="bg-slate-800 text-white">ADMINISTRADOR</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="flex-1 bg-emerald-600 py-3.5 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="animate-spin" size={18} /> : null}
                  {salvando ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditando(null)} 
                  className="flex-1 bg-white/5 py-3.5 rounded-2xl font-bold text-gray-400 hover:bg-white/10 transition-all"
                >
                  FECHAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}