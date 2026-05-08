import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPeople, deletePerson } from '../services/api';

const FIRST_DECISIONS = ['Aceitou Jesus', 'Reconciliação', 'Visitante', 'Pedido de oração', 'Outro'];
const STATUS_OPTIONS = ['Em cuidado', 'Aguardando decisão', 'Discípulo', 'Visitante'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function People() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [filterBaptized, setFilterBaptized] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      const result = await getPeople();
      setPeople(result);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePerson(deleteId);
      setDeleteId(null);
      loadPeople();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const filteredPeople = people.filter(person => {
    const matchesSearch = !search ||
      person.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      person.contact?.includes(search);
    const matchesStatus = !filterStatus || person.discipleStatus === filterStatus;
    const matchesMonth = !filterMonth || person.decisionMonth === filterMonth;
    const matchesDecision = !filterDecision || person.firstDecision === filterDecision;
    const matchesBaptized = !filterBaptized || person.baptized === filterBaptized;
    return matchesSearch && matchesStatus && matchesMonth && matchesDecision && matchesBaptized;
  });

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pessoas Cadastradas</h1>
        <p className="page-subtitle">{filteredPeople.length} pessoa(s) encontrada(s)</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="form-input search-input"
          placeholder="Buscar por nome ou contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filters">
        <select
          className="form-select filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os Status</option>
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select
          className="form-select filter-select"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">Todos os Meses</option>
          {MONTHS.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>

        <select
          className="form-select filter-select"
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
        >
          <option value="">Todas as Decisões</option>
          {FIRST_DECISIONS.map(decision => (
            <option key={decision} value={decision}>{decision}</option>
          ))}
        </select>

        <select
          className="form-select filter-select"
          value={filterBaptized}
          onChange={(e) => setFilterBaptized(e.target.value)}
        >
          <option value="">Batizados?</option>
          <option value="Sim">Sim</option>
          <option value="Não">Não</option>
        </select>
      </div>

      {filteredPeople.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">Nenhuma pessoa cadastrada</div>
          <p>Faça o primeiro cadastro!</p>
          <Link to="/people/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Novo Cadastro
          </Link>
        </div>
      ) : (
        <div className="people-grid">
          {filteredPeople.map(person => (
            <div key={person.id} className="person-card">
              {person.photo ? (
                <div className="person-card-photo">
                  <img src={person.photo} alt={person.fullName} />
                </div>
              ) : (
                <div className="person-card-photo person-card-photo-empty">
                  <span>{person.fullName?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="person-name">{person.fullName}</div>
              <div className="person-info">
                <strong>Decisão:</strong> {person.decisionDate ? new Date(person.decisionDate).toLocaleDateString('pt-BR') : '-'}
              </div>
              <div className="person-info">
                <strong>Mês:</strong> {person.decisionMonth || '-'}
              </div>
              <div className="person-info">
                <strong>Contato:</strong> {person.contact || '-'}
              </div>
              <div className="person-tags">
                <span className="tag tag-status">{person.discipleStatus}</span>
                <span className="tag tag-decision">{person.firstDecision}</span>
                <span className={`tag ${person.baptized === 'Sim' ? 'tag-baptized' : 'tag-not-baptized'}`}>
                  {person.baptized === 'Sim' ? 'Batizado' : 'Não Batizado'}
                </span>
              </div>
              {person.mentors && (
                <div className="person-info" style={{ marginTop: '8px' }}>
                  <strong>Responsável:</strong> {person.mentors}
                </div>
              )}
              <div className="person-actions">
                {person.contact && (
                  <a 
                    href={`https://wa.me/${person.contact.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-sm"
                  >
                    💬 WhatsApp
                  </a>
                )}
                <Link to={`/people/${person.id}`} className="btn btn-secondary btn-sm">
                  Editar
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(person.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Exclusão</h2>
            </div>
            <p style={{ marginBottom: '24px' }}>Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.</p>
            <div className="btn-group">
              <button className="btn btn-danger" onClick={handleDelete}>
                Sim, excluir
              </button>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default People;