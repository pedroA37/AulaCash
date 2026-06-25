import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';


export default function Perfil() {
  const { usuario, logout, setUsuario } = useAuth();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState('');


  // Edición de alias
  const [editandoAlias, setEditandoAlias] = useState(false);
  const [nuevoAlias, setNuevoAlias] = useState('');
  const [guardandoAlias, setGuardandoAlias] = useState(false);
  const [errorAlias, setErrorAlias] = useState('');

  // Edición de email
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [guardandoEmail, setGuardandoEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');

  function copiar(texto, tipo) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(tipo);
      setTimeout(() => setCopiado(''), 2000);
    });
  }

  function abrirEditAlias() {
    setNuevoAlias(usuario.alias);
    setErrorAlias('');
    setEditandoAlias(true);
  }

  async function guardarAlias() {
    if (!nuevoAlias.trim() || nuevoAlias.trim() === usuario.alias) {
      setEditandoAlias(false);
      return;
    }
    setGuardandoAlias(true);
    setErrorAlias('');
    try {
      const { data } = await api.patch('/cuenta/alias', { alias: nuevoAlias.trim() });
      setUsuario((u) => ({ ...u, alias: data.alias }));
      setEditandoAlias(false);
    } catch (err) {
      setErrorAlias(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardandoAlias(false);
    }
  }

  function abrirEditEmail() {
    setNuevoEmail(usuario.email);
    setErrorEmail('');
    setEditandoEmail(true);
  }

  async function guardarEmail() {
    if (!nuevoEmail.trim() || nuevoEmail.trim() === usuario.email) {
      setEditandoEmail(false);
      return;
    }
    setGuardandoEmail(true);
    setErrorEmail('');
    try {
      const { data } = await api.patch('/cuenta/email', { email: nuevoEmail.trim() });
      setUsuario((u) => ({ ...u, email: data.email }));
      setEditandoEmail(false);
    } catch (err) {
      setErrorEmail(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardandoEmail(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!usuario) return null;

  return (
    <Layout titulo="Mi perfil">

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6 pt-2">
        <div className="w-20 h-20 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[28px] elevation-l2 mb-3">
          {usuario.nombre[0]}{usuario.apellido[0]}
        </div>
        <h2 className="text-[20px] font-bold text-[#1a1c1c]">{usuario.nombre} {usuario.apellido}</h2>
        {usuario.rol === 'admin' && (
          <span className="mt-2 px-3 py-1 bg-[#009ee3]/10 text-[#006492] text-[12px] font-semibold rounded-full">
            Administrador
          </span>
        )}
      </div>

      {/* Datos de la cuenta */}
      <div className="bg-white rounded-2xl elevation-l1 overflow-hidden mb-4">
        <p className="px-4 pt-4 pb-2 text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Datos de la cuenta</p>

        {/* Alias — editable */}
        <div className="px-4 py-3 border-t border-[#eeeeee]">
          <p className="text-[12px] text-[#5f5e5e] mb-1">Alias</p>
          {editandoAlias ? (
            <div className="space-y-2">
              <input
                type="text"
                value={nuevoAlias}
                onChange={(e) => setNuevoAlias(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') guardarAlias(); if (e.key === 'Escape') setEditandoAlias(false); }}
                className="w-full h-10 px-3 bg-[#f3f3f3] rounded-xl border-2 border-[#009ee3] outline-none text-[15px] font-mono text-[#1a1c1c]"
                autoFocus
              />
              {errorAlias && <p className="text-[12px] text-[#ba1a1a]">{errorAlias}</p>}
              <div className="flex gap-2">
                <button
                  onClick={guardarAlias}
                  disabled={guardandoAlias}
                  className="flex-1 h-9 bg-[#009ee3] text-white text-[13px] font-semibold rounded-lg disabled:opacity-60"
                >
                  {guardandoAlias ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoAlias(false)}
                  className="flex-1 h-9 bg-[#eeeeee] text-[#5f5e5e] text-[13px] font-semibold rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => copiar(usuario.alias, 'alias')}
                className="flex-1 text-left flex items-center gap-2 active:opacity-60 transition-opacity"
              >
                <p className="text-[14px] font-semibold text-[#1a1c1c] font-mono">{usuario.alias}</p>
                <span className={`material-symbols-outlined text-[16px] transition-colors ${copiado === 'alias' ? 'text-[#006e2a]' : 'text-[#bec8d2]'}`}>
                  {copiado === 'alias' ? 'check' : 'content_copy'}
                </span>
              </button>
              <button onClick={abrirEditAlias} className="text-[#006492] p-2 flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
          )}
        </div>

        {/* CBU */}
        <button
          onClick={() => copiar(usuario.cbu, 'cbu')}
          className="w-full px-4 py-3 border-t border-[#eeeeee] active:bg-[#f3f3f3] transition-colors text-left"
        >
          <p className="text-[12px] text-[#5f5e5e]">CBU</p>
          <div className="flex items-center gap-1">
            <p className="text-[14px] font-semibold text-[#1a1c1c] font-mono">{usuario.cbu}</p>
            <span className={`material-symbols-outlined text-[16px] transition-colors ${copiado === 'cbu' ? 'text-[#006e2a]' : 'text-[#bec8d2]'}`}>
              {copiado === 'cbu' ? 'check' : 'content_copy'}
            </span>
          </div>
        </button>

        {/* DNI */}
        <div className="flex items-center px-4 py-3 border-t border-[#eeeeee]">
          <div>
            <p className="text-[12px] text-[#5f5e5e]">DNI</p>
            <p className="text-[14px] font-semibold text-[#1a1c1c] font-mono">{usuario.dni}</p>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-2xl elevation-l1 overflow-hidden mb-4">
        <p className="px-4 pt-4 pb-2 text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Seguridad</p>

        {/* Email — editable */}
        <div className="px-4 py-3 border-t border-[#eeeeee]">
          <p className="text-[12px] text-[#5f5e5e] mb-1">Correo electrónico</p>
          {editandoEmail ? (
            <div className="space-y-2">
              <input
                type="email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') guardarEmail(); if (e.key === 'Escape') setEditandoEmail(false); }}
                className="w-full h-10 px-3 bg-[#f3f3f3] rounded-xl border-2 border-[#009ee3] outline-none text-[16px] text-[#1a1c1c]"
                autoFocus
              />
              {errorEmail && <p className="text-[12px] text-[#ba1a1a]">{errorEmail}</p>}
              <div className="flex gap-2">
                <button
                  onClick={guardarEmail}
                  disabled={guardandoEmail}
                  className="flex-1 h-9 bg-[#009ee3] text-white text-[13px] font-semibold rounded-lg disabled:opacity-60"
                >
                  {guardandoEmail ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoEmail(false)}
                  className="flex-1 h-9 bg-[#eeeeee] text-[#5f5e5e] text-[13px] font-semibold rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-[#1a1c1c]">{usuario.email}</p>
              <button onClick={abrirEditEmail} className="text-[#006492] p-2">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <button
          onClick={() => navigate('/forgot-password')}
          className="flex items-center gap-3 w-full px-4 py-4 border-t border-[#eeeeee] active:bg-[#f3f3f3] transition-colors"
        >
          <span className="material-symbols-outlined text-[#5f5e5e]">lock</span>
          <span className="text-[15px] font-semibold text-[#1a1c1c]">Cambiar contraseña</span>
          <span className="material-symbols-outlined text-[#6e7881] ml-auto">chevron_right</span>
        </button>
      </div>


      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        className="w-full h-12 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[15px] rounded-full active:scale-[0.98] transition-all"
      >
        Cerrar sesión
      </button>

      <p className="text-center text-[12px] text-[#bec8d2] mt-6">
        AulaCash — simulación educativa. Los saldos no representan dinero real.
      </p>
    </Layout>
  );
}
