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
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin.includes('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error("Origem não permitida pelo CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'recomeco-secret-key-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Token não enviado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ ok: false, error: 'Token inválido ou expirado.' });
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
  res.json({
    ok: true,
    user: {
      id: req.user.sub,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    }
  });
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
    visitorId: row.visitor_id,
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

// =============================================
// MEMBER HELPER FUNCTIONS
// =============================================
function mapMember(row, detailed = false) {
  const base = {
    id: row.id,
    memberType: row.member_type,
    fullName: row.full_name,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    phone: row.phone,
    fullAddress: row.full_address,
    zipCode: row.zip_code,
    street: row.street,
    addressNumber: row.address_number,
    addressComplement: row.address_complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    memberStatus: row.member_status,
    careStatus: row.care_status,
    source: row.source,
    personId: row.person_id,
    visitorId: row.visitor_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (row.member_type === 'Adulto') {
    base.maritalStatus = row.marital_status;
    base.gds = row.gds;
    base.isLeadership = row.is_leadership;
    base.baptized = row.baptized;
    base.allergy = row.allergy;
    base.cpf = detailed ? row.cpf : maskCpf(row.cpf);
  } else {
    base.responsibleName = row.responsible_name;
    base.responsibleContact = row.responsible_contact;
    base.childGds = row.child_gds;
    base.childAllergy = row.child_allergy;
    base.cpf = detailed ? row.cpf : maskCpf(row.cpf);
  }

  return base;
}

function maskCpf(cpf) {
  if (!cpf || cpf.length < 4) return cpf || null;
  return '***.***.***-' + cpf.slice(-2);
}

function sanitizeMemberLog(data) {
  const s = { ...data };
  if (s.cpf) s.cpf = maskCpf(s.cpf);
  return s;
}

// =============================================
// ROTAS PÚBLICAS (sem autenticação)
// =============================================
app.post('/api/public/visitors', async (req, res) => {
  try {
    const { visit_date, first_name, last_name, whatsapp, notes } = req.body;

    if (!first_name) {
      return res.status(400).json({ ok: false, error: 'Nome é obrigatório.' });
    }

    if (!visit_date) {
      return res.status(400).json({ ok: false, error: 'Data da visita é obrigatória.' });
    }

    const { data: visitor, error } = await supabase
      .from('visitors')
      .insert({
        visit_date,
        first_name,
        last_name: last_name || null,
        whatsapp: whatsapp || null,
        notes: notes || null,
        sent_to_recomeco: false,
        recomeco_person_id: null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      ok: true,
      message: 'Visitante cadastrado com sucesso.',
      visitor: mapVisitor(visitor)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/public/members', requireSupabase, async (req, res) => {
  try {
    const { member_type, full_name, cpf, birth_date, phone, full_address,
      marital_status, gds, is_leadership, baptized, allergy,
      responsible_name, responsible_contact, child_gds, child_allergy,
      notes, zip_code, street, address_number, address_complement,
      neighborhood, city, state } = req.body;

    console.log('Public member registration received:', sanitizeMemberLog(req.body));

    if (!member_type) {
      return res.status(400).json({ ok: false, error: 'Tipo de membro é obrigatório.' });
    }
    if (member_type !== 'Adulto' && member_type !== 'Criança') {
      return res.status(400).json({ ok: false, error: 'Tipo de membro precisa ser Adulto ou Criança.' });
    }
    if (!full_name) {
      return res.status(400).json({ ok: false, error: 'Nome completo é obrigatório.' });
    }

    const insertData = {
      member_type,
      full_name,
      cpf: cpf || null,
      first_name: null,
      last_name: null,
      birth_date: birth_date || null,
      phone: phone || null,
      zip_code: zip_code || null,
      street: street || null,
      address_number: address_number || null,
      address_complement: address_complement || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      full_address: full_address || null,
      member_status: 'Ativo',
      care_status: 'Sem cuidado ativo',
      source: 'Cadastro público',
      notes: notes || null
    };

    if (member_type === 'Adulto') {
      insertData.marital_status = marital_status || null;
      insertData.gds = gds || null;
      insertData.is_leadership = Boolean(is_leadership);
      insertData.baptized = Boolean(baptized);
      insertData.allergy = allergy || null;
    } else {
      insertData.responsible_name = responsible_name || null;
      insertData.responsible_contact = responsible_contact || null;
      insertData.child_gds = child_gds || null;
      insertData.child_allergy = child_allergy || null;
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      ok: true,
      message: 'Membro cadastrado com sucesso.',
      member: mapMember(member)
    });
  } catch (error) {
    console.error('Error in public member registration:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
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
    const now = new Date();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearStr = String(now.getFullYear());
    const todayStr = String(now.getFullYear()) + '-' + currentMonthStr + '-' + String(now.getDate()).padStart(2, '0');

    // =====================
    // PEOPLE (Recomeço)
    // =====================
    const { data: people, error: peopleErr } = await supabase.from('people').select('*');
    if (peopleErr) throw peopleErr;
    const all = people || [];
    const total = all.length;

    // =====================
    // VISITORS
    // =====================
    const { data: visitors, error: visitorsErr } = await supabase.from('visitors').select('*');
    if (visitorsErr) throw visitorsErr;
    const visitorsAll = visitors || [];

    const visitorsToday = visitorsAll.filter(v => v.visit_date === todayStr).length;
    const visitorsThisMonth = visitorsAll.filter(v => {
      if (!v.visit_date) return false;
      return String(v.visit_date).startsWith(currentYearStr + '-' + currentMonthStr);
    }).length;
    const visitorsWaitingCare = visitorsAll.filter(v => !v.sent_to_recomeco).length;
    const visitorsInCare = visitorsAll.filter(v => v.sent_to_recomeco).length;

    // =====================
    // MEMBERS
    // =====================
    const { data: members, error: membersErr } = await supabase.from('members').select('*');
    if (membersErr) throw membersErr;
    const membersAll = members || [];
    const activeMembers = membersAll.filter(m => m.member_status === 'Ativo');
    const inactiveMembers = membersAll.filter(m => m.member_status === 'Inativo');
    const activeAdults = activeMembers.filter(m => m.member_type === 'Adulto');
    const activeChildren = activeMembers.filter(m => m.member_type === 'Criança');
    const baptizedMembers = activeMembers.filter(m => m.baptized);
    const leadershipMembers = activeMembers.filter(m => m.is_leadership);

    // =====================
    // BACKUP STATUS
    // =====================
    const { data: lastBackup } = await supabase
      .from('backup_logs')
      .select('*')
      .order('exported_at', { ascending: false })
      .limit(1)
      .single();
    const { data: pendingBackup } = await supabase
      .from('backup_logs')
      .select('id')
      .eq('backup_month', now.getMonth() + 1)
      .eq('backup_year', now.getFullYear())
      .maybeSingle();

    // =====================
    // MENTORS
    // =====================
    const { data: mentors } = await supabase.from('mentors').select('*');
    const activeMentors = (mentors || []).filter(m => m.active).length;

    // =====================
    // PEOPLE BY MENTOR
    // =====================
    const { data: links } = await supabase.from('people_mentors').select('*');
    const mentorsMap = {};
    for (const link of links || []) {
      mentorsMap[link.mentor_id] = (mentorsMap[link.mentor_id] || 0) + 1;
    }
    const peopleByMentor = (mentors || [])
      .filter(m => m.active)
      .map(m => ({ name: m.full_name, count: mentorsMap[m.id] || 0 }))
      .sort((a, b) => b.count - a.count);

    // =====================
    // RECOMECO SECTION
    // =====================
    const peopleInCare = all.filter(p => p.disciple_status === 'Em cuidado').length;
    const waitingDecision = all.filter(p => p.disciple_status === 'Aguardando decisão').length;
    const disciples = all.filter(p => p.disciple_status === 'Discípulo').length;
    const visitorsInFollowUp = all.filter(p => p.disciple_status === 'Visitante').length;

    const peopleThisMonth = all.filter(p => {
      if (!p.decision_date) return false;
      return String(p.decision_date).startsWith(currentYearStr + '-' + currentMonthStr);
    }).length;

    const totalInFollowUp = peopleInCare + waitingDecision + disciples + visitorsInFollowUp;
    const discipleshipRate = totalInFollowUp > 0 ? Math.round((disciples / totalInFollowUp) * 100) : 0;

    const byFirstDecision = Object.entries(all.reduce((acc, p) => {
      if (p.first_decision) acc[p.first_decision] = (acc[p.first_decision] || 0) + 1;
      return acc;
    }, {})).map(([decision, count]) => ({ decision, count }));

    const byMonth = Object.entries(all.reduce((acc, p) => {
      if (p.decision_month) acc[p.decision_month] = (acc[p.decision_month] || 0) + 1;
      return acc;
    }, {})).map(([month, count]) => ({ month, count }));

    const recentPeople = (people || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(mapPerson);

    // =====================
    // CHURCH SECTION
    // =====================
    const currentMonthBd = currentMonthStr;
    const birthdayMembers = activeMembers.filter(m => {
      if (!m.birth_date) return false;
      return String(m.birth_date).includes(`-${currentMonthBd}-`);
    });

    const newMembersThisMonth = activeMembers.filter(m => {
      if (!m.created_at) return false;
      const c = new Date(m.created_at);
      return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
    }).length;

    const membersWithAllergy = activeMembers.filter(m => m.allergy || m.child_allergy).length;
    const inCareMembersCount = activeMembers.filter(m => m.care_status === 'Em cuidado pelo Recomeço').length;

    const gdsList = ['Jovens Aljava', 'Mulheres de Sião', 'Homens de Honra', 'Ovelhinhas de Sião', 'Herdeiros de Sião', 'Nenhum'];
    const membersByGDS = gdsList.map(gds => ({
      gds,
      count: activeMembers.filter(m => (m.gds === gds || m.child_gds === gds)).length
    }));

    const upcomingBirthdays = [...birthdayMembers]
      .sort((a, b) => {
        const aDay = parseInt(a.birth_date.split('-').pop(), 10);
        const bDay = parseInt(b.birth_date.split('-').pop(), 10);
        return aDay - bDay;
      })
      .map(m => ({
        id: m.id,
        fullName: m.full_name,
        birthDate: m.birth_date,
        memberType: m.member_type,
        phone: m.member_type === 'Adulto' ? m.phone : m.responsible_contact
      }));

    const membersInCareList = activeMembers
      .filter(m => m.care_status === 'Em cuidado pelo Recomeço')
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        fullName: m.full_name,
        memberType: m.member_type,
        careStatus: m.care_status
      }));

    // =====================
    // RESPONSE
    // =====================
    res.json({
      ok: true,
      recomeco: {
        visitorsToday,
        visitorsThisMonth,
        visitorsWaitingCare,
        visitorsInCare,
        peopleInCare,
        waitingDecision,
        disciples,
        visitorsInFollowUp,
        peopleThisMonth,
        discipleshipRate,
        activeMentors,
        backupStatus: {
          currentMonthDone: Boolean(pendingBackup),
          lastBackupDate: lastBackup ? lastBackup.exported_at : null
        },
        decisionsByType: byFirstDecision,
        peopleByMentor,
        entriesByMonth: byMonth,
        recentPeople
      },
      church: {
        activeMembers: activeMembers.length,
        inactiveMembers: inactiveMembers.length,
        activeAdults: activeAdults.length,
        activeChildren: activeChildren.length,
        baptizedMembers: baptizedMembers.length,
        leadershipMembers: leadershipMembers.length,
        membersInCare: inCareMembersCount,
        birthdaysThisMonth: birthdayMembers.length,
        newMembersThisMonth,
        membersWithAllergy,
        membersByGDS,
        upcomingBirthdays,
        membersInCareList
      }
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

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const csvRows = [['Data da decisão', 'Mês da decisão', 'Nome completo', 'Data de nascimento', 'Endereço completo', 'Contato', 'Sexo', 'Batizado', 'Primeira decisão', 'Status', 'Decisão final', 'Responsáveis', 'Observações', 'Data de criação', 'Data de atualização']];

    for (const p of people || []) {
      csvRows.push([
        p.decision_date || '',
        p.decision_month || '',
        p.full_name || '',
        p.birth_date || '',
        p.full_address || '',
        p.contact || '',
        p.gender || '',
        p.baptized ? 'Sim' : 'Não',
        p.first_decision || '',
        p.disciple_status || '',
        p.final_decision || '',
        p.mentors || '',
        p.notes || '',
        p.created_at || '',
        p.updated_at || ''
      ]);
    }

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recomeco-visitantes-${month}-${year}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/export/members/csv', requireSupabase, async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const csvRows = [['Tipo', 'Nome completo', 'CPF', 'Data nascimento', 'Estado civil', 'Telefone', 'GDS', 'Liderança', 'Batizado', 'Alergia', 'Responsável', 'Contato responsável', 'Status membro', 'Status cuidado', 'Origem', 'CEP', 'Rua', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Observações', 'Criado em', 'Atualizado em']];

    for (const m of members || []) {
      csvRows.push([
        m.member_type || '',
        m.full_name || '',
        m.cpf || '',
        m.birth_date || '',
        m.member_type === 'Adulto' ? (m.marital_status || '') : '',
        m.member_type === 'Adulto' ? (m.phone || '') : (m.responsible_contact || ''),
        m.gds || m.child_gds || '',
        m.is_leadership ? 'Sim' : 'Não',
        m.baptized ? 'Sim' : 'Não',
        m.allergy || m.child_allergy || '',
        m.member_type === 'Criança' ? (m.responsible_name || '') : '',
        m.member_type === 'Criança' ? (m.responsible_contact || '') : '',
        m.member_status || '',
        m.care_status || '',
        m.source || '',
        m.zip_code || '',
        m.street || '',
        m.address_number || '',
        m.address_complement || '',
        m.neighborhood || '',
        m.city || '',
        m.state || '',
        m.notes || '',
        m.created_at || '',
        m.updated_at || ''
      ]);
    }

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recomeco-membros-${month}-${year}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/export/birthdays/csv', requireSupabase, async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('member_status', 'Ativo')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const currentMonthBd = String(now.getMonth() + 1).padStart(2, '0');
    const birthdayMembers = (members || []).filter(m => m.birth_date && String(m.birth_date).includes(`-${currentMonthBd}-`)).sort((a, b) => {
      const aDay = parseInt(a.birth_date.split('-').pop(), 10);
      const bDay = parseInt(b.birth_date.split('-').pop(), 10);
      return aDay - bDay;
    });

    const csvRows = [['Tipo', 'Nome completo', 'Data nascimento', 'Dia', 'Telefone', 'Responsável', 'GDS', 'Alergia', 'Status membro']];

    for (const m of birthdayMembers) {
      csvRows.push([
        m.member_type || '',
        m.full_name || '',
        m.birth_date || '',
        m.birth_date ? parseInt(m.birth_date.split('-').pop(), 10) : '',
        m.member_type === 'Adulto' ? (m.phone || '') : (m.responsible_contact || ''),
        m.member_type === 'Criança' ? (m.responsible_name || '') : '',
        m.gds || m.child_gds || '',
        m.allergy || m.child_allergy || '',
        m.member_status || ''
      ]);
    }

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recomeco-aniversariantes-${month}-${year}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backups/export/visitors/csv', requireSupabase, async (req, res) => {
  try {
    const { data: visitors, error } = await supabase
      .from('visitors')
      .select('*')
      .order('visit_date', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const csvRows = [['Data da visita', 'Nome', 'Sobrenome', 'WhatsApp', 'Observações', 'Entrou em acompanhamento', 'ID Cadastro Completo', 'Data de criação', 'Data de atualização']];

    for (const v of visitors || []) {
      csvRows.push([
        v.visit_date || '',
        v.first_name || '',
        v.last_name || '',
        v.whatsapp || '',
        v.notes || '',
        v.sent_to_recomeco ? 'Sim' : 'Não',
        v.recomeco_person_id || '',
        v.created_at || '',
        v.updated_at || ''
      ]);
    }

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recomeco-visitantes-${month}-${year}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function mapVisitor(row) {
  return {
    id: row.id,
    visitDate: row.visit_date,
    firstName: row.first_name,
    lastName: row.last_name,
    whatsapp: row.whatsapp,
    notes: row.notes,
    sentToRecomeco: row.sent_to_recomeco,
    recomecoPersonId: row.recomeco_person_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Visitors routes
app.get('/api/visitors', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('visit_date', { ascending: false });
    
    if (error) throw error;
    res.json((data || []).map(mapVisitor));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/visitors/:id', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) return res.status(404).json({ error: 'Visitante não encontrado' });
    res.json(mapVisitor(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/visitors', requireSupabase, async (req, res) => {
  try {
    const { data: visitor, error } = await supabase
      .from('visitors')
      .insert({
        visit_date: req.body.visitDate || req.body.visit_date || null,
        first_name: req.body.firstName || req.body.first_name,
        last_name: req.body.lastName || req.body.last_name || null,
        whatsapp: req.body.whatsapp || null,
        notes: req.body.notes || null,
        sent_to_recomeco: false,
        recomeco_person_id: null
      })
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ id: visitor.id, message: 'Visitante cadastrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/visitors/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('visitors')
      .update({
        visit_date: req.body.visitDate || req.body.visit_date || null,
        first_name: req.body.firstName || req.body.first_name,
        last_name: req.body.lastName || req.body.last_name || null,
        whatsapp: req.body.whatsapp || null,
        notes: req.body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Visitante atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/visitors/:id', requireSupabase, async (req, res) => {
  try {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Visitante excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/visitors/:id/send-to-recomeco', requireSupabase, async (req, res) => {
  try {
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (visitorError || !visitor) {
      return res.status(404).json({ ok: false, error: 'Visitante não encontrado' });
    }

    if (visitor.sent_to_recomeco) {
      return res.status(400).json({ ok: false, error: 'Este visitante já possui cadastro completo no acompanhamento.' });
    }

    res.status(400).json({
      ok: false,
      error: 'Use o fluxo de completar cadastro para iniciar acompanhamento.',
      hint: 'Acesse o visitante na área interna e clique em "Completar cadastro" para preencher os dados completos.'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/visitors/:id/complete-registration', requireSupabase, async (req, res) => {
  try {
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (visitorError || !visitor) {
      return res.status(404).json({ ok: false, error: 'Visitante não encontrado' });
    }

    if (visitor.sent_to_recomeco) {
      return res.status(400).json({
        ok: false,
        error: 'Este visitante já possui cadastro completo no acompanhamento.'
      });
    }

    const { decision_date, decision_month, full_name, birth_date, full_address, contact, gender, baptized, first_decision, disciple_status, final_decision, notes: personNotes, mentor_ids, visitor_id } = req.body;

    const { data: person, error: personError } = await supabase
      .from('people')
      .insert({
        decision_date: decision_date || visitor.visit_date || null,
        decision_month: decision_month || null,
        full_name: full_name || (visitor.first_name + (visitor.last_name ? ' ' + visitor.last_name : '')),
        birth_date: birth_date || null,
        full_address: full_address || null,
        contact: contact || visitor.whatsapp || null,
        gender: gender || null,
        baptized: baptized === true || baptized === 'Sim',
        first_decision: first_decision || 'Visitante',
        disciple_status: disciple_status || 'Em cuidado',
        final_decision: final_decision || 'Em acompanhamento',
        notes: personNotes || visitor.notes || null,
        visitor_id: visitor.id
      })
      .select()
      .single();

    if (personError) throw personError;

    if (mentor_ids && mentor_ids.length > 0) {
      const mentorLinks = mentor_ids.map(mentorId => ({
        person_id: person.id,
        mentor_id: mentorId
      }));
      await supabase.from('people_mentors').insert(mentorLinks);
    }

    await supabase
      .from('visitors')
      .update({
        sent_to_recomeco: true,
        recomeco_person_id: person.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    res.json({
      ok: true,
      message: 'Cadastro completo criado com sucesso.',
      person: mapPerson(person)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================
// PEOPLE → MEMBERS INTEGRATION
// =============================================
app.post('/api/people/:id/become-member', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const personId = req.params.id;

    const { data: person, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single();

    if (personError || !person) {
      return res.status(404).json({ ok: false, error: 'Pessoa não encontrada.' });
    }

    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('person_id', personId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ ok: false, error: 'Esta pessoa já está cadastrada como membro.' });
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        member_type: 'Adulto',
        full_name: person.full_name,
        birth_date: person.birth_date || null,
        phone: person.contact || null,
        full_address: person.full_address || null,
        baptized: person.baptized || false,
        person_id: person.id,
        source: 'Veio do Recomeço',
        member_status: 'Ativo',
        care_status: 'Acompanhamento finalizado',
        notes: 'Membro criado a partir do acompanhamento do Recomeço.'
      })
      .select()
      .single();

    if (memberError) throw memberError;

    res.status(201).json({
      ok: true,
      message: 'Pessoa adicionada à lista de membros com sucesso.',
      member: mapMember(member, true)
    });
  } catch (error) {
    console.error('Error in become-member:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// =============================================
// MEMBERS ROUTES (authenticated)
// =============================================
app.get('/api/members', requireSupabase, async (req, res) => {
  try {
    const { type, status, baptized, gds, leadership, allergy, birthdayMonth, search } = req.query;

    let query = supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });

    if (type) query = query.eq('member_type', type);
    if (status) query = query.eq('member_status', status);
    if (baptized !== undefined) query = query.eq('baptized', baptized === 'true');
    if (gds) query = query.eq('gds', gds);
    if (leadership !== undefined) query = query.eq('is_leadership', leadership === 'true');
    if (allergy) query = query.eq('allergy', allergy);
    if (search) query = query.ilike('full_name', `%${search}%`);

    if (birthdayMonth === 'current') {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      query = query.like('birth_date', `%-${month}-%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map(m => mapMember(m, false)));
  } catch (error) {
    console.error('Error listing members:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/members/:id', requireSupabase, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    res.json(mapMember(data, true));
  } catch (error) {
    console.error('Error fetching member:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const { member_type, full_name, cpf, birth_date, phone, full_address,
      marital_status, gds, is_leadership, baptized, allergy,
      responsible_name, responsible_contact, child_gds, child_allergy,
      member_status, care_status, source, person_id, visitor_id, notes,
      zip_code, street, address_number, address_complement,
      neighborhood, city, state } = req.body;

    console.log('Creating member:', sanitizeMemberLog(req.body));

    if (!member_type) {
      return res.status(400).json({ error: 'Tipo de membro é obrigatório.' });
    }
    if (member_type !== 'Adulto' && member_type !== 'Criança') {
      return res.status(400).json({ error: 'Tipo de membro precisa ser Adulto ou Criança.' });
    }
    if (!full_name) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }
    if (member_status && !['Ativo', 'Inativo'].includes(member_status)) {
      return res.status(400).json({ error: 'member_status precisa ser Ativo ou Inativo.' });
    }

    const insertData = {
      member_type,
      full_name,
      cpf: cpf || null,
      birth_date: birth_date || null,
      phone: phone || null,
      full_address: full_address || null,
      zip_code: zip_code || null,
      street: street || null,
      address_number: address_number || null,
      address_complement: address_complement || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      member_status: member_status || 'Ativo',
      care_status: care_status || 'Sem cuidado ativo',
      source: source || 'Cadastro interno',
      person_id: person_id || null,
      visitor_id: visitor_id || null,
      notes: notes || null
    };

    if (member_type === 'Adulto') {
      insertData.marital_status = marital_status || null;
      insertData.gds = gds || null;
      insertData.is_leadership = Boolean(is_leadership);
      insertData.baptized = Boolean(baptized);
      insertData.allergy = allergy || null;
    } else {
      insertData.responsible_name = responsible_name || null;
      insertData.responsible_contact = responsible_contact || null;
      insertData.child_gds = child_gds || null;
      insertData.child_allergy = child_allergy || null;
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(mapMember(member, true));
  } catch (error) {
    console.error('Error creating member:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/members/:id', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const { member_type, full_name, cpf, birth_date, phone, full_address,
      marital_status, gds, is_leadership, baptized, allergy,
      responsible_name, responsible_contact, child_gds, child_allergy,
      member_status, care_status, source, person_id, visitor_id, notes,
      zip_code, street, address_number, address_complement,
      neighborhood, city, state } = req.body;

    console.log('Updating member:', req.params.id);

    if (!member_type) {
      return res.status(400).json({ error: 'Tipo de membro é obrigatório.' });
    }
    if (member_type !== 'Adulto' && member_type !== 'Criança') {
      return res.status(400).json({ error: 'Tipo de membro precisa ser Adulto ou Criança.' });
    }
    if (!full_name) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }
    if (member_status && !['Ativo', 'Inativo'].includes(member_status)) {
      return res.status(400).json({ error: 'member_status precisa ser Ativo ou Inativo.' });
    }

    const updateData = {
      member_type,
      full_name,
      cpf: cpf || null,
      birth_date: birth_date || null,
      phone: phone || null,
      full_address: full_address || null,
      zip_code: zip_code || null,
      street: street || null,
      address_number: address_number || null,
      address_complement: address_complement || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      member_status: member_status || 'Ativo',
      care_status: care_status || 'Sem cuidado ativo',
      source: source || 'Cadastro interno',
      person_id: person_id || null,
      visitor_id: visitor_id || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    if (member_type === 'Adulto') {
      updateData.marital_status = marital_status || null;
      updateData.gds = gds || null;
      updateData.is_leadership = Boolean(is_leadership);
      updateData.baptized = Boolean(baptized);
      updateData.allergy = allergy || null;
    } else {
      updateData.marital_status = null;
      updateData.gds = null;
      updateData.is_leadership = false;
      updateData.baptized = false;
      updateData.allergy = null;
      updateData.responsible_name = responsible_name || null;
      updateData.responsible_contact = responsible_contact || null;
      updateData.child_gds = child_gds || null;
      updateData.child_allergy = child_allergy || null;
    }

    const { error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Membro atualizado com sucesso.' });
  } catch (error) {
    console.error('Error updating member:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/members/:id', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Membro excluído com sucesso.' });
  } catch (error) {
    console.error('Error deleting member:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/members/:id/status', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const { member_status } = req.body;
    if (!member_status || !['Ativo', 'Inativo'].includes(member_status)) {
      return res.status(400).json({ error: 'member_status precisa ser Ativo ou Inativo.' });
    }

    const { error } = await supabase
      .from('members')
      .update({ member_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Status do membro atualizado.' });
  } catch (error) {
    console.error('Error updating member status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/members/:id/care-status', requireSupabase, authenticateToken, async (req, res) => {
  try {
    const { care_status } = req.body;
    const validStatuses = ['Sem cuidado ativo', 'Em cuidado pelo Recomeço', 'Acompanhamento finalizado', 'Precisa de contato'];
    if (!care_status || !validStatuses.includes(care_status)) {
      return res.status(400).json({ error: 'care_status inválido.' });
    }

    const { error } = await supabase
      .from('members')
      .update({ care_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Status de cuidado atualizado.' });
  } catch (error) {
    console.error('Error updating member care status:', error.message);
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