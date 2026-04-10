import db from '../config/db.js';

// Mengambil semua target tabungan (saving goals) milik user
export const getSavingGoals = async (req, res) => {
  try {
    const [goals] = await db.query(
      'SELECT * FROM saving_goals WHERE user_id = ? ORDER BY deadline ASC',
      [req.user.id]
    );
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Membuat target tabungan baru
export const createSavingGoal = async (req, res) => {
  const { name, target_amount, deadline } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Goal name is required' });
  }
  if (!target_amount || parseFloat(target_amount) <= 0) {
    return res.status(400).json({ message: 'Target amount must be greater than 0' });
  }
  if (!deadline) {
    return res.status(400).json({ message: 'Deadline is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO saving_goals (user_id, name, target_amount, deadline) VALUES (?, ?, ?, ?)',
      [req.user.id, name.trim(), target_amount, deadline]
    );
    res.status(201).json({ message: 'Target tabungan berhasil dibuat', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Memperbarui informasi target tabungan (misal: ganti nama, target, atau deadline)
export const updateSavingGoal = async (req, res) => {
  const { name, target_amount, deadline } = req.body;
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'UPDATE saving_goals SET name = ?, target_amount = ?, deadline = ? WHERE id = ? AND user_id = ?',
      [name, target_amount, deadline, id, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Target tabungan tidak ditemukan atau tidak diizinkan' });
    res.json({ message: 'Target tabungan berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Menghapus target tabungan
export const deleteSavingGoal = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM saving_goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Target tabungan tidak ditemukan atau tidak diizinkan' });
    res.json({ message: 'Target tabungan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Menambahkan dana ke dalam tabungan tertentu
export const addFundsToGoal = async (req, res) => {
  const { amount } = req.body;
  const { id } = req.params;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Jumlah dana (amount) harus lebih dari 0' });
  }

  try {
    const numericAmount = parseFloat(amount);
    
    // Pastikan target tabungan milik user ini ada
    const [goals] = await db.query('SELECT current_amount, target_amount FROM saving_goals WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (goals.length === 0) {
      return res.status(404).json({ message: 'Target tabungan tidak ditemukan' });
    }

    // Tambahkan dana ke current_amount
    await db.query(
      'UPDATE saving_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?',
      [numericAmount, id, req.user.id]
    );

    res.json({ message: 'Dana berhasil ditambahkan ke tabungan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
