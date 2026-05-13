import { useState, useEffect } from 'react';
import { getMentors, createMentor, updateMentor, deleteMentor } from '../services/api';

function Mentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    notes: '',
    active: true
  });

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      const result = await getMentors();
      setMentors(result);
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      if (editingMentor) {
        await updateMentor(editingMentor.id, form);
      } else {
        await createMentor(form);
      }
      setShowModal(false);
      setEditingMentor(null);
      setForm({ fullName: '', phone: '', notes: '', active: true });
      loadMentors();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMentor(deleteId);
      setDeleteId(null);
      loadMentors();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const openEdit = (mentor) => {
    setEditingMentor(mentor);
    setForm({
      fullName: mentor.fullName,
      phone: mentor.phone || '',
      notes: mentor.notes || '',
      active: Boolean(mentor.active)
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Líderes de Recomeço</h1>
        <p className="page-subtitle">Gerencie os líderes que acompanham o discipulado</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={() => { setEditingMentor(null); setForm({ fullName: '', phone: '', notes: '', active: true }); setShowModal(true); }}>
          + Novo Líder
        </button>
      </div>

      {mentors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👑</div>
          <div className="empty-text">Nenhum líder cadastrado</div>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>
            Cadastrar Primeiro Líder
          </button>
        </div>
      ) : (
        <>
          <div className="card mentors-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {mentors.map(mentor => (
                  <tr key={mentor.id}>
                    <td>{mentor.fullName}</td>
                    <td>{mentor.phone || '-'}</td>
                    <td>
                      <span className={`tag ${mentor.active ? 'tag-baptized' : 'tag-not-baptized'}`}>
                        {mentor.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        {mentor.phone && (
                          <a 
                            href={`https://wa.me/${mentor.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp btn-sm"
                          >
                            💬
                          </a>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(mentor)}>
                          Editar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(mentor.id)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingMentor ? 'Editar Líder' : 'Novo Líder'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-textarea"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  Ativo
                </label>
              </div>
              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {editingMentor ? 'Atualizar' : 'Cadastrar'}
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
            <p style={{ marginBottom: '24px' }}>Tem certeza que deseja excluir este responsável?</p>
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

export default Mentors;