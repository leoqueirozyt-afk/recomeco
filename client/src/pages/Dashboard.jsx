import { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do Ministério</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{data?.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Em Cuidado</div>
          <div className="stat-value">{data?.inCare || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aguardando</div>
          <div className="stat-value">{data?.awaitingDecision || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Discípulos</div>
          <div className="stat-value">{data?.disciple || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Visitantes</div>
          <div className="stat-value">{data?.visitor || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Batizados</div>
          <div className="stat-value">{data?.baptized || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Não Bat.</div>
          <div className="stat-value">{data?.notBaptized || 0}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #dc143c 0%, #a01030 100%)' }}>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Sem Resp.</div>
          <div className="stat-value" style={{ color: '#fff' }}>{data?.withoutMentor || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="chart-card">
          <div className="chart-title">Por Status</div>
          <div className="chart-bars">
            {data?.byStatus?.map((item, index) => (
              <div key={index} className="chart-bar" style={{ height: `${(item.count / (data.total || 1)) * 100}%` }}>
                <span className="chart-bar-value">{item.count}</span>
                <span className="chart-bar-label">{item.status}</span>
              </div>
            ))}
            {(!data?.byStatus || data.byStatus.length === 0) && (
              <div className="empty-state" style={{ padding: '20px' }}>Sem dados</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Por Primeira Decisão</div>
          <div className="chart-bars">
            {data?.byFirstDecision?.map((item, index) => (
              <div key={index} className="chart-bar" style={{ height: `${(item.count / (data.total || 1)) * 100}%` }}>
                <span className="chart-bar-value">{item.count}</span>
                <span className="chart-bar-label">{item.decision}</span>
              </div>
            ))}
            {(!data?.byFirstDecision || data.byFirstDecision.length === 0) && (
              <div className="empty-state" style={{ padding: '20px' }}>Sem dados</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="chart-card">
          <div className="chart-title">Por Sexo</div>
          <div className="chart-bars">
            {data?.byGender?.map((item, index) => (
              <div key={index} className="chart-bar" style={{ height: `${(item.count / (data.total || 1)) * 100}%` }}>
                <span className="chart-bar-value">{item.count}</span>
                <span className="chart-bar-label">{item.gender}</span>
              </div>
            ))}
            {(!data?.byGender || data.byGender.length === 0) && (
              <div className="empty-state" style={{ padding: '20px' }}>Sem dados</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Por Mês</div>
          <div className="chart-bars">
            {data?.byMonth?.slice(0, 6).map((item, index) => (
              <div key={index} className="chart-bar" style={{ height: `${(item.count / Math.max(...(data.byMonth?.map(m => m.count) || [1]), 1)) * 100}%` }}>
                <span className="chart-bar-value">{item.count}</span>
                <span className="chart-bar-label">{item.month?.substring(0, 3)}</span>
              </div>
            ))}
            {(!data?.byMonth || data.byMonth.length === 0) && (
              <div className="empty-state" style={{ padding: '20px' }}>Sem dados</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Cadastros Recentes</h3>
          {data?.recentPeople?.length > 0 ? (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {data.recentPeople.map((person) => (
                <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: '600' }}>{person.fullName}</span>
                  <span className="tag tag-status" style={{ fontSize: '10px' }}>{person.discipleStatus}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', color: 'var(--primary)', fontSize: '16px' }}>Decisões Recentes</h3>
          {data?.recentDecisions?.length > 0 ? (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {data.recentDecisions.map((person) => (
                <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: '600' }}>{person.fullName}</span>
                  <span className="tag tag-decision" style={{ fontSize: '10px' }}>{person.firstDecision}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhuma</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;