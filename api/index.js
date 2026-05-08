import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Config CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://recomeco-nu.vercel.app',
  'https://recomeco-server.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin === '*') {
      callback(null, true);
    } else {
      callback(new Error("Origem não permitida pelo CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let supabaseConfigured = false;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  supabaseConfigured = true;
  console.log('Supabase configurado');
} else {
  console.error('SUPABASE_URL ou chave não configurada');
}

// Auth config - use Supabase JWT secret
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

// Auth routes
app.get('/api/auth/health', (req, res) => {
  res.json({ ok: true, message: 'Auth route funcionando', supabaseConfigured });
});

app.get('/api/auth/user-check/:email', requireSupabase, async (req, res) => {
  const email = req.params.email;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, active')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return res.json({ ok: true, exists: false });
    }
    res.json({ ok: true, exists: true, user: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/login', requireSupabase, async (req, res) => {
  const { email, password } = req.body;
  
  const normalizedEmail = String(email).trim().toLowerCase();
  console.log('Login recebido para:', normalizedEmail, { hasPassword: Boolean(password) });

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, role, active')
      .eq('email', normalizedEmail)
      .single();

    console.log('Consulta users para:', normalizedEmail, { found: Boolean(user), error: error?.message });

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }

    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'Usuário inativo. Fale com um administrador.' });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordIsValid) {
      console.log('Senha incorreta para:', normalizedEmail);
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Erro em /api/auth/login:', error);
    res.status(500).json({ ok: false, error: 'Erro interno ao fazer login.', details: error.message });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Users routes (admin only)
app.get('/api/users', requireSupabase, authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireSupabase, authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const { email, password, full_name, role } = req.body;
    const { data, error } = await supabase
      .from('users')
      .insert({ email, password_hash: password, full_name, role: role || 'admin' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireSupabase, authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const { email, password, full_name, role, active } = req.body;
    const updateData = { email, full_name, role, active };
    if (password) updateData.password_hash = password;
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireSupabase, authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function requireSupabase(req, res, next) {
  if (!supabaseConfigured) {
    return res.status(503).json({ error: 'Supabase não configurado' });
  }
  next();
}

// Helper functions
function mapPerson(row) {
  return {
    id: row.id,
    decisionDate: row.decision_date,
    decisionMonth: row.decision_month,
    fullName: row.full_name,
    birthDate: row.birth_date,
    fullAddress: row.full_address,
    contact: row.contact,
    gender: row.gender,
    baptized: row.baptized ? 'Sim' : 'Não',
    firstDecision: row.first_decision,
    discipleStatus: row.disciple_status,
    finalDecision: row.final_decision,
    photo: null,
    notes: row.notes,
    mentors: row.mentors || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMentor(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    notes: row.notes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend Recomeço funcionando' });
});

app.get('/api/supabase-test', async (req, res) => {
  if (!supabaseConfigured) {
    return res.status(503).json({ ok: false, error: 'Supabase não configurado' });
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    res.json({ ok: true, message: 'Supabase conectado com sucesso', data: data || [] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/people', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_people_with_mentors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json((data || []).map(mapPerson));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/people/:id', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_people_with_mentors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) return res.status(404).json({ error: 'Pessoa não encontrada' });
    res.json(mapPerson(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/people', requireSupabase, async (req, res) => {
  try {
    const { data: person, error } = await supabase
      .from('people')
      .insert({
        decision_date: req.body.decisionDate || null,
        decision_month: req.body.decisionMonth || null,
        full_name: req.body.fullName,
        birth_date: req.body.birthDate || null,
        full_address: req.body.fullAddress || null,
        contact: req.body.contact || null,
        gender: req.body.gender || null,
        baptized: req.body.baptized === 'Sim',
        first_decision: req.body.firstDecision || null,
        disciple_status: req.body.discipleStatus || 'Em cuidado',
        final_decision: req.body.finalDecision || 'Em acompanhamento',
        notes: req.body.notes || null
      })
      .select()
      .single();
    
    if (error) throw error;

    if (req.body.mentorIds && req.body.mentorIds.length > 0) {
      const mentorLinks = req.body.mentorIds.map(mentorId => ({
        person_id: person.id,
        mentor_id: mentorId
      }));
      await supabase.from('people_mentors').insert(mentorLinks);
    }

    res.status(201).json({ id: person.id, message: 'Pessoa cadastrada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/people/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('people')
      .update({
        decision_date: req.body.decisionDate || null,
        decision_month: req.body.decisionMonth || null,
        full_name: req.body.fullName,
        birth_date: req.body.birthDate || null,
        full_address: req.body.fullAddress || null,
        contact: req.body.contact || null,
        gender: req.body.gender || null,
        baptized: req.body.baptized === 'Sim',
        first_decision: req.body.firstDecision || null,
        disciple_status: req.body.discipleStatus || 'Em cuidado',
        final_decision: req.body.finalDecision || 'Em acompanhamento',
        notes: req.body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);
    
    if (error) throw error;

    await supabase.from('people_mentors').delete().eq('person_id', req.params.id);
    
    if (req.body.mentorIds && req.body.mentorIds.length > 0) {
      const mentorLinks = req.body.mentorIds.map(mentorId => ({
        person_id: req.params.id,
        mentor_id: mentorId
      }));
      await supabase.from('people_mentors').insert(mentorLinks);
    }

    res.json({ message: 'Pessoa atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/people/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Pessoa excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mentors', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (error) throw error;
    res.json((data || []).map(mapMentor));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mentors/:id', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) return res.status(404).json({ error: 'Responsável não encontrado' });
    res.json(mapMentor(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mentors', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mentors')
      .insert({
        full_name: req.body.fullName,
        phone: req.body.phone || null,
        notes: req.body.notes || null,
        active: req.body.active !== false
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Responsável cadastrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mentors/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('mentors')
      .update({
        full_name: req.body.fullName,
        phone: req.body.phone || null,
        notes: req.body.notes || null,
        active: req.body.active !== false
      })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Responsável atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mentors/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('mentors')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Responsável excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/summary', requireSupabase, async (req, res) => {
  try {
    const { data: people, error } = await supabase
      .from('people')
      .select('*');
    
    if (error) throw error;

    const all = people || [];
    const total = all.length;
    const inCare = all.filter(p => p.disciple_status === 'Em cuidado').length;
    const awaitingDecision = all.filter(p => p.disciple_status === 'Aguardando decisão').length;
    const disciple = all.filter(p => p.disciple_status === 'Discípulo').length;
    const visitor = all.filter(p => p.disciple_status === 'Visitante').length;
    const baptized = all.filter(p => p.baptized).length;
    const notBaptized = all.filter(p => !p.baptized).length;

    const { data: links } = await supabase.from('people_mentors').select('person_id');
    const peopleWithMentor = new Set(links?.map(l => l.person_id) || []);
    const withoutMentor = all.filter(p => !peopleWithMentor.has(p.id)).length;

    const { data: recentPeople } = await supabase
      .from('people')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    const byStatus = Object.entries(all.reduce((acc, p) => {
      acc[p.disciple_status] = (acc[p.disciple_status] || 0) + 1;
      return acc;
    }, {})).map(([status, count]) => ({ status, count }));

    const byMonth = Object.entries(all.reduce((acc, p) => {
      if (p.decision_month) {
        acc[p.decision_month] = (acc[p.decision_month] || 0) + 1;
      }
      return acc;
    }, {})).map(([month, count]) => ({ month, count }));

    const byFirstDecision = Object.entries(all.reduce((acc, p) => {
      if (p.first_decision) {
        acc[p.first_decision] = (acc[p.first_decision] || 0) + 1;
      }
      return acc;
    }, {})).map(([decision, count]) => ({ decision, count }));

    const byGender = Object.entries(all.reduce((acc, p) => {
      if (p.gender) {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
      }
      return acc;
    }, {})).map(([gender, count]) => ({ gender, count }));

    res.json({
      total, inCare, awaitingDecision, disciple, visitor, baptized, notBaptized, withoutMentor,
      byStatus, byMonth, byFirstDecision, byGender,
      recentPeople: (recentPeople || []).map(mapPerson)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/status', requireSupabase, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: last } = await supabase
      .from('backup_logs')
      .select('*')
      .order('exported_at', { ascending: false })
      .limit(1)
      .single();

    const { data: pending } = await supabase
      .from('backup_logs')
      .select('id')
      .eq('backup_month', currentMonth)
      .eq('backup_year', currentYear)
      .maybeSingle();

    res.json({
      lastBackup: last,
      pendingAlert: !pending
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backups/register', requireSupabase, async (req, res) => {
  try {
    const { backup_month, backup_year, total_people, notes } = req.body;
    
    const { data, error } = await supabase
      .from('backup_logs')
      .insert({
        backup_month,
        backup_year,
        total_people: total_people || 0,
        notes: notes || ''
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ message: 'Backup registrado com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/export/csv', requireSupabase, async (req, res) => {
  try {
    const { data: people, error } = await supabase
      .from('v_people_with_mentors')
      .select('*');
    
    if (error) throw error;

    const csvRows = [['ID', 'Nome', 'Data Decisão', 'Mês Decisão', 'Data Nascimento', 'Endereço', 'Contato', 'Gênero', 'Batizado', 'Primeira Decisão', 'Status', 'Decisão Final', 'Anotações', 'Responsáveis', 'Criado em', 'Atualizado em']];
    
    for (const p of people || []) {
      csvRows.push([
        p.id,
        p.full_name || '',
        p.decision_date || '',
        p.decision_month || '',
        p.birth_date || '',
        p.full_address || '',
        p.contact || '',
        p.gender || '',
        p.baptized ? 'Sim' : 'Não',
        p.first_decision || '',
        p.disciple_status || '',
        p.final_decision || '',
        p.notes || '',
        p.mentors || '',
        p.created_at || '',
        p.updated_at || ''
      ]);
    }

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=recomeco-backup.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/export/xlsx', requireSupabase, async (req, res) => {
  try {
    const { data: people, error } = await supabase
      .from('v_people_with_mentors')
      .select('*');
    
    if (error) throw error;

    const rows = (people || []).map(p => ({
      ID: p.id,
      Nome: p.full_name,
      'Data Decisão': p.decision_date,
      'Mês Decisão': p.decision_month,
      'Data Nascimento': p.birth_date,
      Endereço: p.full_address,
      Contato: p.contact,
      Gênero: p.gender,
      Batizado: p.baptized ? 'Sim' : 'Não',
      'Primeira Decisão': p.first_decision,
      Status: p.disciple_status,
      'Decisão Final': p.final_decision,
      Anotações: p.notes,
      Responsáveis: p.mentors,
      'Criado em': p.created_at,
      'Atualizado em': p.updated_at
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pessoas');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=recomeco-backup.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export for Vercel
export default app;

// Development server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}