import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getPerson, createPerson, updatePerson, getMentors, getVisitor, completeVisitorRegistration } from '../services/api';

const FIRST_DECISIONS = ['Aceitou Jesus', 'Reconciliação', 'Visitante', 'Pedido de oração', 'Outro'];
const STATUS_OPTIONS = ['Em cuidado', 'Aguardando decisão', 'Discípulo', 'Visitante'];
const FINAL_DECISIONS = ['Em acompanhamento', 'Tornou-se discípulo', 'Permaneceu visitante', 'Aguardando decisão', 'Sem contato', 'Outro'];

function PersonForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const visitorId = searchParams.get('visitorId');
  const isEditing = Boolean(id);
  const isCompletingVisitor = Boolean(visitorId);

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    decisionDate: '',
    fullName: '',
    birthDate: '',
    fullAddress: '',
    contact: '',
    gender: '',
    baptized: 'Não',
    firstDecision: 'Visitante',
    discipleStatus: 'Em cuidado',
    finalDecision: 'Em acompanhamento',
    photo: '',
    notes: '',
    mentorIds: [],
    careStartDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [id, visitorId]);

  const loadData = async () => {
    try {
      const [mentorsData] = await Promise.all([getMentors()]);
      setMentors(mentorsData.filter(m => m.active));

      if (visitorId) {
        const visitor = await getVisitor(visitorId);
        const fullName = visitor.firstName + (visitor.lastName ? ' ' + visitor.lastName : '');
        const visitDateStr = visitor.visitDate || new Date().toISOString().split('T')[0];
        setForm(prev => ({
          ...prev,
          decisionDate: visitDateStr,
          fullName,
          contact: visitor.whatsapp || '',
          notes: visitor.notes || ''
        }));
      } else if (id) {
        const person = await getPerson(id);
        const mentorIds = person.mentors
          ? person.mentors.split(', ').map(m => parseInt(m.id || m))
          : [];
        setForm({
          decisionDate: person.decisionDate || '',
          fullName: person.fullName || '',
          birthDate: person.birthDate || '',
          fullAddress: person.fullAddress || '',
          contact: person.contact || '',
          gender: person.gender || '',
          baptized: person.baptized || 'Não',
          firstDecision: person.firstDecision || '',
          discipleStatus: person.discipleStatus || 'Em cuidado',
          finalDecision: person.finalDecision || 'Em acompanhamento',
          photo: person.photo || '',
          notes: person.notes || '',
          mentorIds,
          careStartDate: person.careStartDate || new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === 'decisionDate' && value) {
      const date = new Date(value);
      const monthIndex = date.getMonth();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      setForm(prev => ({ ...prev, decisionMonth: months[monthIndex] }));
    }
  };

  const handleMentorChange = (mentorId) => {
    setForm(prev => {
      const newMentorIds = prev.mentorIds.includes(mentorId)
        ? prev.mentorIds.filter(id => id !== mentorId)
        : [...prev.mentorIds, mentorId];
      return { ...prev, mentorIds: newMentorIds };
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Foto muito grande! O tamanho máximo é 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photo: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        decisionMonth: form.decisionDate ? new Date(form.decisionDate).toLocaleString('pt-BR', { month: 'long' }) : null
      };

      if (isCompletingVisitor) {
        await completeVisitorRegistration(visitorId, data);
        alert('Cadastro completo criado com sucesso!');
        navigate('/visitors');
      } else if (isEditing) {
        await updatePerson(id, data);
      } else {
        await createPerson(data);
      }
      navigate(isCompletingVisitor ? '/visitors' : '/people');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  const pageTitle = isCompletingVisitor
    ? 'Completar Cadastro'
    : isEditing
      ? 'Editar Pessoa'
      : 'Novo Cadastro';

  const pageSubtitle = isCompletingVisitor
    ? 'Preencha os dados completos para iniciar o acompanhamento'
    : isEditing
      ? 'Atualize os dados da pessoa'
      : 'Cadastre uma nova pessoa';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{pageTitle}</h1>
        <p className="page-subtitle">{pageSubtitle}</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="photo-upload-section">
          <label className="form-label">Foto da Pessoa (opcional, máx 10MB)</label>
          <div className="photo-upload-container">
            <div className="photo-preview">
              {form.photo ? (
                <img src={form.photo} alt="Preview" className="photo-preview-img" />
              ) : (
                <div className="photo-placeholder">
                  <span className="photo-placeholder-icon">📷</span>
                  <span>Clique para adicionar foto</span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="photo-input"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="btn btn-secondary btn-sm photo-upload-btn">
              {form.photo ? 'Trocar Foto' : 'Adicionar Foto'}
            </label>
            {form.photo && (
              <button type="button" className="btn btn-danger btn-sm" onClick={removePhoto}>
                Remover
              </button>
            )}
          </div>
        </div>

        <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Dados Pessoais</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              name="fullName"
              className="form-input"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <input
              type="date"
              name="birthDate"
              className="form-input"
              value={form.birthDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Contato / WhatsApp</label>
            <input
              type="text"
              name="contact"
              className="form-input"
              value={form.contact}
              onChange={handleChange}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sexo</label>
            <select
              name="gender"
              className="form-select"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Endereço Completo</label>
          <input
            type="text"
            name="fullAddress"
            className="form-input"
            value={form.fullAddress}
            onChange={handleChange}
            placeholder="Rua, número, bairro, cidade..."
          />
        </div>

        <h3 style={{ marginTop: '32px', marginBottom: '20px', color: 'var(--primary)' }}>Acompanhamento</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data de Início do Acompanhamento</label>
            <input
              type="date"
              name="careStartDate"
              className="form-input"
              value={form.careStartDate}
              onChange={handleChange}
            />
          </div>
          {form.careStartDate && (() => {
            const start = new Date(form.careStartDate + 'T12:00:00');
            start.setDate(start.getDate() + 15);
            return (
              <div className="form-group">
                <label className="form-label">Previsão de Término (15 dias)</label>
                <input
                  type="text"
                  className="form-input"
                  value={start.toLocaleDateString('pt-BR')}
                  readOnly
                  style={{ background: '#f0f0f0', color: '#666' }}
                />
              </div>
            );
          })()}
        </div>

        <h3 style={{ marginTop: '32px', marginBottom: '20px', color: 'var(--primary)' }}>Dados da Decisão</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data da Decisão</label>
            <input
              type="date"
              name="decisionDate"
              className="form-input"
              value={form.decisionDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primeira Decisão</label>
            <select
              name="firstDecision"
              className="form-select"
              value={form.firstDecision}
              onChange={handleChange}
            >
              <option value="">Selecione...</option>
              {FIRST_DECISIONS.map(decision => (
                <option key={decision} value={decision}>{decision}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status do Discípulo</label>
            <select
              name="discipleStatus"
              className="form-select"
              value={form.discipleStatus}
              onChange={handleChange}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Batizado</label>
            <select
              name="baptized"
              className="form-select"
              value={form.baptized}
              onChange={handleChange}
            >
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Decisão Final</label>
          <select
            name="finalDecision"
            className="form-select"
            value={form.finalDecision}
            onChange={handleChange}
          >
            {FINAL_DECISIONS.map(decision => (
              <option key={decision} value={decision}>{decision}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Responsáveis pelo Acompanhamento</label>
          <div className="checkbox-group">
            {mentors.map(mentor => (
              <label key={mentor.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.mentorIds.includes(mentor.id)}
                  onChange={() => handleMentorChange(mentor.id)}
                />
                {mentor.fullName}
              </label>
            ))}
            {mentors.length === 0 && <span style={{ color: 'var(--text-light)' }}>Nenhum responsável cadastrado</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observações</label>
          <textarea
            name="notes"
            className="form-textarea"
            value={form.notes}
            onChange={handleChange}
            placeholder="Observações importantes..."
          />
        </div>

        <div className="btn-group" style={{ marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isCompletingVisitor ? 'Iniciar Acompanhamento' : isEditing ? 'Atualizar' : 'Cadastrar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(isCompletingVisitor ? '/visitors' : '/people')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default PersonForm;
