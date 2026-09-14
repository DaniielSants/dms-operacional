import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { LogIn, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);

    try {
      // Consulta direta no Supabase usando .maybeSingle() para evitar erro 406
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', senha)
        .maybeSingle();

      if (error) {
        console.error("Erro na consulta Supabase:", error);
        alert("Erro de comunicação com o banco de dados.");
      } else if (!data) {
        alert("E-mail ou senha incorretos!");
      } else {
        // Armazena as sessões do usuário no LocalStorage
        localStorage.setItem('email', data.email);
        localStorage.setItem('nome', data.nome);
        localStorage.setItem('cargo', data.cargo);
        localStorage.setItem('empresa_id', data.empresa_id);
        
        // Redireciona para o Painel
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro ao conectar com o sistema.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h1 className="text-2xl font-black italic tracking-tighter">DMS OPERACIONAL</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Acesso ao Sistema</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dms.com"
                className="w-full border-2 rounded-xl py-3 pl-10 pr-3 outline-none focus:border-blue-500 text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 rounded-xl py-3 pl-10 pr-3 outline-none focus:border-blue-500 text-sm font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {carregando ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <LogIn size={18} /> ENTRAR
              </>
            )}
          </button>
             {/* ASSINATURA DMS */}
        <div className="pt-8 text-center">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            Developed by <span className="text-blue-500">Daniel Santos</span>
          </p>
        </div>
        </form>
      </div>
    </div>
  );
}