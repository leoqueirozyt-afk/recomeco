import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPerson, becomeMember } from '../services/api';

function BecomeMemberForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    member_type: 'Adulto',
    cpf: '',
    birth_date: '',
    phone: '',
    zip_code: '',
    street: '',
    address_number: '',
    address_complement: '',
    neighborhood: '',
    city: '',
    state: '',
    marital_status: '',
    gds: '',
    is_leadership: false,
    baptized: false,
    has_allergy: false,
    allergy: '',
    responsible_name: '',
    responsible_contact: '',
    child_gds: '',
    child_has_allergy: false,
    child_allergy: '',
    notes: ''
  });

  useEffect(() => {
    loadPerson();
  }, [id]);

  const loadPerson = async () => {
    try {
      const p = await getPerson(id);
      setPerson(p);
      setForm(prev => ({
        ...prev,
        cpf: p.contact || '',
        phone: p.contact || '',
        birth_date: p.birthDate || '',
        full_address: p.fullAddress || '',
        notes: p.notes || ''
      }));
    } catch (err) {
      console.error('Erro ao carregar pessoa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await becomeMember(id, form);
      alert('Membro criado com sucesso!');
      navigate('/people');
    } catch (err) {
      alert('Erro ao criar membro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="empty-state">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tornar Membro</h1>
        <p className="page-subtitle">
          Preencha os dados completos de {person?.fullName} para finalizar o cadastro como membro
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/people')}>
          ← Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: person?.baptized === 'Sim' ? '#d4edda' : '#fff3cd', border: `1px solid ${person?.baptized === 'Sim' ? '#c3e6cb' : '#ffc107'}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{person?.baptized === 'Sim' ? '💧' : '👤'}</span>
          <div>
            <strong>{person?.fullName}</strong>
            {person?.contact && <div style={{ fontSize: '12px', color: '#666' }}>📞 {person?.contact}</div>}
            {person?.discipleStatus && <div style={{ fontSize: '12px', color: '#666' }}>Status: {person?.discipleStatus}</div>}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>Tipo de Membro</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button type="button" onClick={() => handleChange('member_type', 'Adulto')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', border: form.member_type === 'Adulto' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: form.member_type === 'Adulto' ? '#fff5f5' : '#fafafa', color: form.member_type === 'Adulto' ? '#dc143c' : '#555' }}>
              Adulto
            </button>
            <button type="button" onClick={() => handleChange('member_type', 'Criança')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', border: form.member_type === 'Criança' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: form.member_type === 'Criança' ? '#fff5f5' : '#fafafa', color: form.member_type === 'Criança' ? '#dc143c' : '#555' }}>
              Criança
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '16px' }}>Dados Pessoais</h3>

          <div className="form-group">
            <label className="form-label">CPF</label>
            <input type="text" className="form-input" value={form.cpf} onChange={e => handleChange('cpf', e.target.value)} placeholder="000.000.000-00" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input type="date" className="form-input" value={form.birth_date} onChange={e => handleChange('birth_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="text" className="form-input" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          {form.member_type === 'Adulto' ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Estado Civil</label>
                  <select className="form-select" value={form.marital_status} onChange={e => handleChange('marital_status', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Divorciado">Divorciado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                    <option value="União estável">União estável</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">GDS</label>
                  <select className="form-select" value={form.gds} onChange={e => handleChange('gds', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="Jovens Aljava">Jovens Aljava</option>
                    <option value="Mulheres de Sião">Mulheres de Sião</option>
                    <option value="Homens de Honra">Homens de Honra</option>
                    <option value="Ovelhinhas de Sião">Ovelhinhas de Sião</option>
                    <option value="Herdeiros de Sião">Herdeiros de Sião</option>
                    <option value="Nenhum">Nenhum</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Batizado?</label>
                  <select className="form-select" value={String(form.baptized)} onChange={e => handleChange('baptized', e.target.value === 'true')}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Possui alergia?</label>
                  <select className="form-select" value={String(form.has_allergy)} onChange={e => handleChange('has_allergy', e.target.value === 'true')}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
              </div>

              {form.has_allergy && (
                <div className="form-group">
                  <label className="form-label">Qual alergia?</label>
                  <input type="text" className="form-input" value={form.allergy} onChange={e => handleChange('allergy', e.target.value)} placeholder="Ex: Frutos do mar, lactose..." />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Liderança?</label>
                  <select className="form-select" value={String(form.is_leadership)} onChange={e => handleChange('is_leadership', e.target.value === 'true')}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Nome do Responsável</label>
                <input type="text" className="form-input" value={form.responsible_name} onChange={e => handleChange('responsible_name', e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="form-group">
                <label className="form-label">Contato do Responsável</label>
                <input type="text" className="form-input" value={form.responsible_contact} onChange={e => handleChange('responsible_contact', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GDS da Criança</label>
                  <select className="form-select" value={form.child_gds} onChange={e => handleChange('child_gds', e.target.value)}>
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
                  <label className="form-label">Possui alergia?</label>
                  <select className="form-select" value={String(form.child_has_allergy)} onChange={e => handleChange('child_has_allergy', e.target.value === 'true')}>
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </div>
              </div>
              {form.child_has_allergy && (
                <div className="form-group">
                  <label className="form-label">Qual alergia?</label>
                  <input type="text" className="form-input" value={form.child_allergy} onChange={e => handleChange('child_allergy', e.target.value)} placeholder="Ex: Lactose, ovo..." />
                </div>
              )}
            </>
          )}

          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginTop: '24px', marginBottom: '16px' }}>Endereço</h3>

          <div className="form-group">
            <label className="form-label">CEP</label>
            <input type="text" className="form-input" value={form.zip_code} onChange={e => handleChange('zip_code', e.target.value)} placeholder="00000-000" maxLength={9} />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 3 }}>
              <label className="form-label">Rua</label>
              <input type="text" className="form-input" value={form.street} onChange={e => handleChange('street', e.target.value)} placeholder="Nome da rua" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Número</label>
              <input type="text" className="form-input" value={form.address_number} onChange={e => handleChange('address_number', e.target.value)} placeholder="Nº" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Complemento</label>
              <input type="text" className="form-input" value={form.address_complement} onChange={e => handleChange('address_complement', e.target.value)} placeholder="Apto, bloco..." />
            </div>
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input type="text" className="form-input" value={form.neighborhood} onChange={e => handleChange('neighborhood', e.target.value)} placeholder="Bairro" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Cidade</label>
              <input type="text" className="form-input" value={form.city} onChange={e => handleChange('city', e.target.value)} placeholder="Cidade" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">UF</label>
              <select className="form-select" value={form.state} onChange={e => handleChange('state', e.target.value)}>
                <option value="">UF</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => handleChange('notes', e.target.value)} style={{ minHeight: '80px' }} />
          </div>
        </div>

        <div className="btn-group" style={{ marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Tornar Membro'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/people')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default BecomeMemberForm;