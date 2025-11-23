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
app.use(express.json({ limit: '10mb' }));

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

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, nis, class: classValue, commission_id } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR nis = ?').get(email, nis);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${crypto.randomUUID()}`;
    db.prepare(`INSERT INTO users (id, name, nis, email, password_hash, class, commission_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, name, nis, email, passwordHash, classValue, commission_id || null);
    const user = db.prepare('SELECT id, name, email, nis, class, commission_id, roles FROM users WHERE id = ?').get(userId);
    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, access_token: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password_hash;
    res.json({ user, access_token: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, nis, class, commission_id, roles, is_active FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, nis, email, class, commission_id, roles, is_active, total_assigned_programs FROM users ORDER BY name').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, nis, email, password, class: classValue, commission_id } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${crypto.randomUUID()}`;
    db.prepare(`INSERT INTO users (id, name, nis, email, password_hash, class, commission_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, name, nis, email, passwordHash, classValue, commission_id || null);
    const user = db.prepare('SELECT id, name, nis, email, class, commission_id, roles FROM users WHERE id = ?').get(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, nis, email, class: classValue, commission_id, is_active, roles } = req.body;
  try {
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (nis !== undefined) { updates.push('nis = ?'); values.push(nis); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (classValue !== undefined) { updates.push('class = ?'); values.push(classValue); }
    if (commission_id !== undefined) { updates.push('commission_id = ?'); values.push(commission_id); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (roles !== undefined) { updates.push('roles = ?'); values.push(JSON.stringify(roles)); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT id, name, nis, email, class, commission_id, roles, is_active FROM users WHERE id = ?').get(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/bulk', authMiddleware, adminMiddleware, async (req, res) => {
  const { users } = req.body;
  try {
    const results = { success: [], errors: [] };
    for (const userData of users) {
      try {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const userId = `user-${crypto.randomUUID()}`;
        db.prepare(`INSERT INTO users (id, name, nis, email, password_hash, class, commission_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, userData.name, userData.nis, userData.email, passwordHash, userData.class, userData.commission_id || null);
        results.success.push(userData.email);
      } catch (error) {
        results.errors.push({ email: userData.email, error: error.message });
      }
    }
    res.json(results);
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

app.get('/api/programs/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/programs', authMiddleware, adminMiddleware, (req, res) => {
  const { name, description, type, category, start_datetime, end_datetime, preparation_days_before, cleanup_days_after } = req.body;
  try {
    const programId = `prog-${crypto.randomUUID()}`;
    db.prepare(`INSERT INTO programs (id, name, description, type, category, proposer_id, start_datetime, end_datetime, preparation_days_before, cleanup_days_after, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`).run(programId, name, description, type, category, req.user.id, start_datetime, end_datetime, preparation_days_before || 0, cleanup_days_after || 0);
    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(programId);
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/programs/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, description, type, category, start_datetime, end_datetime, preparation_days_before, cleanup_days_after, status } = req.body;
  try {
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (start_datetime !== undefined) { updates.push('start_datetime = ?'); values.push(start_datetime); }
    if (end_datetime !== undefined) { updates.push('end_datetime = ?'); values.push(end_datetime); }
    if (preparation_days_before !== undefined) { updates.push('preparation_days_before = ?'); values.push(preparation_days_before); }
    if (cleanup_days_after !== undefined) { updates.push('cleanup_days_after = ?'); values.push(cleanup_days_after); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE programs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/programs/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM programs WHERE id = ?').run(id);
    res.json({ success: true });
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
    const { program_id, user_id } = req.query;
    let query = 'SELECT * FROM panitia_assignments';
    const conditions = [];
    const values = [];
    if (program_id) { conditions.push('program_id = ?'); values.push(program_id); }
    if (user_id) { conditions.push('user_id = ?'); values.push(user_id); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    const assignments = db.prepare(query).all(...values);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/panitia-assignments', authMiddleware, adminMiddleware, (req, res) => {
  const { program_id, user_id, role, commission_id, is_required_role, is_locked } = req.body;
  try {
    const assignmentId = `assign-${crypto.randomUUID()}`;
    db.prepare(`INSERT INTO panitia_assignments (id, program_id, user_id, role, commission_id, is_required_role, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(assignmentId, program_id, user_id, role, commission_id, is_required_role ? 1 : 0, is_locked ? 1 : 0);
    const assignment = db.prepare('SELECT * FROM panitia_assignments WHERE id = ?').get(assignmentId);
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/panitia-assignments/bulk', authMiddleware, adminMiddleware, (req, res) => {
  const { assignments } = req.body;
  try {
    const results = [];
    for (const a of assignments) {
      const assignmentId = `assign-${crypto.randomUUID()}`;
      db.prepare(`INSERT INTO panitia_assignments (id, program_id, user_id, role, commission_id, is_required_role, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(assignmentId, a.program_id, a.user_id, a.role, a.commission_id, a.is_required_role ? 1 : 0, a.is_locked ? 1 : 0);
      results.push(assignmentId);
    }
    res.json({ success: true, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/panitia-assignments/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM panitia_assignments WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scores', authMiddleware, (req, res) => {
  try {
    const { program_id, grader_id } = req.query;
    let query = 'SELECT * FROM scores';
    const conditions = [];
    const values = [];
    if (program_id) { conditions.push('program_id = ?'); values.push(program_id); }
    if (grader_id) { conditions.push('grader_id = ?'); values.push(grader_id); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    const scores = db.prepare(query).all(...values);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scores', authMiddleware, (req, res) => {
  const { program_id, standard_code, score_value, comment, is_draft } = req.body;
  try {
    const scoreId = `score-${crypto.randomUUID()}`;
    db.prepare(`INSERT INTO scores (id, program_id, grader_id, standard_code, score_value, comment, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(scoreId, program_id, req.user.id, standard_code, score_value, comment || null, is_draft ? 1 : 0);
    const score = db.prepare('SELECT * FROM scores WHERE id = ?').get(scoreId);
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scoring-rubrics', authMiddleware, (req, res) => {
  try {
    const { program_type } = req.query;
    let query = 'SELECT * FROM scoring_rubrics';
    if (program_type) query += ' WHERE program_type = ?';
    const rubrics = db.prepare(query).all(program_type ? [program_type] : []);
    res.json(rubrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications', authMiddleware, (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MPK Server running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${__dirname}/mpk.db`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
});
