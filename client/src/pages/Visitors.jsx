import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVisitors, createVisitor, updateVisitor, deleteVisitor } from '../services/api';

function Visitors() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchWhatsapp, setSearchWhatsapp] = useState('');
  const [filterSent, setFilterSent] = useState('today');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: '',
    whatsapp: '',
    notes: ''
  });

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const result = await getVisitors();
      setVisitors(result);
    } catch (error) {
      console.error('Erro ao carregar visitantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName) {
      alert('Nome é obrigatório');
      return;
    }
    if (!form.visitDate) {
      alert('Data da visita é obrigatória');
      return;
    }

    try {
      if (editingVisitor) {
        await updateVisitor(editingVisitor.id, form);
      } else {
        await createVisitor(form);
      }
      setShowModal(false);
      setEditingVisitor(null);
      setForm({ visitDate: new Date().toISOString().split('T')[0], firstName: '', lastName: '', whatsapp: '', notes: '' });
      loadVisitors();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVisitor(deleteId);
      setDeleteId(null);
      loadVisitors();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleCompleteRegistration = (visitor) => {
    navigate(`/people/new?visitorId=${visitor.id}`);
  };

  const handleViewRegistration = (visitor) => {
    if (visitor.recomecoPersonId) {
      navigate(`/people/${visitor.recomecoPersonId}`);
    }
  };

  const openEdit = (visitor) => {
    setEditingVisitor(visitor);
    setForm({
      visitDate: visitor.visitDate || '',
      firstName: visitor.firstName || '',
      lastName: visitor.lastName || '',
      whatsapp: visitor.whatsapp || '',
      notes: visitor.notes || ''
    });
    setShowModal(true);
  };

  const filteredVisitors = visitors.filter(v => {
    const nameMatch = !searchName ||
      (v.firstName + ' ' + (v.lastName || '')).toLowerCase().includes(searchName.toLowerCase());
    const whatsappMatch = !searchWhatsapp ||
      (v.whatsapp || '').includes(searchWhatsapp);
    let sentMatch = true;
    if (filterSent === 'sent') sentMatch = v.sentToRecomeco;
    else if (filterSent === 'notsent') sentMatch = !v.sentToRecomeco;
    let dateMatch = true;
    if (filterSent === 'today') {
      dateMatch = v.visitDate === filterDate;
    }
    return nameMatch && whatsappMatch && sentMatch && dateMatch;
  });

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cadastros Visitantes Monte Sião</h1>
        <p className="page-subtitle">Registro e controle de visitantes da igreja</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={() => { setEditingVisitor(null); setForm({ visitDate: new Date().toISOString().split('T')[0], firstName: '', lastName: '', whatsapp: '', notes: '' }); setShowModal(true); }}>
          + Novo Visitante
        </button>
      </div>

      <div className="filters">
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Buscar por nome</label>
          <input
            type="text"
            className="form-input"
            placeholder="Digite o nome..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>WhatsApp</label>
          <input
            type="text"
            className="form-input"
            placeholder="(11) 99999-9999"
            value={searchWhatsapp}
            onChange={(e) => setSearchWhatsapp(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Data da Visita</label>
          <input
            type="date"
            className="form-input"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Status</label>
          <select
            className="form-select"
            value={filterSent}
            onChange={(e) => setFilterSent(e.target.value)}
          >
            <option value="today">Visitantes de hoje</option>
            <option value="all">Todos</option>
            <option value="notsent">Aguardando Acompanhamento</option>
            <option value="sent">Em Acompanhamento</option>
          </select>
        </div>
      </div>

      {filteredVisitors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👋</div>
          <div className="empty-text">Nenhum visitante encontrado</div>
          {filterSent === 'today' && (
            <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
              Nenhum visitante cadastrado para hoje ({new Date().toLocaleDateString('pt-BR')})
            </p>
          )}
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>
            Cadastrar Primeiro Visitante
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
            {filterSent === 'today'
              ? `Visitantes de hoje: ${filteredVisitors.length}`
              : `${filteredVisitors.length} visitante(s) encontrado(s)`}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data da Visita</th>
                    <th>Nome</th>
                    <th>WhatsApp</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.map(visitor => (
                    <tr key={visitor.id}>
                      <td>{visitor.visitDate ? new Date(visitor.visitDate).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{visitor.firstName}{visitor.lastName ? ' ' + visitor.lastName : ''}</td>
                      <td>{visitor.whatsapp || '-'}</td>
                      <td>
                        {visitor.sentToRecomeco ? (
                          <span className="tag tag-baptized">Em Acompanhamento</span>
                        ) : (
                          <span className="tag tag-decision">Aguardando Acompanhamento</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group">
                          {visitor.whatsapp && (
                            <a
                              href={`https://wa.me/${visitor.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-whatsapp btn-sm"
                            >
                              💬
                            </a>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(visitor)}>
                            Editar
                          </button>
                          {!visitor.sentToRecomeco ? (
                            <button className="btn btn-primary btn-sm" onClick={() => handleCompleteRegistration(visitor)}>
                              Completar Cadastro
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => handleViewRegistration(visitor)}>
                              Ver Cadastro Completo
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(visitor.id)}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingVisitor ? 'Editar Visitante' : 'Novo Visitante'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Data da Visita *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.visitDate}
                  onChange={(e) => setForm(prev => ({ ...prev, visitDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Nome do visitante"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sobrenome</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.whatsapp}
                  onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-textarea"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Veio no culto de domingo"
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {editingVisitor ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Exclusão</h2>
            </div>
            <p style={{ marginBottom: '24px' }}>Tem certeza que deseja excluir este visitante?</p>
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

export default Visitors;
