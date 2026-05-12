import { useState, useEffect } from 'react';
import { getMembers } from '../services/api';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function Birthdays() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-based
  const currentMonthStr = String(currentMonth + 1).padStart(2, '0');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterGds, setFilterGds] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0-based

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const result = await getMembers({ status: 'Ativo' });
      setMembers(result);
    } catch (err) {
      console.error('Erro ao carregar membros:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthStr = String(selectedMonth + 1).padStart(2, '0');

  const filtered = members.filter(m => {
    if (!m.birthDate) return false;
    const bd = String(m.birthDate);
    if (!bd.startsWith(`-${monthStr}-`) && !bd.includes(`-${monthStr}-`)) return false;

    const searchLower = search.toLowerCase();
    const nameMatch = !search || m.fullName.toLowerCase().includes(searchLower);
    let typeMatch = true;
    if (filterType === 'Adultos') typeMatch = m.memberType === 'Adulto';
    else if (filterType === 'Crianças') typeMatch = m.memberType === 'Criança';
    let gdsMatch = true;
    if (filterGds !== 'Todos') gdsMatch = (m.gds === filterGds || m.childGds === filterGds);
    return nameMatch && typeMatch && gdsMatch;
  }).sort((a, b) => {
    const aDay = parseInt(a.birthDate.split('-').pop(), 10);
    const bDay = parseInt(b.birthDate.split('-').pop(), 10);
    return aDay - bDay;
  });

  const formatBirthday = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    return `${parseInt(parts[2], 10)} de ${MESES[parseInt(parts[1], 10) - 1]}`;
  };

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Aniversariantes do mês</h1>
        <p className="page-subtitle">Aniversariantes de {MESES[currentMonth]}</p>
      </div>

      <div className="filters">
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Buscar por nome</label>
          <input type="text" className="form-input" placeholder="Nome..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Tipo</label>
          <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Adultos">Adultos</option>
            <option value="Crianças">Crianças</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>GDS</label>
          <select className="form-select" value={filterGds} onChange={(e) => setFilterGds(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Jovens Aljava">Jovens Aljava</option>
            <option value="Mulheres de Sião">Mulheres de Sião</option>
            <option value="Homens de Honra">Homens de Honra</option>
            <option value="Nenhum">Nenhum</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Mês</label>
          <select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={i} value={i}>{m} {i === currentMonth ? '(atual)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎂</div>
          <div className="empty-text">Nenhum aniversariante neste mês</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
            {filtered.length} aniversariante(s) em {MESES[selectedMonth]}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Nascimento</th>
                    <th>Contato</th>
                    <th>GDS</th>
                    <th>Alergia</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'var(--primary)', color: '#fff',
                          fontWeight: '700', fontSize: '14px'
                        }}>
                          {parseInt(m.birthDate.split('-').pop(), 10)}
                        </span>
                      </td>
                      <td><strong>{m.fullName}</strong></td>
                      <td>
                        <span className={`tag ${m.memberType === 'Adulto' ? 'tag-primary' : 'tag-secondary'}`}>
                          {m.memberType}
                        </span>
                      </td>
                      <td>{m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>
                        {m.memberType === 'Adulto' ? (m.phone || '-') : (m.responsibleContact || m.responsibleName || '-')}
                      </td>
                      <td>{m.gds || m.childGds || '-'}</td>
                      <td>{m.allergy || m.childAllergy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Birthdays;
