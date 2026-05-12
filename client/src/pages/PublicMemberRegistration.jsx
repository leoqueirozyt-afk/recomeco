import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../services/getApiBase';

const API_BASE = getApiBase();

function PublicMemberRegistration() {
  const [memberType, setMemberType] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [adultForm, setAdultForm] = useState({
    fullName: '',
    maritalStatus: '',
    cpf: '',
    birthDate: '',
    fullAddress: '',
    phone: '',
    gds: '',
    isLeadership: '',
    baptized: '',
    allergy: '',
    notes: ''
  });

  const [childForm, setChildForm] = useState({
    fullName: '',
    birthDate: '',
    cpf: '',
    responsibleContact: '',
    responsibleName: '',
    fullAddress: '',
    allergy: '',
    childGds: '',
    notes: ''
  });

  const handleAdultChange = (e) => {
    const { name, value } = e.target;
    setAdultForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChildChange = (e) => {
    const { name, value } = e.target;
    setChildForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!memberType) {
      setError('Selecione o tipo de cadastro.');
      return;
    }

    if (memberType === 'Adulto' && !adultForm.fullName) {
      setError('Nome completo é obrigatório.');
      return;
    }

    if (memberType === 'Criança' && !childForm.fullName) {
      setError('Nome é obrigatório.');
      return;
    }

    setSaving(true);

    try {
      let payload = {};

      if (memberType === 'Adulto') {
        payload = {
          member_type: 'Adulto',
          full_name: adultForm.fullName,
          marital_status: adultForm.maritalStatus || null,
          cpf: adultForm.cpf || null,
          birth_date: adultForm.birthDate || null,
          full_address: adultForm.fullAddress || null,
          phone: adultForm.phone || null,
          gds: adultForm.gds || null,
          is_leadership: adultForm.isLeadership === 'true',
          baptized: adultForm.baptized === 'true',
          allergy: adultForm.allergy || null,
          notes: adultForm.notes || null
        };
      } else {
        payload = {
          member_type: 'Criança',
          full_name: childForm.fullName,
          birth_date: childForm.birthDate || null,
          cpf: childForm.cpf || null,
          full_address: childForm.fullAddress || null,
          responsible_name: childForm.responsibleName || null,
          responsible_contact: childForm.responsibleContact || null,
          child_allergy: childForm.allergy || null,
          child_gds: childForm.childGds || null,
          notes: childForm.notes || null
        };
      }

      const res = await fetch(`${API_BASE}/api/public/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      setSuccess(true);
      setMemberType('');

      if (memberType === 'Adulto') {
        setAdultForm({
          fullName: '', maritalStatus: '', cpf: '', birthDate: '',
          fullAddress: '', phone: '', gds: '', isLeadership: '',
          baptized: '', allergy: '', notes: ''
        });
      } else {
        setChildForm({
          fullName: '', birthDate: '', cpf: '', responsibleContact: '',
          responsibleName: '', fullAddress: '', allergy: '', childGds: '', notes: ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (disabled = false) => ({
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    fontSize: '15px',
    background: disabled ? '#f0f0f0' : '#fafafa',
    color: '#000',
    fontWeight: '500',
    boxSizing: 'border-box'
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '580px', margin: '0 auto', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Recomeço" style={{
            width: '80px', height: '80px', borderRadius: '16px', marginBottom: '16px'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Recomeço
          </h1>
          <p style={{
            color: '#dc143c', fontWeight: '600', fontSize: '15px',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px'
          }}>
            Ministério Recomeço
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
            Cadastro de Membros
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
            Preencha seus dados para cadastro na igreja.
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: '20px', padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          {success && (
            <div style={{
              background: 'rgba(39, 174, 96, 0.1)', border: '1px solid #27ae60',
              color: '#27ae60', padding: '16px 20px', borderRadius: '12px',
              marginBottom: '24px', fontWeight: '600', textAlign: 'center'
            }}>
              Cadastro realizado com sucesso.
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(220, 20, 60, 0.1)', border: '1px solid #dc143c',
              color: '#dc143c', padding: '14px 18px', borderRadius: '12px',
              marginBottom: '20px', fontSize: '14px', fontWeight: '600', textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '10px' }}>
                Tipo de cadastro *
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setMemberType('Adulto'); setSuccess(false); }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', fontSize: '15px',
                    fontWeight: '700', cursor: 'pointer', border: memberType === 'Adulto' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                    background: memberType === 'Adulto' ? '#fff5f5' : '#fafafa',
                    color: memberType === 'Adulto' ? '#dc143c' : '#555'
                  }}
                >
                  Adulto
                </button>
                <button
                  type="button"
                  onClick={() => { setMemberType('Criança'); setSuccess(false); }}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px', fontSize: '15px',
                    fontWeight: '700', cursor: 'pointer', border: memberType === 'Criança' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                    background: memberType === 'Criança' ? '#fff5f5' : '#fafafa',
                    color: memberType === 'Criança' ? '#dc143c' : '#555'
                  }}
                >
                  Criança
                </button>
              </div>
            </div>

            {!memberType && (
              <p style={{ textAlign: 'center', color: '#999', fontSize: '14px', marginBottom: '20px' }}>
                Selecione o tipo de cadastro para continuar.
              </p>
            )}

            {memberType === 'Adulto' && (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Nome completo *
                  </label>
                  <input type="text" name="fullName" value={adultForm.fullName}
                    onChange={handleAdultChange} placeholder="Seu nome completo"
                    required style={inputStyle()} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Estado civil
                    </label>
                    <select name="maritalStatus" value={adultForm.maritalStatus}
                      onChange={handleAdultChange} style={inputStyle()}>
                      <option value="">Selecione</option>
                      <option value="Solteiro">Solteiro(a)</option>
                      <option value="Casado">Casado(a)</option>
                      <option value="Divorciado">Divorciado(a)</option>
                      <option value="Viúvo">Viúvo(a)</option>
                      <option value="União estável">União estável</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      CPF
                    </label>
                    <input type="text" name="cpf" value={adultForm.cpf}
                      onChange={handleAdultChange} placeholder="000.000.000-00"
                      style={inputStyle()} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Data de nascimento
                    </label>
                    <input type="date" name="birthDate" value={adultForm.birthDate}
                      onChange={handleAdultChange} style={inputStyle()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Telefone / WhatsApp
                    </label>
                    <input type="text" name="phone" value={adultForm.phone}
                      onChange={handleAdultChange} placeholder="(11) 99999-9999"
                      style={inputStyle()} />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Endereço completo
                  </label>
                  <input type="text" name="fullAddress" value={adultForm.fullAddress}
                    onChange={handleAdultChange} placeholder="Rua, número, bairro, cidade"
                    style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Qual GDS participa?
                  </label>
                  <select name="gds" value={adultForm.gds}
                    onChange={handleAdultChange} style={inputStyle()}>
                    <option value="">Selecione</option>
                    <option value="Jovens Aljava">Jovens Aljava</option>
                    <option value="Mulheres de Sião">Mulheres de Sião</option>
                    <option value="Homens de Honra">Homens de Honra</option>
                    <option value="Nenhum">Nenhum</option>
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Você faz parte da liderança da igreja?
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAdultForm(p => ({ ...p, isLeadership: 'true' }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', border: adultForm.isLeadership === 'true' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                        background: adultForm.isLeadership === 'true' ? '#fff5f5' : '#fafafa',
                        color: adultForm.isLeadership === 'true' ? '#dc143c' : '#555'
                      }}>
                      Sim
                    </button>
                    <button type="button" onClick={() => setAdultForm(p => ({ ...p, isLeadership: 'false' }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', border: adultForm.isLeadership === 'false' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                        background: adultForm.isLeadership === 'false' ? '#fff5f5' : '#fafafa',
                        color: adultForm.isLeadership === 'false' ? '#dc143c' : '#555'
                      }}>
                      Não
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Batizado?
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAdultForm(p => ({ ...p, baptized: 'true' }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', border: adultForm.baptized === 'true' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                        background: adultForm.baptized === 'true' ? '#fff5f5' : '#fafafa',
                        color: adultForm.baptized === 'true' ? '#dc143c' : '#555'
                      }}>
                      Sim
                    </button>
                    <button type="button" onClick={() => setAdultForm(p => ({ ...p, baptized: 'false' }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', border: adultForm.baptized === 'false' ? '2px solid #dc143c' : '2px solid #e0e0e0',
                        background: adultForm.baptized === 'false' ? '#fff5f5' : '#fafafa',
                        color: adultForm.baptized === 'false' ? '#dc143c' : '#555'
                      }}>
                      Não
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Alguma alergia?
                  </label>
                  <input type="text" name="allergy" value={adultForm.allergy}
                    onChange={handleAdultChange} placeholder="Ex: Frutos do mar, penicilina"
                    style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Observações
                  </label>
                  <textarea name="notes" value={adultForm.notes}
                    onChange={handleAdultChange} placeholder="Informações adicionais"
                    style={{ ...inputStyle(), minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            )}

            {memberType === 'Criança' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Nome *
                    </label>
                    <input type="text" name="fullName" value={childForm.fullName}
                      onChange={handleChildChange} placeholder="Nome da criança" required style={inputStyle()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Data de nascimento
                    </label>
                    <input type="date" name="birthDate" value={childForm.birthDate}
                      onChange={handleChildChange} style={inputStyle()} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Nome do responsável
                    </label>
                    <input type="text" name="responsibleName" value={childForm.responsibleName}
                      onChange={handleChildChange} placeholder="Nome do responsável"
                      style={inputStyle()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Contato do responsável
                    </label>
                    <input type="text" name="responsibleContact" value={childForm.responsibleContact}
                      onChange={handleChildChange} placeholder="(11) 99999-9999"
                      style={inputStyle()} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      CPF
                    </label>
                    <input type="text" name="cpf" value={childForm.cpf}
                      onChange={handleChildChange} placeholder="000.000.000-00"
                      style={inputStyle()} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                      Qual GDS?
                    </label>
                    <select name="childGds" value={childForm.childGds}
                      onChange={handleChildChange} style={inputStyle()}>
                      <option value="">Selecione</option>
                      <option value="Jovens Aljava">Jovens Aljava</option>
                      <option value="Mulheres de Sião">Mulheres de Sião</option>
                      <option value="Homens de Honra">Homens de Honra</option>
                      <option value="Nenhum">Nenhum</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Endereço completo
                  </label>
                  <input type="text" name="fullAddress" value={childForm.fullAddress}
                    onChange={handleChildChange} placeholder="Rua, número, bairro, cidade"
                    style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Alergia
                  </label>
                  <input type="text" name="allergy" value={childForm.allergy}
                    onChange={handleChildChange} placeholder="Ex: Lactose, ovo"
                    style={inputStyle()} />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                    Observações
                  </label>
                  <textarea name="notes" value={childForm.notes}
                    onChange={handleChildChange} placeholder="Informações adicionais"
                    style={{ ...inputStyle(), minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            )}

            {memberType && (
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', padding: '16px',
                  background: 'linear-gradient(135deg, #dc143c 0%, #a01030 100%)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '16px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '1px', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? '0.7' : '1'
                }}
              >
                {saving ? 'Enviando...' : 'Cadastrar'}
              </button>
            )}
          </form>

          <div style={{
            marginTop: '24px', textAlign: 'center', borderTop: '1px solid #e0e0e0', paddingTop: '20px'
          }}>
            <Link to="/cadastro-visitante" style={{
              color: '#dc143c', fontWeight: '600', fontSize: '14px', textDecoration: 'none', marginRight: '16px'
            }}>
              Cadastrar visitante
            </Link>
            <Link to="/login" style={{
              color: '#dc143c', fontWeight: '600', fontSize: '14px', textDecoration: 'none'
            }}>
              Área da equipe
            </Link>
          </div>
        </div>

        <p style={{
          textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '24px'
        }}>
          Ministério Recomeço - Igreja Monte Sião
        </p>
      </div>
    </div>
  );
}

export default PublicMemberRegistration;
