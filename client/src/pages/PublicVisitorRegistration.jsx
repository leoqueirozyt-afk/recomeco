import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiBase } from '../services/getApiBase';
import { formatPhone, validatePhone } from '../utils/formatters';

const API_BASE = getApiBase();

function PublicVisitorRegistration() {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    firstName: '',
    lastName: '',
    whatsapp: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWhatsappChange = (e) => {
    const masked = formatPhone(e.target.value);
    setForm(prev => ({ ...prev, whatsapp: masked }));
    setWhatsappError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWhatsappError('');

    if (!form.firstName) {
      setError('Nome é obrigatório.');
      return;
    }
    if (!form.visitDate) {
      setError('Data da visita é obrigatória.');
      return;
    }
    if (form.whatsapp && !validatePhone(form.whatsapp)) {
      setWhatsappError('Informe um telefone válido com DDD.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/public/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visit_date: form.visitDate,
          first_name: form.firstName,
          last_name: form.lastName || null,
          whatsapp: form.whatsapp || null,
          notes: form.notes || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar visitante');
      }

      setSuccess(true);
      setForm({
        visitDate: new Date().toLocaleDateString('en-CA'),
        firstName: '', lastName: '', whatsapp: '', notes: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Recomeço" style={{
            width: '80px', height: '80px', borderRadius: '16px', marginBottom: '16px'
          }} />
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Monte Sião
          </h1>
          <p style={{
            color: '#dc143c', fontWeight: '600', fontSize: '15px',
            textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            Ministério Recomeço
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: '20px', padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
        }}>
          <h2 style={{
            fontSize: '24px', fontWeight: '800', color: '#000', marginBottom: '8px', textAlign: 'center'
          }}>
            Cadastro de Visitante
          </h2>
          <p style={{
            color: '#555', fontSize: '14px', marginBottom: '28px', textAlign: 'center'
          }}>
            Registre sua visita na igreja Monte Sião
          </p>

          {success && (
            <div style={{
              background: 'rgba(39, 174, 96, 0.1)', border: '1px solid #27ae60',
              color: '#27ae60', padding: '16px 20px', borderRadius: '12px',
              marginBottom: '24px', fontWeight: '600', textAlign: 'center'
            }}>
              Visitante cadastrado com sucesso! Que Deus abençoe sua visita.
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                Data da Visita *
              </label>
              <input
                type="date"
                name="visitDate"
                value={form.visitDate}
                onChange={handleChange}
                required
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #e0e0e0',
                  borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  required
                  style={{
                    width: '100%', padding: '14px 16px', border: '2px solid #e0e0e0',
                    borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                  Sobrenome
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Sobrenome"
                  style={{
                    width: '100%', padding: '14px 16px', border: '2px solid #e0e0e0',
                    borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                WhatsApp
              </label>
              <input
                type="text"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleWhatsappChange}
                placeholder="(11) 99999-9999"
                maxLength={15}
                style={{
                  width: '100%', padding: '14px 16px', border: whatsappError ? '2px solid #dc143c' : '2px solid #e0e0e0',
                  borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500'
                }}
              />
              {whatsappError && (
                <p style={{ color: '#dc143c', fontSize: '12px', marginTop: '4px' }}>{whatsappError}</p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
                Observações
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Ex: Estou vindo pela primeira vez"
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid #e0e0e0',
                  borderRadius: '12px', fontSize: '15px', background: '#fafafa', color: '#000', fontWeight: '500',
                  minHeight: '100px', resize: 'vertical'
                }}
              />
            </div>

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
              {saving ? 'Enviando...' : 'Cadastrar Visitante'}
            </button>
          </form>

          <div style={{
            marginTop: '24px', textAlign: 'center', borderTop: '1px solid #e0e0e0', paddingTop: '20px'
          }}>
            <Link to="/cadastro-membro" style={{
              color: '#dc143c', fontWeight: '600', fontSize: '14px', textDecoration: 'none', marginRight: '16px'
            }}>
              Cadastrar membro
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

export default PublicVisitorRegistration;
