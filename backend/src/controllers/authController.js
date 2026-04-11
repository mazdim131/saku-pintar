import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import db from '../config/db.js';

function toSafeErrorMessage(error, fallback) {
  if (error?.code === 'ECONNREFUSED') return 'Database connection failed. Please try again later.';
  return error?.message || String(error) || fallback;
}

// Input validation functions
const validateEmail = (email) => validator.isEmail(email);
const validatePassword = (password) => password && password.length >= 8;
const validateName = (name) => name && name.trim().length >= 2 && name.trim().length <= 50;

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  if (!validateName(name)) {
    return res.status(400).json({ message: 'Name must be between 2-50 characters' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase(), password_hash]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    const message = toSafeErrorMessage(error, 'Registration failed');
    if (isProd) {
      console.error('Registration error:', error);
      return res.status(500).json({ message });
    }
    return res.status(500).json({ message, error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        total_balance: user.total_balance
      }
    });
  } catch (error) {
    const isProd = process.env.NODE_ENV === 'production';
    const message = toSafeErrorMessage(error, 'Login failed');
    if (isProd) {
      console.error('Login error:', error);
      return res.status(500).json({ message });
    }
    return res.status(500).json({ message, error: error.message });
  }
};