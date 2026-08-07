import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Trash2, 
  Download, 
  Car, 
  MapPin, 
  Phone, 
  Calendar, 
  FileText, 
  UserCheck,
  Building2,
  User,
  Shield,
  Filter
} from 'lucide-react';
import type { Prospecto, UsuarioPerfil, Empresa } from '../types/prospecto';
import { supabase, isSupabaseConfigured, getDemoProspectos, deleteDemoProspecto, getDemoEmpresas, getDemoPerfiles } from '../lib/supabase';

interface ProspectListProps {
  currentUser: UsuarioPerfil;
}

export const ProspectList: React.FC<ProspectListProps> = ({ currentUser }) => {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasMap, setEmpresasMap] = useState<Record<string, string>>({});
  const [perfilesMap, setPerfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProspectos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let currentEmpresas: Empresa[] = [];
      let currentPerfiles: UsuarioPerfil[] = [];

      if (isSupabaseConfigured && supabase) {
        const { data: dbEmp } = await supabase.from('empresas').select('*');
        const { data: dbPerf } = await supabase.from('perfiles').select('*');

        currentEmpresas = dbEmp || getDemoEmpresas();
        currentPerfiles = dbPerf || getDemoPerfiles();

        let query = supabase.from('prospectos').select('*').order('created_at', { ascending: false });

        if (currentUser.rol === 'admin') {
          query = query.eq('empresa_id', currentUser.empresa_id);
        } else if (currentUser.rol === 'operador') {
          query = query.eq('creado_por', currentUser.id);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('Aviso Supabase:', error.message);
          setProspectos(getDemoProspectos(currentUser));
        } else {
          const demoData = getDemoProspectos(currentUser);
          const combined = [...(data || []), ...demoData];
          const uniqueMap = new Map();
          combined.forEach(item => uniqueMap.set(item.id, item));
          setProspectos(Array.from(uniqueMap.values()));
        }
      } else {
        currentEmpresas = getDemoEmpresas();
        currentPerfiles = getDemoPerfiles();
        const demoData = getDemoProspectos(currentUser);
        setProspectos(demoData);
      }

      const empMap: Record<string, string> = {};
      currentEmpresas.forEach(e => { empMap[e.id] = e.nombre; });
      setEmpresasMap(empMap);
      setEmpresas(currentEmpresas);

      const perfMap: Record<string, string> = {};
      currentPerfiles.forEach(p => { perfMap[p.id] = p.nombre; });
      setPerfilesMap(perfMap);

    } catch (err: any) {
      console.warn('Fallback a prospectos locales por aviso de Supabase:', err.message);
      const demoData = getDemoProspectos(currentUser);
      setProspectos(demoData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspectos();
  }, [currentUser]);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este prospecto?')) return;

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('prospectos').delete().eq('id', id);
        if (error) {
          console.error('Error eliminando en Supabase:', error);
          alert('Atención de Supabase: ' + error.message);
        }
      }
      
      deleteDemoProspecto(id);
      setProspectos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert('Error al eliminar prospecto: ' + err.message);
    }
  };

  const getEmpresaNombre = (p: Prospecto) => {
    if (p.empresa_id && empresasMap[p.empresa_id]) {
      return empresasMap[p.empresa_id];
    }
    return p.empresa_nombre || 'Sin Empresa';
  };

  const getCreadorNombre = (p: Prospecto) => {
    if (p.creado_por && perfilesMap[p.creado_por]) {
      return perfilesMap[p.creado_por];
    }
    return p.creado_por_nombre || 'Usuario';
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Nombre', 'Ciudad', 'Contacto', 'Marca', 'Modelo', 'Observacion', 'Empresa', 'Creado Por', 'Fecha'];
    const rows = filtered.map((p) => [
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${(p.ciudad || '').replace(/"/g, '""')}"`,
      `"${p.contacto.replace(/"/g, '""')}"`,
      `"${p.marca.replace(/"/g, '""')}"`,
      `"${p.modelo.replace(/"/g, '""')}"`,
      `"${(p.observacion || '').replace(/"/g, '""')}"`,
      `"${getEmpresaNombre(p).replace(/"/g, '""')}"`,
      `"${getCreadorNombre(p).replace(/"/g, '""')}"`,
      `"${p.created_at ? new Date(p.created_at).toLocaleString() : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prospectos_${currentUser.rol}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = prospectos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesTerm = (
      p.nombre.toLowerCase().includes(term) ||
      (p.ciudad && p.ciudad.toLowerCase().includes(term)) ||
      p.contacto.toLowerCase().includes(term) ||
      p.marca.toLowerCase().includes(term) ||
      p.modelo.toLowerCase().includes(term)
    );

    if (currentUser.rol === 'superadmin' && empresaFilter !== 'all') {
      return matchesTerm && p.empresa_id === empresaFilter;
    }

    return matchesTerm;
  });

  const getVisibilityExplanation = () => {
    switch (currentUser.rol) {
      case 'superadmin':
        return (
          <span className="role-explanation superadmin">
            <Shield size={13} /> Acceso Superadmin: Viendo todos los prospectos del sistema.
          </span>
        );
      case 'admin':
        return (
          <span className="role-explanation admin">
            <Building2 size={13} /> Acceso Admin: Viendo todos los prospectos de tu Empresa.
          </span>
        );
      case 'operador':
        return (
          <span className="role-explanation operador">
            <User size={13} /> Acceso Operador: Viendo únicamente tus prospectos creados.
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="card-victoria">
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="card-victoria-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <UserCheck size={24} style={{ color: 'var(--primary-accent)' }} /> Gestión de Leads
            </h2>
            <div style={{ marginTop: '0.4rem' }}>
              {getVisibilityExplanation()}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button onClick={fetchProspectos} className="icon-btn" title="Actualizar datos">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button 
              onClick={exportCSV} 
              className="btn-secondary" 
              disabled={filtered.length === 0}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            >
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* CONTROLES Y FILTROS */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Buscar prospectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ×
              </button>
            )}
          </div>

          {currentUser.rol === 'superadmin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '280px' }}>
              <Filter size={16} style={{ color: 'var(--text-dim)' }} />
              <select
                value={empresaFilter}
                onChange={(e) => setEmpresaFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">Todas las Empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CONTENIDO DE LEADS (TABLA EN DESKTOP / TARJETAS EN MÓVIL) */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner large"></div>
            <p>Cargando prospectos...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-state">
            <p>{errorMsg}</p>
            <button onClick={fetchProspectos} className="btn-secondary">
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Car size={40} className="empty-icon" />
            <p>
              {searchTerm 
                ? 'No se encontraron prospectos para este filtro.' 
                : currentUser.rol === 'operador' 
                  ? 'No has registrado ningún prospecto aún. ¡Crea el primero en el formulario!'
                  : 'No hay prospectos registrados en esta vista.'}
            </p>
          </div>
        ) : (
          <>
            {/* VISTA EN TARJETAS PARA MÓVIL */}
            <div className="mobile-leads-list" style={{ display: 'none', flexDirection: 'column', gap: '0.85rem' }}>
              {filtered.map((item) => {
                const empresaNombre = getEmpresaNombre(item);
                const creadorNombre = getCreadorNombre(item);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-surface-hover)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{item.nombre}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} /> {item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          background: 'var(--primary-glow)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '20px',
                          color: 'var(--primary-accent)',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <Car size={13} /> {item.marca} {item.modelo}
                        </div>

                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Eliminar prospecto"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', fontSize: '0.82rem', color: 'var(--text-muted)', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Phone size={13} style={{ color: 'var(--primary-accent)' }} /> <strong>{item.contacto}</strong>
                      </span>
                      {item.ciudad && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} /> {item.ciudad}
                        </span>
                      )}
                      {currentUser.rol !== 'operador' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} /> {creadorNombre} ({empresaNombre})
                        </span>
                      )}
                    </div>

                    {item.observacion && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '6px' }}>
                        <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {item.observacion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* VISTA EN TABLA PARA DESKTOP */}
            <div className="desktop-leads-table" style={{ overflowX: 'auto' }}>
              <table className="prospects-table">
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>VEHÍCULO</th>
                    <th>TELÉFONO / CIUDAD</th>
                    {currentUser.rol !== 'operador' && <th>CREADOR / EMPRESA</th>}
                    <th>OBSERVACIÓN</th>
                    <th>FECHA</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const empresaNombre = getEmpresaNombre(item);
                    const creadorNombre = getCreadorNombre(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.nombre}</div>
                        </td>
                        <td>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.75rem',
                            background: 'var(--primary-glow)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '20px',
                            color: 'var(--primary-accent)',
                            fontSize: '0.85rem'
                          }}>
                            <Car size={14} /> {item.marca} <strong>{item.modelo}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} /> {item.contacto}</span>
                            {item.ciudad && <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {item.ciudad}</span>}
                          </div>
                        </td>
                        {currentUser.rol !== 'operador' && (
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <User size={12} style={{ color: 'var(--primary-accent)' }} /> {creadorNombre}
                              </span>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Building2 size={12} /> {empresaNombre}
                              </span>
                            </div>
                          </td>
                        )}
                        <td>
                          <div style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {item.observacion ? (
                              <span title={item.observacion} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <FileText size={13} /> {item.observacion}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>-</span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          <Calendar size={12} />{' '}
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Reciente'}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Eliminar prospecto"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
