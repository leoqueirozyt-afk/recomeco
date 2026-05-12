import { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recomeco');

  useEffect(() => {
    loadDashboard();
  }, []);

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
    return <div className="empty-state">Carregando...</div>;
  }

  const r = data?.recomeco || {};
  const c = data?.church || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do Ministério</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        <button
          onClick={() => setTab('recomeco')}
          style={{
            padding: '10px 24px', border: 'none', borderBottom: tab === 'recomeco' ? '3px solid var(--primary)' : '3px solid transparent',
            background: 'none', color: tab === 'recomeco' ? 'var(--primary)' : 'var(--text-light)',
            fontWeight: tab === 'recomeco' ? '700' : '400', fontSize: '15px', cursor: 'pointer', borderRadius: '8px 8px 0 0'
          }}
        >
          Recomeço
        </button>
        <button
          onClick={() => setTab('church')}
          style={{
            padding: '10px 24px', border: 'none', borderBottom: tab === 'church' ? '3px solid var(--primary)' : '3px solid transparent',
            background: 'none', color: tab === 'church' ? 'var(--primary)' : 'var(--text-light)',
            fontWeight: tab === 'church' ? '700' : '400', fontSize: '15px', cursor: 'pointer', borderRadius: '8px 8px 0 0'
          }}
        >
          Igreja
        </button>
      </div>

      {tab === 'recomeco' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px' }}>
            Visão do Ministério Recomeço
          </h2>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Visitantes Hoje</div>
              <div className="stat-value">{r.visitorsToday || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Visitantes Mês</div>
              <div className="stat-value">{r.visitorsThisMonth || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Aguardando Acomp.</div>
              <div className="stat-value">{r.visitorsWaitingCare || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Em Acompanhamento</div>
              <div className="stat-value">{r.visitorsInCare || 0}</div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Em Cuidado</div>
              <div className="stat-value">{r.peopleInCare || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Aguardando Decisão</div>
              <div className="stat-value">{r.waitingDecision || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Discípulos</div>
              <div className="stat-value">{r.disciples || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Visitantes Recomeço</div>
              <div className="stat-value">{r.visitorsInFollowUp || 0}</div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">No Mês</div>
              <div className="stat-value">{r.peopleThisMonth || 0}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' }}>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Taxa Discipulado</div>
              <div className="stat-value" style={{ color: '#fff' }}>{r.discipleshipRate || 0}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Responsáveis Ativos</div>
              <div className="stat-value">{r.activeMentors || 0}</div>
            </div>
            <div className="stat-card" style={{ background: r.backupStatus?.currentMonthDone ? 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' : 'linear-gradient(135deg, #dc143c 0%, #a01030 100%)' }}>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Backup Mensal</div>
              <div className="stat-value" style={{ color: '#fff' }}>
                {r.backupStatus?.currentMonthDone ? 'Realizado' : 'Pendente'}
              </div>
            </div>
          </div>

          {r.decisionsByType?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Decisões por Tipo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {r.decisionsByType.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--background)', borderRadius: '10px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{d.decision}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {r.peopleByMentor?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Pessoas por Responsável</h3>
              {r.peopleByMentor.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{m.name}</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{m.count}</span>
                </div>
              ))}
            </div>
          )}

          {r.entriesByMonth?.length > 0 && (() => {
            const maxCount = Math.max(...r.entriesByMonth.map(x => x.count), 1);
            return (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Entradas por Mês</h3>
              <div className="chart-bars" style={{ height: '160px', flexDirection: 'row', gap: '8px' }}>
                {r.entriesByMonth.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: '40px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>{m.count}</span>
                    <div style={{ width: '100%', background: 'var(--primary)', borderRadius: '4px 4px 0 0', minHeight: '4px', height: Math.max(Math.round((m.count / maxCount) * 120), 4) + 'px' }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>{String(m.month || '').substring(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          {r.recentPeople?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Cadastros Recentes</h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {r.recentPeople.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: '600' }}>{p.fullName}</span>
                    <span className="tag tag-status" style={{ fontSize: '10px' }}>{p.discipleStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'church' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px' }}>
            Visão Geral da Igreja
          </h2>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' }}>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Membros Ativos</div>
              <div className="stat-value" style={{ color: '#fff' }}>{c.activeMembers || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Membros Inativos</div>
              <div className="stat-value">{c.inactiveMembers || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Adultos</div>
              <div className="stat-value">{c.activeAdults || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Crianças</div>
              <div className="stat-value">{c.activeChildren || 0}</div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Batizados</div>
              <div className="stat-value">{c.baptizedMembers || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Liderança</div>
              <div className="stat-value">{c.leadershipMembers || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Em Cuidado</div>
              <div className="stat-value">{c.membersInCare || 0}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' }}>
              <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Aniversariantes Mês</div>
              <div className="stat-value" style={{ color: '#fff' }}>{c.birthdaysThisMonth || 0}</div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Novos Membros Mês</div>
              <div className="stat-value">{c.newMembersThisMonth || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Com Alergia</div>
              <div className="stat-value">{c.membersWithAllergy || 0}</div>
            </div>
          </div>

          {c.membersByGDS?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Membros por GDS</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {c.membersByGDS.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--background)', borderRadius: '10px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{g.gds}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.upcomingBirthdays?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Aniversariantes do Mês</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {c.upcomingBirthdays.map((b) => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--background)', borderRadius: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                      {parseInt(b.birthDate?.split('-').pop(), 10)}
                    </span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{b.fullName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{b.memberType} {b.phone ? `• ${b.phone}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.membersInCareList?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Membros em Cuidado</h3>
              {c.membersInCareList.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>{m.fullName}</span>
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#e67e22' }}>{m.memberType}</span>
                  </div>
                  <span className="tag tag-care">{m.careStatus}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
