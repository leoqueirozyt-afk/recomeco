// Auth routes for backend
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'recomeco-secret-key-2024';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@recomeco.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'recomeco123';

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

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { email: ADMIN_EMAIL, role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

router.get('/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;