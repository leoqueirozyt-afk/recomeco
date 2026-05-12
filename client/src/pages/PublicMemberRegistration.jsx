import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../services/getApiBase';
import { fetchAddressByCEP } from '../services/cepService';
import { formatPhone, formatCPF, formatCEP, validatePhone, validateCPF, onlyNumbers } from '../utils/formatters';

const API_BASE = getApiBase();

function PublicMemberRegistration() {
  const [memberType, setMemberType] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [adultForm, setAdultForm] = useState({
    fullName: '', maritalStatus: '', cpf: '', birthDate: '',
    phone: '', zipCode: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', gds: '', isLeadership: '',
    baptized: '', allergy: '', notes: ''
  });

  const [childForm, setChildForm] = useState({
    fullName: '', birthDate: '', cpf: '', zipCode: '', street: '',
    number: '', complement: '', neighborhood: '', city: '', state: '',
    responsibleName: '', responsibleContact: '', allergy: '', childGds: '', notes: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [cepSearching, setCepSearching] = useState(false);
  const [cepMessage, setCepMessage] = useState('');

  const handleAdultChange = (name, value) => {
    setAdultForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleChildChange = (name, value) => {
    setChildForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePhoneChange = (formSetter, form, name, value) => {
    formSetter(prev => ({ ...prev, [name]: formatPhone(value) }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCpfChange = (formSetter, form, name, value) => {
    formSetter(prev => ({ ...prev, [name]: formatCPF(value) }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleZipCodeChange = async (formSetter, form, name, value) => {
    const masked = formatCEP(value);
    formSetter(prev => ({ ...prev, [name]: masked }));
    setCepMessage('');

    if (onlyNumbers(value).length === 8) {
      setCepSearching(true);
      setCepMessage('Buscando endereço...');
      try {
        const result = await fetchAddressByCEP(value);
        if (result.error) {
          setCepMessage(result.error);
        } else {
          formSetter(prev => ({
            ...prev,
            zipCode: result.cep || masked,
            street: result.street,
            neighborhood: result.neighborhood,
            city: result.city,
            state: result.state
          }));
          setCepMessage('');
        }
      } catch {
        setCepMessage('Não foi possível buscar o CEP agora. Preencha o endereço manualmente.');
      }
      setCepSearching(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!memberType) { setError('Selecione o tipo de cadastro.'); return false; }
    if (memberType === 'Adulto') {
      if (!adultForm.fullName) errs.fullName = 'Nome completo é obrigatório.';
      if (adultForm.cpf && !validateCPF(adultForm.cpf)) errs.cpf = 'Informe um CPF válido.';
      if (adultForm.phone && !validatePhone(adultForm.phone)) errs.phone = 'Informe um telefone válido com DDD.';
    } else {
      if (!childForm.fullName) errs.fullName = 'Nome é obrigatório.';
      if (childForm.cpf && !validateCPF(childForm.cpf)) errs.cpf = 'Informe um CPF válido.';
      if (childForm.responsibleContact && !validatePhone(childForm.responsibleContact)) errs.responsibleContact = 'Informe um telefone válido com DDD.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      let payload = {};

      if (memberType === 'Adulto') {
        payload = {
          member_type: 'Adulto',
          full_name: adultForm.fullName,
          marital_status: adultForm.maritalStatus || null,
          cpf: onlyNumbers(adultForm.cpf) || null,
          birth_date: adultForm.birthDate || null,
          phone: onlyNumbers(adultForm.phone) || null,
          gds: adultForm.gds || null,
          is_leadership: adultForm.isLeadership === 'true',
          baptized: adultForm.baptized === 'true',
          allergy: adultForm.allergy || null,
          notes: adultForm.notes || null,
          zip_code: onlyNumbers(adultForm.zipCode) || null,
          street: adultForm.street || null,
          address_number: adultForm.number || null,
          address_complement: adultForm.complement || null,
          neighborhood: adultForm.neighborhood || null,
          city: adultForm.city || null,
          state: adultForm.state || null
        };
      } else {
        payload = {
          member_type: 'Criança',
          full_name: childForm.fullName,
          birth_date: childForm.birthDate || null,
          cpf: onlyNumbers(childForm.cpf) || null,
          child_allergy: childForm.allergy || null,
          child_gds: childForm.childGds || null,
          notes: childForm.notes || null,
          responsible_name: childForm.responsibleName || null,
          responsible_contact: onlyNumbers(childForm.responsibleContact) || null,
          zip_code: onlyNumbers(childForm.zipCode) || null,
          street: childForm.street || null,
          address_number: childForm.number || null,
          address_complement: childForm.complement || null,
          neighborhood: childForm.neighborhood || null,
          city: childForm.city || null,
          state: childForm.state || null
        };
      }

      const res = await fetch(`${API_BASE}/api/public/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');

      setSuccess(true);
      setMemberType('');
      if (memberType === 'Adulto') {
        setAdultForm({
          fullName: '', maritalStatus: '', cpf: '', birthDate: '', phone: '',
          zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
          gds: '', isLeadership: '', baptized: '', allergy: '', notes: ''
        });
      } else {
        setChildForm({
          fullName: '', birthDate: '', cpf: '', zipCode: '', street: '', number: '', complement: '',
          neighborhood: '', city: '', state: '', responsibleName: '', responsibleContact: '', allergy: '', childGds: '', notes: ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (hasError = false) => ({
    width: '100%', padding: '14px 16px', border: hasError ? '2px solid #dc143c' : '2px solid #e0e0e0',
    borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500', boxSizing: 'border-box'
  });

  const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' };
  const errorStyle = { color: '#dc143c', fontSize: '12px', marginTop: '4px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Recomeço" style={{ width: '80px', height: '80px', borderRadius: '16px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Recomeço</h1>
          <p style={{ color: '#dc143c', fontWeight: '600', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Ministério Recomeço</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginTop: '8px' }}>Cadastro de Membros</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Preencha seus dados para cadastro na igreja.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {success && (
            <div style={{ background: 'rgba(39, 174, 96, 0.1)', border: '1px solid #27ae60', color: '#27ae60', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: '600', textAlign: 'center' }}>
              Cadastro realizado com sucesso.
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(220, 20, 60, 0.1)', border: '1px solid #dc143c', color: '#dc143c', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Tipo de cadastro *</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setMemberType('Adulto'); setSuccess(false); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', border: memberType === 'Adulto' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: memberType === 'Adulto' ? '#fff5f5' : '#fafafa', color: memberType === 'Adulto' ? '#dc143c' : '#555' }}>Adulto</button>
                <button type="button" onClick={() => { setMemberType('Criança'); setSuccess(false); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', border: memberType === 'Criança' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: memberType === 'Criança' ? '#fff5f5' : '#fafafa', color: memberType === 'Criança' ? '#dc143c' : '#555' }}>Criança</button>
              </div>
            </div>

            {!memberType && <p style={{ textAlign: 'center', color: '#999', fontSize: '14px', marginBottom: '20px' }}>Selecione o tipo de cadastro para continuar.</p>}

            {memberType === 'Adulto' && (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Nome completo *</label>
                  <input type="text" value={adultForm.fullName} onChange={e => handleAdultChange('fullName', e.target.value)} placeholder="Seu nome completo" style={inputStyle(!!fieldErrors.fullName)} />
                  {fieldErrors.fullName && <p style={errorStyle}>{fieldErrors.fullName}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Estado civil</label>
                    <select value={adultForm.maritalStatus} onChange={e => handleAdultChange('maritalStatus', e.target.value)} style={inputStyle()}>
                      <option value="">Selecione</option>
                      <option value="Solteiro">Solteiro(a)</option>
                      <option value="Casado">Casado(a)</option>
                      <option value="Divorciado">Divorcido(a)</option>
                      <option value="Viúvo">Viúvo(a)</option>
                      <option value="União estável">União estável</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>CPF</label>
                    <input type="text" value={adultForm.cpf} onChange={e => handleCpfChange(setAdultForm, adultForm, 'cpf', e.target.value)} placeholder="000.000.000-00" maxLength={14} style={inputStyle(!!fieldErrors.cpf)} />
                    {fieldErrors.cpf && <p style={errorStyle}>{fieldErrors.cpf}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Data de nascimento</label>
                    <input type="date" value={adultForm.birthDate} onChange={e => handleAdultChange('birthDate', e.target.value)} style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone / WhatsApp</label>
                    <input type="text" value={adultForm.phone} onChange={e => handlePhoneChange(setAdultForm, adultForm, 'phone', e.target.value)} placeholder="(11) 99999-9999" maxLength={15} style={inputStyle(!!fieldErrors.phone)} />
                    {fieldErrors.phone && <p style={errorStyle}>{fieldErrors.phone}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>CEP</label>
                    <input type="text" value={adultForm.zipCode} onChange={e => handleZipCodeChange(setAdultForm, adultForm, 'zipCode', e.target.value)} placeholder="00000-000" maxLength={9} style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>UF</label>
                    <input type="text" value={adultForm.state} onChange={e => handleAdultChange('state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} style={inputStyle()} />
                  </div>
                </div>
                {cepMessage && memberType === 'Adulto' && <p style={{ color: cepMessage.includes('não') || cepMessage.includes('encontrado') ? '#e67e22' : '#555', fontSize: '12px', marginBottom: '12px' }}>{cepMessage}</p>}

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Rua / Logradouro</label>
                  <input type="text" value={adultForm.street} onChange={e => handleAdultChange('street', e.target.value)} placeholder="Rua, número, bairro" style={inputStyle()} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Endereço</label>
                    <input type="text" value={adultForm.number} onChange={e => handleAdultChange('number', e.target.value)} placeholder="Número" style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Comp.</label>
                    <input type="text" value={adultForm.complement} onChange={e => handleAdultChange('complement', e.target.value)} placeholder="Apto, sala..." style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bairro</label>
                    <input type="text" value={adultForm.neighborhood} onChange={e => handleAdultChange('neighborhood', e.target.value)} placeholder="Bairro" style={inputStyle()} />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Cidade</label>
                  <input type="text" value={adultForm.city} onChange={e => handleAdultChange('city', e.target.value)} placeholder="Cidade" style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Qual GDS participa?</label>
                  <select value={adultForm.gds} onChange={e => handleAdultChange('gds', e.target.value)} style={inputStyle()}>
                    <option value="">Selecione</option>
                    <option value="Jovens Aljava">Jovens Aljava</option>
                    <option value="Mulheres de Sião">Mulheres de Sião</option>
                    <option value="Homens de Honra">Homens de Honra</option>
                    <option value="Nenhum">Nenhum</option>
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Você faz parte da liderança da igreja?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => handleAdultChange('isLeadership', 'true')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: adultForm.isLeadership === 'true' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: adultForm.isLeadership === 'true' ? '#fff5f5' : '#fafafa', color: adultForm.isLeadership === 'true' ? '#dc143c' : '#555' }}>Sim</button>
                    <button type="button" onClick={() => handleAdultChange('isLeadership', 'false')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: adultForm.isLeadership === 'false' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: adultForm.isLeadership === 'false' ? '#fff5f5' : '#fafafa', color: adultForm.isLeadership === 'false' ? '#dc143c' : '#555' }}>Não</button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Batizado?</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => handleAdultChange('baptized', 'true')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: adultForm.baptized === 'true' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: adultForm.baptized === 'true' ? '#fff5f5' : '#fafafa', color: adultForm.baptized === 'true' ? '#dc143c' : '#555' }}>Sim</button>
                    <button type="button" onClick={() => handleAdultChange('baptized', 'false')} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: adultForm.baptized === 'false' ? '2px solid #dc143c' : '2px solid #e0e0e0', background: adultForm.baptized === 'false' ? '#fff5f5' : '#fafafa', color: adultForm.baptized === 'false' ? '#dc143c' : '#555' }}>Não</button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Alguma alergia?</label>
                  <input type="text" value={adultForm.allergy} onChange={e => handleAdultChange('allergy', e.target.value)} placeholder="Ex: Frutos do mar, penicilina" style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea value={adultForm.notes} onChange={e => handleAdultChange('notes', e.target.value)} placeholder="Informações adicionais" style={{ ...inputStyle(), minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            )}

            {memberType === 'Criança' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Nome *</label>
                    <input type="text" value={childForm.fullName} onChange={e => handleChildChange('fullName', e.target.value)} placeholder="Nome da criança" required style={inputStyle(!!fieldErrors.fullName)} />
                    {fieldErrors.fullName && <p style={errorStyle}>{fieldErrors.fullName}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Data de nascimento</label>
                    <input type="date" value={childForm.birthDate} onChange={e => handleChildChange('birthDate', e.target.value)} style={inputStyle()} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Nome do responsável</label>
                    <input type="text" value={childForm.responsibleName} onChange={e => handleChildChange('responsibleName', e.target.value)} placeholder="Nome do responsável" style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contato do responsável</label>
                    <input type="text" value={childForm.responsibleContact} onChange={e => handlePhoneChange(setChildForm, childForm, 'responsibleContact', e.target.value)} placeholder="(11) 99999-9999" maxLength={15} style={inputStyle(!!fieldErrors.responsibleContact)} />
                    {fieldErrors.responsibleContact && <p style={errorStyle}>{fieldErrors.responsibleContact}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>CPF</label>
                    <input type="text" value={childForm.cpf} onChange={e => handleCpfChange(setChildForm, childForm, 'cpf', e.target.value)} placeholder="000.000.000-00" maxLength={14} style={inputStyle(!!fieldErrors.cpf)} />
                    {fieldErrors.cpf && <p style={errorStyle}>{fieldErrors.cpf}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Qual GDS?</label>
                    <select value={childForm.childGds} onChange={e => handleChildChange('childGds', e.target.value)} style={inputStyle()}>
                      <option value="">Selecione</option>
                      <option value="Jovens Aljava">Jovens Aljava</option>
                      <option value="Mulheres de Sião">Mulheres de Sião</option>
                      <option value="Homens de Honra">Homens de Honra</option>
                      <option value="Nenhum">Nenhum</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>CEP</label>
                    <input type="text" value={childForm.zipCode} onChange={e => handleZipCodeChange(setChildForm, childForm, 'zipCode', e.target.value)} placeholder="00000-000" maxLength={9} style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>UF</label>
                    <input type="text" value={childForm.state} onChange={e => handleChildChange('state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} style={inputStyle()} />
                  </div>
                </div>
                {cepMessage && memberType === 'Criança' && <p style={{ color: cepMessage.includes('não') || cepMessage.includes('encontrado') ? '#e67e22' : '#555', fontSize: '12px', marginBottom: '12px' }}>{cepMessage}</p>}

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Rua / Logradouro</label>
                  <input type="text" value={childForm.street} onChange={e => handleChildChange('street', e.target.value)} placeholder="Rua, número, bairro" style={inputStyle()} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={labelStyle}>Endereço</label>
                    <input type="text" value={childForm.number} onChange={e => handleChildChange('number', e.target.value)} placeholder="Número" style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Comp.</label>
                    <input type="text" value={childForm.complement} onChange={e => handleChildChange('complement', e.target.value)} placeholder="Apto, sala..." style={inputStyle()} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bairro</label>
                    <input type="text" value={childForm.neighborhood} onChange={e => handleChildChange('neighborhood', e.target.value)} placeholder="Bairro" style={inputStyle()} />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Cidade</label>
                  <input type="text" value={childForm.city} onChange={e => handleChildChange('city', e.target.value)} placeholder="Cidade" style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Alergia</label>
                  <input type="text" value={childForm.allergy} onChange={e => handleChildChange('allergy', e.target.value)} placeholder="Ex: Lactose, ovo" style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea value={childForm.notes} onChange={e => handleChildChange('notes', e.target.value)} placeholder="Informações adicionais" style={{ ...inputStyle(), minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            )}

            {memberType && (
              <button type="submit" disabled={saving || cepSearching} style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(135deg, #dc143c 0%, #a01030 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '1px', cursor: (saving || cepSearching) ? 'not-allowed' : 'pointer',
                opacity: (saving || cepSearching) ? '0.7' : '1'
              }}>
                {saving ? 'Enviando...' : cepSearching ? 'Buscando...' : 'Cadastrar'}
              </button>
            )}
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
            <Link to="/cadastro-visitante" style={{ color: '#dc143c', fontWeight: '600', fontSize: '14px', textDecoration: 'none', marginRight: '16px' }}>Cadastrar visitante</Link>
            <Link to="/login" style={{ color: '#dc143c', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>Área da equipe</Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '24px' }}>Ministério Recomeço - Igreja Monte Sião</p>
      </div>
    </div>
  );
}

export default PublicMemberRegistration;
