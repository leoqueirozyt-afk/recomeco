import { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const C = {
  primary: '#dc143c',
  primaryDark: '#a01030',
  purple: '#9b59b6',
  orange: '#e67e22',
  green: '#27ae60',
  greenDark: '#1e8449',
  blue: '#2980b9',
  teal: '#16a085',
  gray: '#7f8c8d',
  lightGray: '#ecf0f1',
  dark: '#2c3e50',
  white: '#ffffff',
  border: '#e8e8e8',
  bg: '#f4f6f9',
};

const PIE_COLORS = ['#dc143c', '#9b59b6', '#e67e22', '#27ae60', '#2980b9', '#16a085', '#e74c3c', '#f39c12'];

function StatCard({ label, value, icon, gradient }) {
  return (
    <div style={{
      background: gradient ? undefined : C.white,
      backgroundImage: gradient || undefined,
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: '1px solid ' + (gradient ? 'transparent' : C.border),
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
      minHeight: '72px',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'; }}
    >
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: gradient ? 'rgba(255,255,255,0.2)' : 'rgba(220,20,60,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '10px', fontWeight: '600',
          color: gradient ? 'rgba(255,255,255,0.7)' : '#999',
          textTransform: 'uppercase', letterSpacing: '0.4px',
          marginBottom: '2px', lineHeight: '1.3',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '20px', fontWeight: '800',
          color: gradient ? C.white : C.dark,
          lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ children, title, subtitle, style }) {
  return (
    <div style={{
      background: C.white, borderRadius: '12px', padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: '1px solid ' + C.border, ...style
    }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: C.dark, lineHeight: '1.3' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function ListItem({ label, value, tag, tagColor, small }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: small ? '7px 0' : '9px 0',
      borderBottom: '1px solid ' + C.border
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {tag && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px',
            borderRadius: '50%', background: tagColor || C.primary,
            color: C.white, fontSize: '9px', fontWeight: '700', flexShrink: 0
          }}>
            {tag}
          </span>
        )}
        <span style={{ fontSize: small ? '12px' : '13px', color: C.dark, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>
      {value !== undefined && (
        <span style={{ fontSize: '13px', fontWeight: '700', color: C.primary, marginLeft: '8px', flexShrink: 0 }}>
          {value}
        </span>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.dark, color: C.white, borderRadius: '8px',
      padding: '8px 12px', fontSize: '12px', boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
    }}>
      <div style={{ fontWeight: '700', marginBottom: '2px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.white }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recomeco');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const result = await getDashboard();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: '40px', height: '40px', border: '3px solid rgba(220,20,60,0.2)',
          borderTopColor: C.primary, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  const r = data?.recomeco || {};
  const c = data?.church || {};

  const recomecoFollowUp = [
    { name: 'Em Cuidado', value: r.peopleInCare || 0, color: C.primary },
    { name: 'Aguard. Decisão', value: r.waitingDecision || 0, color: C.orange },
    { name: 'Discípulos', value: r.disciples || 0, color: C.green },
    { name: 'Visitantes', value: r.visitorsInFollowUp || 0, color: C.purple },
  ].filter(d => d.value > 0);

  const membersByType = [
    { name: 'Adultos', value: c.activeAdults || 0, color: C.primary },
    { name: 'Crianças', value: c.activeChildren || 0, color: C.purple },
  ].filter(d => d.value > 0);

  const membersByGds = (c.membersByGDS || []).map((g, i) => ({
    name: g.gds.replace('Jovens Aljava', 'Jovens').replace('Mulheres de Sião', 'Mulheres').replace('Homens de Honra', 'Homens'),
    value: g.count,
    color: PIE_COLORS[i % PIE_COLORS.length]
  })).filter(d => d.value > 0);

  const baptizedData = [
    { name: 'Batizados', value: c.baptizedMembers || 0 },
    { name: 'Não Batizados', value: (c.activeMembers || 0) - (c.baptizedMembers || 0) },
  ];

  const leadershipData = [
    { name: 'Na Liderança', value: c.leadershipMembers || 0 },
    { name: 'Sem Liderança', value: (c.activeMembers || 0) - (c.leadershipMembers || 0) },
  ];

  const monthlyData = (r.entriesByMonth || []).map(m => ({
    name: String(m.month || '').substring(0, 3),
    Pessoas: m.count
  }));

  const decisionData = (r.decisionsByType || []).map((d, i) => ({
    name: d.decision,
    Quantidade: d.count,
    color: PIE_COLORS[i % PIE_COLORS.length]
  }));

  const mentorData = (r.peopleByMentor || [])
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(m => ({ name: m.name.split(' ')[0], value: m.count }));

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ background: C.white, borderBottom: '1px solid ' + C.border }}>
        <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          {[
            { key: 'recomeco', label: 'Ministério Recomeço' },
            { key: 'church', label: 'Visão da Igreja' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '14px 24px', border: 'none',
              borderBottom: '3px solid ' + (tab === t.key ? C.primary : 'transparent'),
              background: 'none', color: tab === t.key ? C.primary : '#999',
              fontWeight: tab === t.key ? '700' : '500', fontSize: '13px',
              cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.3px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              {t.key === 'recomeco' ? '📊' : '⛪'} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: '1400px', margin: '0 auto' }}>

        {tab === 'recomeco' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: C.dark, margin: 0 }}>
                Ministério Recomeço
              </h1>
              <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
                Acompanhe o fluxo de visitantes, decisões e discipulado
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '12px'
            }}>
              <StatCard icon="👋" label="Visitantes Hoje" value={r.visitorsToday} gradient="linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)" />
              <StatCard icon="📅" label="Visitantes no Mês" value={r.visitorsThisMonth} />
              <StatCard icon="⏳" label="Aguard. Acomp." value={r.visitorsWaitingCare} gradient="linear-gradient(135deg, #e67e22 0%, #d35400 100%)" />
              <StatCard icon="🤝" label="Em Acompanhamento" value={r.visitorsInCare} gradient="linear-gradient(135deg, #27ae60 0%, #1e8449 100%)" />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '12px'
            }}>
              <StatCard icon="💧" label="Pessoas em Cuidado" value={r.peopleInCare} />
              <StatCard icon="⚖️" label="Aguard. Decisão" value={r.waitingDecision} />
              <StatCard icon="🌱" label="Discípulos" value={r.disciples} />
              <StatCard icon="🚶" label="Visitantes Recomeço" value={r.visitorsInFollowUp} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '20px'
            }}>
              <StatCard icon="📆" label="No Mês" value={r.peopleThisMonth} />
              <StatCard icon="📈" label="Taxa Discipulado" value={(r.discipleshipRate || 0) + '%'} gradient="linear-gradient(135deg, #27ae60 0%, #1e8449 100%)" />
              <StatCard icon="👑" label="Responsáveis Ativos" value={r.activeMentors} />
              <StatCard
                icon={r.backupStatus?.currentMonthDone ? '✅' : '⚠️'}
                label="Backup Mensal"
                value={r.backupStatus?.currentMonthDone ? 'Realizado' : 'Pendente'}
                gradient={r.backupStatus?.currentMonthDone ? 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <ChartCard title="Status do Acompanhamento" subtitle="Distribuição por status">
                {recomecoFollowUp.length > 0 ? (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <ResponsiveContainer width="120px" height="120px">
                      <PieChart>
                        <Pie data={recomecoFollowUp} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                          {recomecoFollowUp.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {recomecoFollowUp.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid ' + C.border }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: C.dark }}>{d.name}</span>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: C.dark }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>

              <ChartCard title="Decisões por Tipo" subtitle="Quantidade registrada">
                {decisionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={decisionData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#999' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Quantidade" radius={[4, 4, 0, 0]}>
                        {decisionData.map((d, i) => <Cell key={i} fill={d.color || C.primary} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <ChartCard title="Evolução Mensal" subtitle="Cadastros por mês">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#999' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="Pessoas" stroke={C.primary} strokeWidth={2.5} dot={{ r: 3, fill: C.primary }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>

              <ChartCard title="Pessoas por Responsável" subtitle="Top responsáveis">
                {mentorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart layout="vertical" data={mentorData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#999' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#999' }} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill={C.purple} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <ChartCard title="Cadastros Recentes" subtitle="Últimos cadastrados">
                {r.recentPeople?.length > 0 ? (
                  <div>
                    {r.recentPeople.slice(0, 6).map((p, i) => (
                      <ListItem key={p.id || i} label={p.fullName} tag={(i + 1)} tagColor={C.primary} small />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Nenhum cadastro registrado</div>
                )}
              </ChartCard>

              <ChartCard title="Status do Backup" subtitle="Situação mensal">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 12px',
                    background: r.backupStatus?.currentMonthDone ? C.green : C.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '26px'
                  }}>
                    {r.backupStatus?.currentMonthDone ? '✅' : '⚠️'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: C.dark, marginBottom: '4px' }}>
                    {r.backupStatus?.currentMonthDone ? 'Backup Realizado' : 'Backup Pendente'}
                  </div>
                  {r.backupStatus?.lastBackupDate && (
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Último: {new Date(r.backupStatus.lastBackupDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>
          </>
        )}

        {tab === 'church' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: C.dark, margin: 0 }}>
                Visão da Igreja
              </h1>
              <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
                Visão completa dos membros e indicadores
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '12px'
            }}>
              <StatCard icon="✅" label="Membros Ativos" value={c.activeMembers} gradient="linear-gradient(135deg, #27ae60 0%, #1e8449 100%)" />
              <StatCard icon="❌" label="Membros Inativos" value={c.inactiveMembers} gradient="linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)" />
              <StatCard icon="👨" label="Adultos" value={c.activeAdults} />
              <StatCard icon="👦" label="Crianças" value={c.activeChildren} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '12px'
            }}>
              <StatCard icon="💧" label="Batizados" value={c.baptizedMembers} />
              <StatCard icon="👑" label="Liderança" value={c.leadershipMembers} gradient="linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)" />
              <StatCard icon="🤝" label="Em Cuidado" value={c.membersInCare} gradient="linear-gradient(135deg, #e67e22 0%, #d35400 100%)" />
              <StatCard icon="🎂" label="Aniversariantes" value={c.birthdaysThisMonth} gradient="linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)" />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '20px'
            }}>
              <StatCard icon="🆕" label="Novos no Mês" value={c.newMembersThisMonth} />
              <StatCard icon="⚠️" label="Com Alergia" value={c.membersWithAllergy} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <ChartCard title="Membros por Tipo" subtitle="Adultos e crianças">
                {membersByType.length > 0 ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <ResponsiveContainer width="110px" height="110px">
                      <PieChart>
                        <Pie data={membersByType} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={4} dataKey="value">
                          {membersByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {membersByType.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + C.border }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px' }}>{d.name}</span>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '14px' }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem membros ativos</div>
                )}
              </ChartCard>

              <ChartCard title="Membros por GDS" subtitle="Por grupo de crescimento">
                {membersByGds.length > 0 ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <ResponsiveContainer width="110px" height="110px">
                      <PieChart>
                        <Pie data={membersByGds} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                          {membersByGds.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {membersByGds.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid ' + C.border }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem membros cadastrados</div>
                )}
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <ChartCard title="Batizados x Não Batizados" subtitle="Visão geral do batismo">
                {baptizedData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={baptizedData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#999' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill={C.green} />
                        <Cell fill={C.gray} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>

              <ChartCard title="Liderança x Sem Liderança" subtitle="Membros na liderança">
                {leadershipData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={leadershipData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#999' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        <Cell fill={C.purple} />
                        <Cell fill={C.gray} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Sem dados disponíveis</div>
                )}
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <ChartCard title="Próximos Aniversariantes" subtitle="Aniversariantes do mês">
                {c.upcomingBirthdays?.length > 0 ? (
                  <div>
                    {c.upcomingBirthdays.slice(0, 6).map((b) => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid ' + C.border }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%', background: C.purple,
                          color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '11px', flexShrink: 0
                        }}>
                          {parseInt(b.birthDate?.split('-').pop(), 10)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.fullName}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>{b.memberType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Nenhum aniversariante este mês</div>
                )}
              </ChartCard>

              <ChartCard title="Membros em Cuidado" subtitle="Pessoas com acompanhamento ativo">
                {c.membersInCareList?.length > 0 ? (
                  <div>
                    {c.membersInCareList.slice(0, 6).map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid ' + C.border }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', background: C.orange,
                            color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '700', flexShrink: 0
                          }}>
                            {m.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                          <div style={{ fontWeight: '600', fontSize: '12px' }}>{m.fullName}</div>
                        </div>
                        <span style={{
                          fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
                          background: 'rgba(230,126,34,0.1)', color: C.orange, whiteSpace: 'nowrap'
                        }}>
                          {m.careStatus?.replace('Em cuidado pelo Recomeço', 'Em Cuidado')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>Nenhum membro em cuidado</div>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
