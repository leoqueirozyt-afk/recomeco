import { useState, useEffect } from 'react';
import { getMembers, getMember, createMember, updateMember, deleteMember, setMemberStatus, setMemberCareStatus } from '../services/api';

function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [careLoading, setCareLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterBaptized, setFilterBaptized] = useState('Todos');
  const [filterGds, setFilterGds] = useState('Todos');
  const [filterLeadership, setFilterLeadership] = useState('Todos');
  const [filterAllergy, setFilterAllergy] = useState('Todos');
  const [filterBirthday, setFilterBirthday] = useState('Todos');

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailMember, setDetailMember] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm] = useState({
    member_type: 'Adulto',
    full_name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    full_address: '',
    marital_status: '',
    gds: '',
    is_leadership: false,
    baptized: false,
    allergy: '',
    responsible_name: '',
    responsible_contact: '',
    child_gds: '',
    child_allergy: '',
    member_status: 'Ativo',
    care_status: 'Sem cuidado ativo',
    notes: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const result = await getMembers();
      setMembers(result);
    } catch (err) {
      console.error('Erro ao carregar membros:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberDetail = async (id) => {
    try {
      const result = await getMember(id);
      setDetailMember(result);
      setShowDetail(true);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name) {
      setError('Nome completo é obrigatório.');
      return;
    }

    try {
      if (editingMember) {
        await updateMember(editingMember.id, form);
      } else {
        await createMember(form);
      }
      setShowModal(false);
      setEditingMember(null);
      setError('');
      loadMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    const idToDelete = deleteId;
    setMembers(prev => prev.filter(m => m.id !== idToDelete));
    setDeleteId(null);
    try {
      await deleteMember(idToDelete);
    } catch (err) {
      console.error('Erro ao excluir:', err);
      loadMembers();
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = member.memberStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    setMembers(prev => prev.map(m =>
      m.id === member.id ? { ...m, memberStatus: newStatus } : m
    ));
    try {
      await setMemberStatus(member.id, newStatus);
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      await loadMembers();
    }
  };

  const handleCareStatus = async (member, status) => {
    if (careLoading) return;
    setCareLoading(member.id);
    setMembers(prev => prev.map(m =>
      m.id === member.id ? { ...m, careStatus: status } : m
    ));
    try {
      await setMemberCareStatus(member.id, status);
      await loadMembers();
    } catch (err) {
      console.error('Erro ao alterar cuidado:', err);
      await loadMembers();
    } finally {
      setCareLoading(null);
    }
  };

  const openEdit = async (member) => {
    try {
      const full = await getMember(member.id);
      setEditingMember(full);
      setForm({
        member_type: full.memberType || 'Adulto',
        full_name: full.fullName || '',
        cpf: full.cpf || '',
        birth_date: full.birthDate || '',
        phone: full.phone || '',
        full_address: full.fullAddress || '',
        marital_status: full.maritalStatus || '',
        gds: full.gds || '',
        is_leadership: full.isLeadership || false,
        baptized: full.baptized || false,
        allergy: full.allergy || '',
        responsible_name: full.responsibleName || '',
        responsible_contact: full.responsibleContact || '',
        child_gds: full.childGds || '',
        child_allergy: full.childAllergy || '',
        member_status: full.memberStatus || 'Ativo',
        care_status: full.careStatus || 'Sem cuidado ativo',
        notes: full.notes || ''
      });
      setShowModal(true);
    } catch (err) {
      console.error('Erro ao carregar edição:', err);
    }
  };

  const openNew = () => {
    setEditingMember(null);
    setForm({
      member_type: 'Adulto',
      full_name: '', cpf: '', birth_date: '', phone: '', full_address: '',
      marital_status: '', gds: '', is_leadership: false, baptized: false, allergy: '',
      responsible_name: '', responsible_contact: '', child_gds: '', child_allergy: '',
      member_status: 'Ativo', care_status: 'Sem cuidado ativo', notes: ''
    });
    setError('');
    setShowModal(true);
  };

  const handleFormChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const filteredMembers = members.filter(m => {
    const searchLower = search.toLowerCase();
    const nameMatch = !search || m.fullName.toLowerCase().includes(searchLower);
    let typeMatch = true;
    if (filterType === 'Adultos') typeMatch = m.memberType === 'Adulto';
    else if (filterType === 'Crianças') typeMatch = m.memberType === 'Criança';
    let statusMatch = true;
    if (filterStatus === 'Ativos') statusMatch = m.memberStatus === 'Ativo';
    else if (filterStatus === 'Inativos') statusMatch = m.memberStatus === 'Inativo';
    let baptMatch = true;
    if (filterBaptized === 'Sim') baptMatch = m.baptized === true;
    else if (filterBaptized === 'Não') baptMatch = m.baptized === false;
    let gdsMatch = true;
    if (filterGds !== 'Todos') gdsMatch = (m.gds === filterGds || m.childGds === filterGds);
    let leaderMatch = true;
    if (filterLeadership === 'Sim') leaderMatch = m.isLeadership === true;
    else if (filterLeadership === 'Não') leaderMatch = m.isLeadership === false;
    let allergyMatch = true;
    if (filterAllergy === 'Com alergia') allergyMatch = Boolean(m.allergy || m.childAllergy);
    else if (filterAllergy === 'Sem alergia') allergyMatch = !m.allergy && !m.childAllergy;
    let birthdayMatch = true;
    if (filterBirthday === 'Sim' && m.birthDate) {
      const now = new Date();
      const bDay = new Date(m.birthDate + 'T12:00:00');
      birthdayMatch = bDay.getMonth() === now.getMonth();
    }
    return nameMatch && typeMatch && statusMatch && baptMatch && gdsMatch && leaderMatch && allergyMatch && birthdayMatch;
  });

  const inCareMembers = members.filter(m =>
    m.careStatus && m.careStatus !== 'Sem cuidado ativo'
  );

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Membros</h1>
        <p className="page-subtitle">Gerenciamento de membros do Ministério Recomeço</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Membro</button>
      </div>

      <div className="filters">
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Buscar por nome</label>
          <input type="text" className="form-input" placeholder="Nome..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
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
          <label className="form-label" style={{ marginBottom: '6px' }}>Status</label>
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Ativos">Ativos</option>
            <option value="Inativos">Inativos</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Batizados</label>
          <select className="form-select" value={filterBaptized} onChange={(e) => setFilterBaptized(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>GDS</label>
          <select className="form-select" value={filterGds} onChange={(e) => setFilterGds(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Jovens Aljava">Jovens Aljava</option>
            <option value="Mulheres de Sião">Mulheres de Sião</option>
            <option value="Homens de Honra">Homens de Honra</option>
            <option value="Ovelhinhas de Sião">Ovelhinhas de Sião</option>
            <option value="Herdeiros de Sião">Herdeiros de Sião</option>
            <option value="Nenhum">Nenhum</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Liderança</label>
          <select className="form-select" value={filterLeadership} onChange={(e) => setFilterLeadership(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Alérgicos</label>
          <select className="form-select" value={filterAllergy} onChange={(e) => setFilterAllergy(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Com alergia">Com alergia</option>
            <option value="Sem alergia">Sem alergia</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>Aniversariantes</label>
          <select className="form-select" value={filterBirthday} onChange={(e) => setFilterBirthday(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
          </select>
        </div>
      </div>

      {inCareMembers.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            background: '#fff5f5', border: '1px solid rgba(220,20,60,0.2)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>🌱</span>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#dc143c', margin: 0 }}>
                Discípulos em Cuidado ({inCareMembers.length})
              </h3>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px'
            }}>
              {inCareMembers.map(m => (
                <div key={m.id} style={{
                  background: 'white', borderRadius: '8px', padding: '10px 14px',
                  border: '1px solid #e0e0e0', display: 'flex',
                  alignItems: 'center', gap: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: '#dc143c', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', flexShrink: 0
                  }}>
                    {m.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '600', color: '#2c3e50',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {m.fullName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#e67e22', fontWeight: '600' }}>
                      {m.careStatus}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => loadMemberDetail(m.id)}
                    >
                      Ver
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      disabled={careLoading === m.id}
                      onClick={() => handleCareStatus(m, 'Sem cuidado ativo')}
                    >
                      {careLoading === m.id ? '...' : 'Remover'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">Nenhum membro encontrado</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
            {filteredMembers.length} membro(s)
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Nascimento</th>
                    <th>GDS</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(m => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.fullName}</strong>
                        {m.memberType === 'Adulto' && m.phone && (
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{m.phone}</div>
                        )}
                        {m.memberType === 'Criança' && m.responsibleName && (
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                            Resp: {m.responsibleName} {m.responsibleContact && `(${m.responsibleContact})`}
                          </div>
                        )}
                        {m.careStatus && m.careStatus !== 'Sem cuidado ativo' && (
                          <div style={{ marginTop: '4px' }}>
                            <span className="tag tag-care">{m.careStatus}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`tag ${m.memberType === 'Adulto' ? 'tag-primary' : 'tag-secondary'}`}>
                          {m.memberType}
                        </span>
                      </td>
                      <td>
                        {m.birthDate ? new Date(m.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td>{m.gds || m.childGds || '-'}</td>
                      <td>
                        <span className={`tag ${m.memberStatus === 'Ativo' ? 'tag-baptized' : 'tag-decision'}`}>
                          {m.memberStatus}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" style={{ flexWrap: 'wrap', gap: '4px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => loadMemberDetail(m.id)}>Ver</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>Editar</button>
                          <button
                            className={`btn btn-sm ${m.memberStatus === 'Ativo' ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => handleToggleStatus(m)}
                          >
                            {m.memberStatus === 'Ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={careLoading === m.id}
                            onClick={() => handleCareStatus(m, m.careStatus === 'Em cuidado pelo Recomeço' ? 'Sem cuidado ativo' : 'Em cuidado pelo Recomeço')}
                          >
                            {careLoading === m.id ? '...' : (m.careStatus === 'Em cuidado pelo Recomeço' ? 'Remover' : 'Cuidado')}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(m.id)}>Excluir</button>
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
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingMember ? 'Editar Membro' : 'Novo Membro'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: '#fee', color: '#c00', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button type="button" onClick={() => handleFormChange('member_type', 'Adulto')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
                    border: form.member_type === 'Adulto' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                    background: form.member_type === 'Adulto' ? '#fff0f0' : '#fafafa',
                    color: form.member_type === 'Adulto' ? '#dc143c' : '#555' }}>
                  Adulto
                </button>
                <button type="button" onClick={() => handleFormChange('member_type', 'Criança')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
                    border: form.member_type === 'Criança' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                    background: form.member_type === 'Criança' ? '#fff0f0' : '#fafafa',
                    color: form.member_type === 'Criança' ? '#dc143c' : '#555' }}>
                  Criança
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Nome completo *</label>
                <input type="text" className="form-input" value={form.full_name}
                  onChange={(e) => handleFormChange('full_name', e.target.value)} placeholder="Nome completo" required />
              </div>

              {form.member_type === 'Adulto' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Estado civil</label>
                      <select className="form-select" value={form.marital_status} onChange={(e) => handleFormChange('marital_status', e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="Solteiro">Solteiro(a)</option>
                        <option value="Casado">Casado(a)</option>
                        <option value="Divorciado">Divorciado(a)</option>
                        <option value="Viúvo">Viúvo(a)</option>
                        <option value="União estável">União estável</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <input type="text" className="form-input" value={form.cpf}
                        onChange={(e) => handleFormChange('cpf', e.target.value)} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Data de nascimento</label>
                      <input type="date" className="form-input" value={form.birth_date}
                        onChange={(e) => handleFormChange('birth_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Telefone</label>
                      <input type="text" className="form-input" value={form.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Endereço completo</label>
                    <input type="text" className="form-input" value={form.full_address}
                      onChange={(e) => handleFormChange('full_address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">GDS</label>
                      <select className="form-select" value={form.gds} onChange={(e) => handleFormChange('gds', e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="Jovens Aljava">Jovens Aljava</option>
                        <option value="Mulheres de Sião">Mulheres de Sião</option>
                        <option value="Homens de Honra">Homens de Honra</option>
                        <option value="Ovelhinhas de Sião">Ovelhinhas de Sião</option>
                        <option value="Herdeiros de Sião">Herdeiros de Sião</option>
                        <option value="Nenhum">Nenhum</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Liderança</label>
                      <select className="form-select" value={String(form.is_leadership)} onChange={(e) => handleFormChange('is_leadership', e.target.value === 'true')}>
                        <option value="false">Não</option>
                        <option value="true">Sim</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Batizado</label>
                      <select className="form-select" value={String(form.baptized)} onChange={(e) => handleFormChange('baptized', e.target.value === 'true')}>
                        <option value="false">Não</option>
                        <option value="true">Sim</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alergia</label>
                      <input type="text" className="form-input" value={form.allergy}
                        onChange={(e) => handleFormChange('allergy', e.target.value)} placeholder="Ex: Frutos do mar" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Data de nascimento</label>
                      <input type="date" className="form-input" value={form.birth_date}
                        onChange={(e) => handleFormChange('birth_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <input type="text" className="form-input" value={form.cpf}
                        onChange={(e) => handleFormChange('cpf', e.target.value)} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nome do responsável</label>
                      <input type="text" className="form-input" value={form.responsible_name}
                        onChange={(e) => handleFormChange('responsible_name', e.target.value)} placeholder="Nome do responsável" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contato do responsável</label>
                      <input type="text" className="form-input" value={form.responsible_contact}
                        onChange={(e) => handleFormChange('responsible_contact', e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">GDS</label>
                      <select className="form-select" value={form.child_gds} onChange={(e) => handleFormChange('child_gds', e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="Jovens Aljava">Jovens Aljava</option>
                        <option value="Mulheres de Sião">Mulheres de Sião</option>
                        <option value="Homens de Honra">Homens de Honra</option>
                        <option value="Ovelhinhas de Sião">Ovelhinhas de Sião</option>
                        <option value="Herdeiros de Sião">Herdeiros de Sião</option>
                        <option value="Nenhum">Nenhum</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alergia</label>
                      <input type="text" className="form-input" value={form.child_allergy}
                        onChange={(e) => handleFormChange('child_allergy', e.target.value)} placeholder="Ex: Lactose" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Endereço completo</label>
                    <input type="text" className="form-input" value={form.full_address}
                      onChange={(e) => handleFormChange('full_address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.member_status} onChange={(e) => handleFormChange('member_status', e.target.value)}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cuidado</label>
                  <select className="form-select" value={form.care_status} onChange={(e) => handleFormChange('care_status', e.target.value)}>
                    <option value="Sem cuidado ativo">Sem cuidado ativo</option>
                    <option value="Em cuidado pelo Recomeço">Em cuidado pelo Recomeço</option>
                    <option value="Acompanhamento finalizado">Acompanhamento finalizado</option>
                    <option value="Precisa de contato">Precisa de contato</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-textarea" value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)} style={{ minHeight: '80px' }} />
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">{editingMember ? 'Atualizar' : 'Cadastrar'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && detailMember && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Membro</h2>
              <button className="modal-close" onClick={() => setShowDetail(false)}>&times;</button>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>Nome:</strong> {detailMember.fullName}</div>
                <div><strong>Tipo:</strong> {detailMember.memberType}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>CPF:</strong> {detailMember.cpf || '-'}</div>
                <div><strong>Nascimento:</strong> {detailMember.birthDate ? new Date(detailMember.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</div>
              </div>
              {detailMember.memberType === 'Adulto' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>Telefone:</strong> {detailMember.phone || '-'}</div>
                    <div><strong>Estado civil:</strong> {detailMember.maritalStatus || '-'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>GDS:</strong> {detailMember.gds || '-'}</div>
                    <div><strong>Liderança:</strong> {detailMember.isLeadership ? 'Sim' : 'Não'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>Batizado:</strong> {detailMember.baptized ? 'Sim' : 'Não'}</div>
                    <div><strong>Alergia:</strong> {detailMember.allergy || '-'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>Responsável:</strong> {detailMember.responsibleName || '-'}</div>
                    <div><strong>Contato:</strong> {detailMember.responsibleContact || '-'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><strong>GDS:</strong> {detailMember.childGds || '-'}</div>
                    <div><strong>Alergia:</strong> {detailMember.childAllergy || '-'}</div>
                  </div>
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>Status:</strong> {detailMember.memberStatus}</div>
                <div><strong>Cuidado:</strong> {detailMember.careStatus}</div>
              </div>
              {detailMember.fullAddress && <div><strong>Endereço:</strong> {detailMember.fullAddress}</div>}
              {detailMember.notes && <div><strong>Observações:</strong> {detailMember.notes}</div>}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => setShowDetail(false)}>Fechar</button>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Exclusão</h2>
            </div>
            <p style={{ marginBottom: '24px' }}>Tem certeza que deseja excluir este membro?</p>
            <div className="btn-group">
              <button className="btn btn-danger" onClick={handleDelete}>Sim, excluir</button>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Members;
