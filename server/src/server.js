import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { initDb } from './database/db.js';

import * as peopleRoutes from './routes/people.js';
import * as mentorsRoutes from './routes/mentors.js';
import * as dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'recomeco-secret-key-2024';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const ADMIN_EMAIL = 'admin@recomeco.com';
const ADMIN_PASSWORD = 'recomeco123';

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

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { email: ADMIN_EMAIL, role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor rodando corretamente' });
});

app.get('/api/people', (req, res) => {
  try {
    res.json(peopleRoutes.getAllPeople());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/people/:id', (req, res) => {
  try {
    const person = peopleRoutes.getPersonById(req.params.id);
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/people', (req, res) => {
  try {
    const id = peopleRoutes.createPerson(req.body);
    res.status(201).json({ id, message: 'Pessoa cadastrada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/people/:id', (req, res) => {
  try {
    peopleRoutes.updatePerson(req.params.id, req.body);
    res.json({ message: 'Pessoa atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/people/:id', (req, res) => {
  try {
    peopleRoutes.deletePerson(req.params.id);
    res.json({ message: 'Pessoa excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mentors', (req, res) => {
  try {
    res.json(mentorsRoutes.getAllMentors());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mentors/:id', (req, res) => {
  try {
    const mentor = mentorsRoutes.getMentorById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ error: 'Responsável não encontrado' });
    }
    res.json(mentor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mentors', (req, res) => {
  try {
    const id = mentorsRoutes.createMentor(req.body);
    res.status(201).json({ id, message: 'Responsável cadastrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mentors/:id', (req, res) => {
  try {
    mentorsRoutes.updateMentor(req.params.id, req.body);
    res.json({ message: 'Responsável atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mentors/:id', (req, res) => {
  try {
    mentorsRoutes.deleteMentor(req.params.id);
    res.json({ message: 'Responsável excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/summary', (req, res) => {
  try {
    res.json(dashboardRoutes.getDashboardSummary());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});