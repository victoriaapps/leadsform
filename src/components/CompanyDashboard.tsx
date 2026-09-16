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
  PieChart,
  ArrowUpDown
} from 'lucide-react';
import type { Prospecto, UsuarioPerfil, Empresa } from '../types/prospecto';
import { 
  supabase, 
  isSupabaseConfigured, 
  getDemoProspectos, 
  getDemoEmpresas, 
  getDemoPerfiles 
} from '../lib/supabase';
import { COLOR_THEMES, generateThemePalette, getCustomHexColor } from '../lib/themeEngine';

interface CompanyDashboardProps {
  currentUser: UsuarioPerfil;
}


export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ currentUser }) => {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [perfiles, setPerfiles] = useState<UsuarioPerfil[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(
    currentUser.rol === 'admin' ? (currentUser.empresa_id || 'all') : 'all'
  );
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estado para ordenamiento de tabla de operadores
  const [operatorSort, setOperatorSort] = useState<{ key: 'name' | 'count' | 'reservas'; direction: 'asc' | 'desc' }>({ key: 'count', direction: 'desc' });

  // Filtros de fecha estilo Victoria (por defecto últimos 10 días)
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);

  const formatDateForInput = (d: Date) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(formatDateForInput(tenDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateForInput(now));

  // Estado del color de tema activo (se sincroniza en vivo con CSS y themeEngine)
  const [activeThemeColor, setActiveThemeColor] = useState<string>(() => {
    const customHex = getCustomHexColor();
    if (customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex)) return customHex;

    let paletteId: string | undefined = undefined;
    if (currentUser.rol === 'admin') {
      const emp = empresas.find(e => e.id === currentUser.empresa_id);
      if (emp) paletteId = emp.color_palette || undefined;
    } else if (selectedEmpresaId !== 'all') {
      const emp = empresas.find(e => e.id === selectedEmpresaId);
      if (emp) paletteId = emp.color_palette || undefined;
    }
    const theme = COLOR_THEMES.find(t => t.id === paletteId) || COLOR_THEMES[0];
    return theme.primary;
  });

  useEffect(() => {
    const syncColor = () => {
      const customHex = getCustomHexColor();
      if (customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex)) {
        setActiveThemeColor(customHex);
        return;
      }
      let paletteId: string | undefined = undefined;
      if (currentUser.rol === 'admin') {
        const emp = empresas.find(e => e.id === currentUser.empresa_id);
        if (emp) paletteId = emp.color_palette || undefined;
      } else if (selectedEmpresaId !== 'all') {
        const emp = empresas.find(e => e.id === selectedEmpresaId);
        if (emp) paletteId = emp.color_palette || undefined;
      }
      const theme = COLOR_THEMES.find(t => t.id === paletteId) || COLOR_THEMES[0];
      setActiveThemeColor(theme.primary);
    };

    syncColor();
    window.addEventListener('storage', syncColor);
    window.addEventListener('themeChange', syncColor);

    const observer = new MutationObserver(syncColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });

    return () => {
      window.removeEventListener('storage', syncColor);
      window.removeEventListener('themeChange', syncColor);
      observer.disconnect();
    };
  }, [currentUser, selectedEmpresaId, empresas]);

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

  const themePalette = useMemo(() => {
    return generateThemePalette(activeThemeColor, 12);
  }, [activeThemeColor]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalLeads = filteredProspectos.length;
    let totalReservas = 0;
    const userCounts: Record<string, { count: number; name: string; reservas: number }> = {};
    const brandCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};

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
        userCounts[userId] = { count: 0, name: userName, reservas: 0 };
      }
      userCounts[userId].count += 1;
      
      if (p.es_reserva) {
        userCounts[userId].reservas += 1;
        totalReservas += 1;
      }

      const brand = p.marca ? p.marca.trim() : 'Sin Marca';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;

      const model = p.modelo ? p.modelo.trim() : 'Sin Modelo';
      modelCounts[model] = (modelCounts[model] || 0) + 1;

      if (p.created_at) {
        const leadDateObj = new Date(p.created_at);
        const hour = leadDateObj.getHours();
        hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
      }
    });

    // Generar barras para TODOS los días dentro del rango filtrado (por defecto 10 días)
    const dailyData: { day: string; count: number; dateIso: string }[] = [];
    if (startDate && endDate) {
      const curr = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      while (curr <= end) {
        const dateIso = curr.toISOString().slice(0, 10);
        const dayLabel = curr.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        
        const count = filteredProspectos.filter((p) => {
          if (!p.created_at) return false;
          return new Date(p.created_at).toISOString().slice(0, 10) === dateIso;
        }).length;

        dailyData.push({ day: dayLabel, count, dateIso });
        curr.setDate(curr.getDate() + 1);
      }
    }

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
      return { ...b, pct: Math.round(pct), startDeg, endDeg, color: themePalette[idx % themePalette.length] };
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
      return { ...m, pct: Math.round(pct), startDeg, endDeg, color: themePalette[(idx + 1) % themePalette.length] };
    });

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
      totalReservas,
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
  }, [filteredProspectos, perfiles, startDate, endDate, themePalette]);

  const activeEmpresaName = useMemo(() => {
    if (currentUser.rol === 'admin') {
      const emp = empresas.find(e => e.id === currentUser.empresa_id);
      return emp ? emp.nombre : 'Tu Empresa';
    }
    if (selectedEmpresaId === 'all') return 'Todas las Empresas (Global)';
    const emp = empresas.find(e => e.id === selectedEmpresaId);
    return emp ? emp.nombre : 'Empresa Seleccionada';
  }, [currentUser, selectedEmpresaId, empresas]);


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
                <div className="kpi-growth-tag" style={{ color: activeThemeColor }}>
                  <TrendingUp size={13} /> Registrados
                </div>
              </div>
              <div className="kpi-icon-badge" style={{ background: 'var(--primary-glow)', color: activeThemeColor }}>
                <MessageSquare size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Líder en Registro</div>
                <div className="kpi-value-num" style={{ fontSize: '1.4rem' }}>{metrics.topUser}</div>
                <div className="kpi-growth-tag" style={{ color: activeThemeColor }}>
                  <TrendingUp size={13} /> Mayor captación
                </div>
              </div>
              <div className="kpi-icon-badge" style={{ background: 'var(--primary-glow)', color: activeThemeColor }}>
                <UserPlus size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Reservas Confirmadas</div>
                <div className="kpi-value-num" style={{ fontSize: '1.5rem' }}>{metrics.totalReservas}</div>
                <div className="kpi-growth-tag" style={{ color: activeThemeColor }}>
                  <TrendingUp size={13} /> {metrics.totalLeads > 0 ? Math.round((metrics.totalReservas / metrics.totalLeads) * 100) : 0}% de conversión
                </div>
              </div>
              <div className="kpi-icon-badge" style={{ background: 'var(--primary-glow)', color: activeThemeColor }}>
                <Calendar size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Marca Top Cotizada</div>
                <div className="kpi-value-num" style={{ fontSize: '1.5rem' }}>{metrics.topBrand}</div>
                <div className="kpi-growth-tag" style={{ color: activeThemeColor }}>
                  <TrendingUp size={13} /> Más requerida
                </div>
              </div>
              <div className="kpi-icon-badge" style={{ background: 'var(--primary-glow)', color: activeThemeColor }}>
                <Car size={20} />
              </div>
            </div>

            <div className="kpi-card-victoria">
              <div>
                <div className="kpi-title-sub">Modelo Top Cotizado</div>
                <div className="kpi-value-num" style={{ fontSize: '1.5rem' }}>{metrics.topModel}</div>
                <div className="kpi-growth-tag" style={{ color: activeThemeColor }}>
                  <TrendingUp size={13} /> Vehículo favorito
                </div>
              </div>
              <div className="kpi-icon-badge" style={{ background: 'var(--primary-glow)', color: activeThemeColor }}>
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
                <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit' }}>
                  <BarChart2 size={20} style={{ color: activeThemeColor }} /> Prospectos por Día
                </h3>
                <div className="card-victoria-sub" style={{ fontFamily: 'inherit' }}>Evolución del período seleccionado • {activeEmpresaName}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  background: 'var(--primary-glow)',
                  color: activeThemeColor,
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  fontFamily: 'inherit'
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
                  fontWeight: 600,
                  fontFamily: 'inherit'
                }}>
                  ~{metrics.avgPerDay}/día
                </span>
              </div>
            </div>

            {metrics.dailyData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p style={{ fontFamily: 'inherit' }}>No hay datos registrados en el rango de fechas seleccionado.</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: metrics.dailyData.length <= 5 ? 'center' : 'space-between',
                  gap: '12px',
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
                          minWidth: '40px',
                          maxWidth: '65px',
                          flex: 1
                        }}
                        title={`${d.day}: ${d.count} prospectos`}
                      >
                        <span style={{
                          background: activeThemeColor,
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          marginBottom: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          fontFamily: 'inherit'
                        }}>
                          {d.count}
                        </span>

                        {/* BARRA SÓLIDA CON EL COLOR DE LA EMPRESA (SIN DEGRADADO) */}
                        <div style={{
                          width: '100%',
                          maxWidth: '34px',
                          height: `${heightPct}%`,
                          background: activeThemeColor,
                          borderRadius: '8px 8px 3px 3px',
                          boxShadow: `0 4px 12px ${activeThemeColor}33`,
                          transition: 'height 0.4s ease-out'
                        }}></div>

                        {/* MOSTRAR LA FECHA DE CADA DATO ASÍ SEA 0 */}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--text-dim)',
                          marginTop: '8px',
                          whiteSpace: 'nowrap',
                          fontFamily: 'inherit'
                        }}>
                          {d.day}
                        </span>
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
                <h3 className="card-victoria-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit' }}>
                  <Clock size={20} style={{ color: activeThemeColor }} /> Horas con Más Registros de Leads
                </h3>
                <div className="card-victoria-sub" style={{ fontFamily: 'inherit' }}>Distribución del tráfico de recepción por hora del día (00:00 - 23:00)</div>
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
                  gap: '0.4rem',
                  fontFamily: 'inherit'
                }}>
                  <Activity size={14} /> Hora Pico: {metrics.peakHourObj.label} ({metrics.peakHourObj.count} leads)
                </span>
              </div>
            </div>

            {metrics.totalLeads === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p style={{ fontFamily: 'inherit' }}>No hay registros de prospectos suficientes para generar el gráfico horario.</p>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem', position: 'relative', width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 1000 240" style={{ width: '100%', height: 'auto', minWidth: '700px', display: 'block', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="fineLineArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeThemeColor} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={activeThemeColor} stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.2" />
                    </filter>
                  </defs>

                  {/* Guías horizontales punteadas */}
                  <line x1="30" y1="45" x2="970" y2="45" stroke="var(--border-color)" strokeDasharray="4 4" strokeOpacity="0.6" />
                  <line x1="30" y1="110" x2="970" y2="110" stroke="var(--border-color)" strokeDasharray="4 4" strokeOpacity="0.6" />
                  <line x1="30" y1="175" x2="970" y2="175" stroke="var(--border-color)" strokeDasharray="4 4" strokeOpacity="0.6" />

                  {(() => {
                    const maxVal = Math.max(...metrics.hourlyData.map(h => h.count), 1);
                    const points = metrics.hourlyData.map((d, i) => {
                      const x = 30 + (i / 23) * 940;
                      const y = 175 - (d.count / maxVal) * 130;
                      const isPeak = d.count > 0 && d.count === metrics.peakHourObj.count;
                      return { ...d, x, y, isPeak };
                    });

                    // Generar curva Bezier suave conectando todos los puntos
                    let curveD = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i];
                      const p1 = points[i + 1];
                      const cp1x = p0.x + (p1.x - p0.x) * 0.45;
                      const cp1y = p0.y;
                      const cp2x = p0.x + (p1.x - p0.x) * 0.55;
                      const cp2y = p1.y;
                      curveD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                    }
                    const areaD = `${curveD} L ${points[points.length - 1].x} 175 L ${points[0].x} 175 Z`;

                    return (
                      <g>
                        {/* Relleno translúcido suave */}
                        <path d={areaD} fill="url(#fineLineArea)" />

                        {/* LÍNEA MÁS DELGADA (strokeWidth="2") CON EL COLOR DE LA EMPRESA */}
                        <path
                          d={curveD}
                          fill="none"
                          stroke={activeThemeColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Puntos y Píldoras de valor */}
                        {points.map((p, i) => (
                          <g key={i}>
                            {/* Punto base */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={p.isPeak ? 5.5 : p.count > 0 ? 4 : 2.5}
                              fill={p.isPeak ? '#10b981' : p.count > 0 ? activeThemeColor : 'var(--border-color)'}
                              stroke="#ffffff"
                              strokeWidth={p.count > 0 ? 2 : 1}
                            />

                            {/* Píldora flotante si count > 0 */}
                            {p.count > 0 && (
                              <g filter="url(#badgeShadow)">
                                <rect
                                  x={p.x - (p.count >= 10 ? 15 : 12)}
                                  y={p.y - 26}
                                  width={p.count >= 10 ? 30 : 24}
                                  height={18}
                                  rx={9}
                                  fill={p.isPeak ? '#10b981' : activeThemeColor}
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 13}
                                  textAnchor="middle"
                                  fill="#ffffff"
                                  fontSize="11"
                                  fontWeight="800"
                                  fontFamily="inherit"
                                >
                                  {p.count}
                                </text>
                              </g>
                            )}

                            {/* MOSTRAR LA HORA DE CADA DATO ASÍ SEA 0 (TODAS LAS 24 HORAS) */}
                            <text
                              x={p.x}
                              y={205}
                              textAnchor="middle"
                              fill="var(--text-dim)"
                              fontSize="9.5"
                              fontWeight="600"
                              fontFamily="inherit"
                            >
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
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

            <div style={{ overflowX: 'auto' }}>
              <table className="prospects-table">
                <thead>
                  <tr>
                    <th 
                      style={{ cursor: 'pointer', transition: 'color 0.2s', userSelect: 'none' }}
                      onClick={() => setOperatorSort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Operador <ArrowUpDown size={12} style={{ opacity: operatorSort.key === 'name' ? 1 : 0.4 }} />
                      </div>
                    </th>
                    <th 
                      style={{ cursor: 'pointer', transition: 'color 0.2s', textAlign: 'center', userSelect: 'none' }}
                      onClick={() => setOperatorSort(prev => ({ key: 'count', direction: prev.key === 'count' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        Leads <ArrowUpDown size={12} style={{ opacity: operatorSort.key === 'count' ? 1 : 0.4 }} />
                      </div>
                    </th>
                    <th 
                      style={{ cursor: 'pointer', transition: 'color 0.2s', textAlign: 'center', userSelect: 'none' }}
                      onClick={() => setOperatorSort(prev => ({ key: 'reservas', direction: prev.key === 'reservas' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        Reservas <ArrowUpDown size={12} style={{ opacity: operatorSort.key === 'reservas' ? 1 : 0.4 }} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...metrics.userCounts].sort((a, b) => {
                    let valA = a[operatorSort.key];
                    let valB = b[operatorSort.key];
                    if (typeof valA === 'string' && typeof valB === 'string') {
                      return operatorSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    }
                    return operatorSort.direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
                  }).map((u, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} style={{ color: 'var(--primary-accent)' }} />
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{u.count}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--primary-accent)', fontSize: '1rem' }}>{u.reservas}</td>
                    </tr>
                  ))}
                  {metrics.userCounts.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                        No hay registros en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
