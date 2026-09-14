import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { UserPlus, ArrowLeft, Trash2, Users, Loader2 } from 'lucide-react';

export default function Usuarios() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'OPERADOR' });
  const [usuariosList, setUsuariosList] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const cargo = localStorage.getItem('cargo');
    if (cargo !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    carregarUsuarios();
  }, [navigate]);

  const carregarUsuarios = async () => {
    setCarregando(true);
    try {
      const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
      const empresaId = parseInt(rawEmpresaId, 10);

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo')
        .eq('empresa_id', empresaId)
        .order('id', { ascending: true });

      if (error) throw error;
      setUsuariosList(data || []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setCarregando(false);
    }
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const rawEmpresaId = localStorage.getItem('empresa_id') || '1';
      const rawUnidadeId = localStorage.getItem('unidade_id') || '1';

      const empresaId = parseInt(rawEmpresaId, 10);
      const unidadeId = parseInt(rawUnidadeId, 10);

      const { error } = await supabase
        .from('usuarios')
        .insert([
          {
            empresa_id: empresaId,
            unidade_id: unidadeId,
            nome: form.nome,
            email: form.email,
            senha: form.senha,
            cargo: form.cargo
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          alert("❌ Este e-mail já está cadastrado!");
        } else {
          throw error;
        }
      } else {
        alert("✅ Usuário cadastrado com sucesso!");
        setForm({ nome: '', email: '', senha: '', cargo: 'OPERADOR' });
        carregarUsuarios();
      }
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      alert(`❌ Erro ao cadastrar usuário: ${err.message || 'Verifique a conexão.'}`);
    } finally {
      setSalvando(false);
    }
  };

  const excluirUsuario = async (id, email) => {
    if (email === localStorage.getItem('email')) {
      return alert("Você não pode excluir o seu próprio usuário!");
    }

    if (!window.confirm("Tem certeza que deseja remover este colaborador?")) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert("Usuário removido!");
      carregarUsuarios();
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      alert("Erro ao remover usuário.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold"
        >
          <ArrowLeft size={20} /> Voltar ao Painel
        </button>

        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white rounded-2xl shadow-xl border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 text-blue-600">
            <UserPlus size={28} />
            <h2 className="text-2xl font-bold">Cadastrar Colaborador</h2>
          </div>

          <form onSubmit={salvarUsuario} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                <input 
                  type="text"
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                  required 
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">E-mail de Login</label>
                <input 
                  type="email" 
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                  required 
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Senha</label>
                <input 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                  required 
                  value={form.senha}
                  onChange={e => setForm({...form, senha: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Cargo</label>
                <select 
                  className="w-full border rounded-xl p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" 
                  value={form.cargo} 
                  onChange={e => setForm({...form, cargo: e.target.value})}
                >
                  <option value="OPERADOR">OPERADOR</option>
                  <option value="ADMIN">ADMINISTRADOR</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={salvando}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="animate-spin" size={20} /> : null}
              {salvando ? "CADASTRANDO..." : "FINALIZAR CADASTRO"}
            </button>
          </form>
        </div>

        {/* LISTAGEM DE COLABORADORES */}
        <div className="bg-white rounded-2xl shadow-md border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 text-gray-800">
            <Users size={24} />
            <h3 className="text-xl font-bold">Colaboradores Cadastrados</h3>
          </div>

          {carregando ? (
            <p className="text-gray-400 font-semibold text-center py-4">Carregando lista de equipe...</p>
          ) : usuariosList.length === 0 ? (
            <p className="text-gray-400 font-semibold text-center py-4">Nenhum colaborador encontrado.</p>
          ) : (
            <div className="space-y-3">
              {usuariosList.map((u) => (
                <div key={u.id} className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{u.nome}</span>
                      <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
                        {u.cargo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  
                  <button 
                    onClick={() => excluirUsuario(u.id, u.email)}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Excluir Colaborador"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}