require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Initialize database table
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS diet_preferences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
        diet_preference VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Database table ready');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
  } finally {
    client.release();
  }
}

// API Routes

// Submit diet preference
app.post('/api/preferences', async (req, res) => {
  const { name, gender, age, diet_preference } = req.body;

  // Validation
  if (!name || !gender || !age || !diet_preference) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (!['Male', 'Female'].includes(gender)) {
    return res.status(400).json({ error: 'Gender must be Male or Female' });
  }
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 1 || ageNum > 149) {
    return res.status(400).json({ error: 'Age must be between 1 and 149' });
  }
  const validDiets = ['Vegan', 'Vegetarian', 'Keto', 'Paleo', 'Mediterranean', 'Low-Carb', 'Gluten-Free', 'Halal', 'Kosher', 'No Preference'];
  if (!validDiets.includes(diet_preference)) {
    return res.status(400).json({ error: 'Invalid diet preference' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO diet_preferences (name, gender, age, diet_preference) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), gender, ageNum, diet_preference]
    );
    res.status(201).json({ message: 'Preference saved successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Insert error:', err.message);
    res.status(500).json({ error: 'Failed to save preference' });
  }
});

// Get all preferences
app.get('/api/preferences', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diet_preferences ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Delete a preference
app.delete('/api/preferences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM diet_preferences WHERE id = $1', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  initDB().catch(err => console.error('DB init deferred:', err.message));
});
