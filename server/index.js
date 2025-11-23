const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('./database');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  const roles = JSON.parse(req.user.roles || '[]');
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

app.post('/api/auth/signup', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('nis').notEmpty(),
  body('class').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, nis, classValue, commission_id } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR nis = ?').get(email, nis);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO users (id, name, nis, email, password_hash, class, commission_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, nis, email, passwordHash, classValue, commission_id || null);

    const user = db.prepare('SELECT id, name, email, nis, class, commission_id, roles FROM users WHERE id = ?').get(userId);
    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, nis, class, commission_id, roles, is_active FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, nis, email, class, commission_id, roles, is_active FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, nis, email, password, classValue, commission_id } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO users (id, name, nis, email, password_hash, class, commission_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, nis, email, passwordHash, classValue, commission_id || null);

    const user = db.prepare('SELECT id, name, nis, email, class, commission_id, roles FROM users WHERE id = ?').get(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, nis, classValue, commission_id, is_active } = req.body;

  try {
    db.prepare(`
      UPDATE users
      SET name = ?, nis = ?, class = ?, commission_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, nis, classValue, commission_id || null, is_active ? 1 : 0, id);

    const user = db.prepare('SELECT id, name, nis, email, class, commission_id, roles, is_active FROM users WHERE id = ?').get(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/commissions', authMiddleware, (req, res) => {
  try {
    const commissions = db.prepare('SELECT * FROM commissions ORDER BY name').all();
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/programs', authMiddleware, (req, res) => {
  try {
    const programs = db.prepare('SELECT * FROM programs ORDER BY created_at DESC').all();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/programs', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, type, category, start_datetime, end_datetime, preparation_days_before, cleanup_days_after } = req.body;

  try {
    const programId = `prog-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO programs (id, name, description, type, category, proposer_id, start_datetime, end_datetime, preparation_days_before, cleanup_days_after, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(programId, name, description, type, category, req.user.id, start_datetime, end_datetime, preparation_days_before || 0, cleanup_days_after || 0);

    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId);
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/program-types', authMiddleware, (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM program_types WHERE is_active = 1').all();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/program-categories', authMiddleware, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM program_categories WHERE is_active = 1').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/panitia-assignments', authMiddleware, (req, res) => {
  try {
    const assignments = db.prepare('SELECT * FROM panitia_assignments').all();
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MPK Server running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${__dirname}/mpk.db`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
});
