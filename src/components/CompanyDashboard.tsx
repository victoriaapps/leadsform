import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Car, 
  Users,
  MessageSquare,
  UserPlus,
  BarChart2,
  Clock,
  Activity,
  Tag,
  PieChart
} from 'lucide-react';
import type { Prospecto, UsuarioPerfil, Empresa } from '../types/prospecto';
import { 
  supabase, 
  isSupabaseConfigured, 
  getDemoProspectos, 
  getDemoEmpresas, 
  getDemoPerfiles 
} from '../lib/supabase';

interface CompanyDashboardProps {
  currentUser: UsuarioPerfil;
}

const PIE_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#f97316'  // Orange
];

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ currentUser }) => {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [perfiles, setPerfiles] = useState<UsuarioPerfil[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(
    currentUser.rol === 'admin' ? (currentUser.empresa_id || 'all') : 'all'
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros de fecha estilo Victoria
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const formatDateForInput = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(formatDateForInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateForInput(now));

  const loadDashboardData = async () => {
    setLoading(true);
    let allLeads: Prospecto[] = [];
    let allEmpresas: Empresa[] = [];
    let allPerfiles: UsuarioPerfil[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbLeads } = await supabase.from('prospectos').select('*').order('created_at', { ascending: true });
        const { data: dbEmp } = await supabase.from('empresas').select('*');
        const { data: dbPerf } = await supabase.from('perfiles').select('*');

        allLeads = dbLeads || [];
        allEmpresas = dbEmp || [];
        allPerfiles = dbPerf || [];
      } catch (e) {
        allLeads = getDemoProspectos(currentUser);
        allEmpresas = getDemoEmpresas();
        allPerfiles = getDemoPerfiles();
      }
    } else {
      allLeads = getDemoProspectos(currentUser);
      allEmpresas = getDemoEmpresas();
      allPerfiles = getDemoPerfiles();
    }

    setProspectos(allLeads);
    setEmpresas(allEmpresas);
    setPerfiles(allPerfiles);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Filtrado de prospectos
  const filteredProspectos = useMemo(() => {
    return prospectos.filter((p) => {
      if (currentUser.rol === 'admin') {
        if (p.empresa_id !== currentUser.empresa_id) return false;
      } else if (currentUser.rol === 'superadmin' && selectedEmpresaId !== 'all') {
        if (p.empresa_id !== selectedEmpresaId) return false;
      }

      if (!p.created_at) return true;
      const leadDate = new Date(p.created_at).toISOString().slice(0, 10);
      if (startDate && leadDate < startDate) return false;
      if (endDate && leadDate > endDate) return false;

      return true;
    });
  }, [prospectos, currentUser, selectedEmpresaId, startDate, endDate]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalLeads = filteredProspectos.length;
    const userCounts: Record<string, { count: number; name: string }> = {};
    const brandCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    // Mapa de horas de 0 a 23 hs
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = 0;
    }

    filteredProspectos.forEach((p) => {
      const userId = p.creado_por || 'desconocido';
      let userName = p.creado_por_nombre || 'Usuario';
      
      const perf = perfiles.find(pf => pf.id === userId);
      if (perf) userName = perf.nombre;

      if (!userCounts[userId]) {
        userCounts[userId] = { count: 0, name: userName };
      }
      userCounts[userId].count += 1;

      const brand = p.marca ? p.marca.trim() : 'Sin Marca';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;

      const model = p.modelo ? p.modelo.trim() : 'Sin Modelo';
      modelCounts[model] = (modelCounts[model] || 0) + 1;

      if (p.created_at) {
        const leadDateObj = new Date(p.created_at);
        const dayStr = leadDateObj.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short'
        });
        dailyMap[dayStr] = (dailyMap[dayStr] || 0) + 1;

        const hour = leadDateObj.getHours();
        hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
      }
    });

    let topUser = '-';
    let maxUserCount = 0;
    Object.values(userCounts).forEach((u) => {
      if (u.count > maxUserCount) {
        maxUserCount = u.count;
        topUser = u.name;
      }
    });

    let topBrand = '-';
    let maxBrandCount = 0;
    Object.entries(brandCounts).forEach(([brand, count]) => {
      if (count > maxBrandCount) {
        maxBrandCount = count;
        topBrand = brand;
      }
    });

    let topModel = '-';
    let maxModelCount = 0;
    Object.entries(modelCounts).forEach(([model, count]) => {
      if (count > maxModelCount) {
        maxModelCount = count;
        topModel = model;
      }
    });

    // Preparar sectores para el gráfico de torta de Marcas
    const brandSlicesRaw = Object.entries(brandCounts).map(([name, count]) => ({ name, count }));
    brandSlicesRaw.sort((a, b) => b.count - a.count);
    
    let brandCumulative = 0;
    const brandSlices = brandSlicesRaw.map((b, idx) => {
      const pct = totalLeads > 0 ? (b.count / totalLeads) * 100 : 0;
      const startDeg = (brandCumulative / (totalLeads || 1)) * 360;
      brandCumulative += b.count;
      const endDeg = (brandCumulative / (totalLeads || 1)) * 360;
      return { ...b, pct: Math.round(pct), startDeg, endDeg, color: PIE_COLORS[idx % PIE_COLORS.length] };
    });

    // Preparar sectores para el gráfico de torta de Modelos
    const modelSlicesRaw = Object.entries(modelCounts).map(([name, count]) => ({ name, count }));
    modelSlicesRaw.sort((a, b) => b.count - a.count);
    
    let modelCumulative = 0;
    const modelSlices = modelSlicesRaw.map((m, idx) => {
      const pct = totalLeads > 0 ? (m.count / totalLeads) * 100 : 0;
      const startDeg = (modelCumulative / (totalLeads || 1)) * 360;
      modelCumulative += m.count;
      const endDeg = (modelCumulative / (totalLeads || 1)) * 360;
      return { ...m, pct: Math.round(pct), startDeg, endDeg, color: PIE_COLORS[(idx + 2) % PIE_COLORS.length] };
    });

    const dailyData = Object.entries(dailyMap).map(([day, count]) => ({ day, count }));
    const avgPerDay = dailyData.length > 0 ? (totalLeads / dailyData.length).toFixed(1) : '0';

    const hourlyData = Object.entries(hourlyMap).map(([hStr, count]) => {
      const h = parseInt(hStr, 10);
      const label = `${h.toString().padStart(2, '0')}:00`;
      return { hour: h, label, count };
    });

    let peakHourObj = { label: '14:00', count: 0 };
    hourlyData.forEach((item) => {
      if (item.count > peakHourObj.count) {
        peakHourObj = { label: item.label, count: item.count };
      }
    });

    return {
      totalLeads,
      userCounts: Object.values(userCounts).sort((a, b) => b.count - a.count),
      topUser,
      topBrand,
      topModel,
      brandSlices,
      modelSlices,
      dailyData,
      avgPerDay,
      hourlyData,
      peakHourObj
    };
  }, [filteredProspectos, perfiles]);

  const activeEmpresaName = useMemo(() => {
    if (currentUser.rol === 'admin') {
      const emp = empresas.find(e => e.id === currentUser.empresa_id);
      return emp ? emp.nombre : 'Tu Empresa';
    }
    if (selectedEmpresaId === 'all') return 'Todas las Empresas (Global)';
    const emp = empresas.find(e => e.id === selectedEmpresaId);
    return emp ? emp.nombre : 'Empresa Seleccionada';
  }, [currentUser, selectedEmpresaId, empresas]);

  const maxHourlyVal = Math.max(...metrics.hourlyData.map(item => item.count), 1);

  // String de Conic Gradient para Torta de Marcas
  const brandConicGradient = useMemo(() => {
    if (metrics.brandSlices.length === 0) return 'var(--bg-surface-hover)';
    const str = metrics.brandSlices.map(s => `${s.color} ${s.startDeg}deg ${s.endDeg}deg`).join(', ');
    return `conic-gradient(${str})`;
  }, [metrics.brandSlices]);

  // String de Conic Gradient para Torta de Modelos
  const modelConicGradient = useMemo(() => {
    if (metrics.modelSlices.length === 0) return 'var(--bg-surface-hover)';
    const str = metrics.modelSlices.map(s => `${s.color} ${s.startDeg}deg ${s.endDeg}deg`).join(', ');
    return `conic-gradient(${str})`;
  }, [metrics.modelSlices]);

  return (
    <div className="dashboard-wrapper">
      {/* BARRA DE FILTROS SUPERIOR */}
      <div className="dashboard-filter-bar">
        <div className="filter-date-inputs">
          <div className="filter-date-badge">
            <Calendar size={15} />
            <span>Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>—</span>

          <div className="filter-date-badge">
            <span>Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <button type="button" onClick={loadDashboardData} className="btn-apply">
            Aplicar
          </button>
        </div>

        {currentUser.rol === 'superadmin' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: 'var(--text-dim)' }} />
            <select
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              className="input-field"
              style={{ width: 'auto', padding: '0.45rem 0.85rem' }}
            >
              <option value="all">Todas las Empresas (Vista Global)</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner large"></div>
          <p>Cargando analíticas del dashboard...</p>
        </div>
      ) : (
        <>
          {/* TARJETAS KPI */}
          <div className="kpi-cards-grid">
            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Prospectos Totales</div>
                <div className="kpi-value-num">{metrics.totalLeads}</div>
                <div className="kpi-growth-tag">
                  <TrendingUp size={13} /> Registrados
                </div>
              </div>
              <div className="kpi-icon-badge purple">
                <MessageSquare size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Líder en Registro</div>
                <div className="kpi-value-num" style={{ fontSize: '1.4rem' }}>{metrics.topUser}</div>
                <div className="kpi-growth-tag">
                  <TrendingUp size={13} /> Mayor captación
                </div>
              </div>
              <div className="kpi-icon-badge amber">
                <UserPlus size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Marca Top Cotizada</div>
                <div className="kpi-value-num" style={{ fontSize: '1.5rem' }}>{metrics.topBrand}</div>
                <div className="kpi-growth-tag">
                  <TrendingUp size={13} /> Más requerida
                </div>
              </div>
              <div className="kpi-icon-badge green">
                <Car size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Modelo Top Cotizado</div>
                <div className="kpi-value-num" style={{ fontSize: '1.5rem' }}>{metrics.topModel}</div>
                <div className="kpi-growth-tag">
                  <TrendingUp size={13} /> Vehículo favorito
                </div>
              </div>
              <div className="kpi-icon-badge blue">
                <Tag size={20} />
              </div>
            </div>
          </div>

          {/* DOS GRÁFICOS CIRCULARES DE TORTA (MARCAS Y MODELOS) EN GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* GRÁFICO DE TORTA 1: DISTRIBUCIÓN POR MARCAS */}
            <div className="card-victoria">
              <div className="card-victoria-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <PieChart size={18} style={{ color: 'var(--primary-accent)' }} /> Distribución por Marcas
                  </h3>
                  <div className="card-victoria-sub">Proporción de vehículos según marca cotizada</div>
                </div>
              </div>

              {metrics.brandSlices.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <p>No hay prospectos en el período seleccionado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1.5rem', flexWrap: 'wrap' }}>
                  
                  {/* TORTA VISUAL */}
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: brandConicGradient,
                    position: 'relative',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    flexShrink: 0
                  }}>
                    {/* HUECO CENTRAL ESTILO DONUT */}
                    <div style={{
                      position: 'absolute',
                      top: '24px',
                      left: '24px',
                      width: '112px',
                      height: '112px',
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                        {metrics.brandSlices.length}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, marginTop: '2px' }}>
                        MARCAS
                      </span>
                    </div>
                  </div>

                  {/* LEYENDA DETALLADA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: '150px' }}>
                    {metrics.brandSlices.map((b, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.color, display: 'inline-block' }}></span>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                          {b.count} ({b.pct}%)
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

            {/* GRÁFICO DE TORTA 2: DISTRIBUCIÓN POR MODELOS */}
            <div className="card-victoria">
              <div className="card-victoria-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <PieChart size={18} style={{ color: '#06b6d4' }} /> Distribución por Modelos
                  </h3>
                  <div className="card-victoria-sub">Proporción de vehículos según modelo cotizado</div>
                </div>
              </div>

              {metrics.modelSlices.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <p>No hay prospectos en el período seleccionado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1.5rem', flexWrap: 'wrap' }}>
                  
                  {/* TORTA VISUAL */}
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: modelConicGradient,
                    position: 'relative',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    flexShrink: 0
                  }}>
                    {/* HUECO CENTRAL ESTILO DONUT */}
                    <div style={{
                      position: 'absolute',
                      top: '24px',
                      left: '24px',
                      width: '112px',
                      height: '112px',
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                        {metrics.modelSlices.length}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, marginTop: '2px' }}>
                        MODELOS
                      </span>
                    </div>
                  </div>

                  {/* LEYENDA DETALLADA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minWidth: '150px' }}>
                    {metrics.modelSlices.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: m.color, display: 'inline-block' }}></span>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.name}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                          {m.count} ({m.pct}%)
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* GRÁFICO 3: BARRAS - PROSPECTOS POR DÍA */}
          <div className="card-victoria">
            <div className="card-victoria-header">
              <div>
                <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart2 size={20} style={{ color: 'var(--primary-accent)' }} /> Prospectos por Día
                </h3>
                <div className="card-victoria-sub">Evolución del período seleccionado • {activeEmpresaName}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  background: 'var(--primary-glow)',
                  color: 'var(--primary-accent)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {metrics.totalLeads} total
                </span>
                <span style={{
                  background: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  ~{metrics.avgPerDay}/día
                </span>
              </div>
            </div>

            {metrics.dailyData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No hay datos registrados en el rango de fechas seleccionado.</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: metrics.dailyData.length <= 5 ? 'center' : 'space-between',
                  gap: '16px',
                  height: '210px',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  overflowX: 'auto'
                }}>
                  {metrics.dailyData.map((d, idx) => {
                    const maxVal = Math.max(...metrics.dailyData.map(item => item.count), 1);
                    const heightPct = Math.max((d.count / maxVal) * 100, 18);

                    return (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          minWidth: '48px',
                          maxWidth: '70px',
                          flex: metrics.dailyData.length > 5 ? 1 : 'initial'
                        }}
                        title={`${d.day}: ${d.count} prospectos`}
                      >
                        <span style={{
                          background: 'var(--primary-accent)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          marginBottom: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}>
                          {d.count}
                        </span>

                        <div style={{
                          width: '100%',
                          maxWidth: '38px',
                          height: `${heightPct}%`,
                          background: 'linear-gradient(180deg, var(--primary-accent) 0%, var(--secondary-accent) 100%)',
                          borderRadius: '8px 8px 3px 3px',
                          boxShadow: '0 4px 12px var(--primary-glow)',
                          transition: 'height 0.4s ease-out'
                        }}></div>

                        {/* Muestra etiquetas espaciadas inteligentemente para evitar solapamiento si hay muchos días */}
                        {(idx % Math.ceil(metrics.dailyData.length / 6) === 0 || idx === metrics.dailyData.length - 1) ? (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: 'var(--text-dim)',
                            marginTop: '8px',
                            whiteSpace: 'nowrap'
                          }}>
                            {d.day}
                          </span>
                        ) : (
                          <span style={{ height: '18px', marginTop: '8px' }}></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* GRÁFICO 4: LÍNEAS FINAS - HORAS CON MÁS REGISTROS */}
          <div className="card-victoria">
            <div className="card-victoria-header">
              <div>
                <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} style={{ color: 'var(--primary-accent)' }} /> Horas con Más Registros de Leads
                </h3>
                <div className="card-victoria-sub">Distribución del tráfico de recepción por hora del día (00:00 - 23:00)</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Activity size={14} /> Hora Pico: {metrics.peakHourObj.label} ({metrics.peakHourObj.count} leads)
                </span>
              </div>
            </div>

            {metrics.totalLeads === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No hay registros de prospectos suficientes para generar el gráfico horario.</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', position: 'relative', height: '230px', paddingBottom: '30px' }}>
                
                <svg width="100%" height="160px" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="fineLineArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary-accent)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0%" y1="20" x2="100%" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" />
                  <line x1="0%" y1="80" x2="100%" y2="80" stroke="var(--border-color)" strokeDasharray="3 3" />
                  <line x1="0%" y1="140" x2="100%" y2="140" stroke="var(--border-color)" strokeDasharray="3 3" />

                  <path
                    d={`
                      M 2.1% 140
                      ${metrics.hourlyData.map((d, i) => {
                        const xPct = (i / (metrics.hourlyData.length - 1)) * 95.8 + 2.1;
                        const y = 140 - (d.count / maxHourlyVal) * 115;
                        return `L ${xPct}% ${y}`;
                      }).join(' ')}
                      L 97.9% 140 Z
                    `}
                    fill="url(#fineLineArea)"
                  />

                  <path
                    d={metrics.hourlyData.map((d, i) => {
                      const xPct = (i / (metrics.hourlyData.length - 1)) * 95.8 + 2.1;
                      const y = 140 - (d.count / maxHourlyVal) * 115;
                      return `${i === 0 ? 'M' : 'L'} ${xPct}% ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="var(--primary-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '160px', pointerEvents: 'none' }}>
                  {metrics.hourlyData.map((d, i) => {
                    const leftPct = (i / (metrics.hourlyData.length - 1)) * 95.8 + 2.1;
                    const topPx = 140 - (d.count / maxHourlyVal) * 115;
                    const isPeak = d.count === metrics.peakHourObj.count && d.count > 0;

                    return (
                      <React.Fragment key={i}>
                        <div
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPx}px`,
                            transform: 'translate(-50%, -50%)',
                            width: isPeak ? '12px' : '8px',
                            height: isPeak ? '12px' : '8px',
                            borderRadius: '50%',
                            background: isPeak ? '#10b981' : 'var(--primary-accent)',
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                            zIndex: 3
                          }}
                        />

                        {d.count > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: `${topPx - 26}px`,
                              transform: 'translateX(-50%)',
                              background: isPeak ? '#10b981' : 'var(--primary-accent)',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '10px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                              whiteSpace: 'nowrap',
                              zIndex: 4
                            }}
                          >
                            {d.count}
                          </div>
                        )}

                        {(i % 4 === 0 || i === metrics.hourlyData.length - 1) && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: '168px',
                              transform: 'translateX(-50%)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--text-dim)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {d.label}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

          {/* DESGLOSE POR OPERADOR */}
          <div className="card-victoria">
            <div className="card-victoria-header">
              <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: 'var(--primary-accent)' }} /> Rendimiento por Operador
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {metrics.userCounts.map((u, idx) => {
                const pct = metrics.totalLeads > 0 ? Math.round((u.count / metrics.totalLeads) * 100) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={14} style={{ color: 'var(--primary-accent)' }} /> {u.name}
                      </span>
                      <span style={{ color: 'var(--primary-accent)', fontWeight: 800 }}>
                        {u.count} prospectos ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--primary-accent)',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
