import db from '../config/db.js';

// GET /api/budgets
export const getBudgets = async (req, res) => {
  try {
    const [budgets] = await db.query(`
      SELECT b.*, c.name as category_name 
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.start_date DESC
    `, [req.user.id]);
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/budgets
export const createBudget = async (req, res) => {
  const { category_id, amount, period, start_date, end_date } = req.body;
  if (!amount || !period || !start_date || !end_date) {
    return res.status(400).json({ message: 'Amount, period, start_date, and end_date are required' });
  }

  try {
    const defaultCategoryId = category_id ? category_id : null;
    const [result] = await db.query(
      'INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, defaultCategoryId, amount, period, start_date, end_date]
    );
    res.status(201).json({ message: 'Budget created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/budgets/:id
export const updateBudget = async (req, res) => {
  const { category_id, amount, period, start_date, end_date } = req.body;
  const { id } = req.params;

  try {
    const defaultCategoryId = category_id ? category_id : null;
    const [result] = await db.query(
      'UPDATE budgets SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?',
      [defaultCategoryId, amount, period, start_date, end_date, id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Budget not found or unauthorized' });
    res.json({ message: 'Budget updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/budgets/:id
export const deleteBudget = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Budget not found or unauthorized' });
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/budgets/status
// Cek penggunaan budget vs transaksi aktual
export const getBudgetStatus = async (req, res) => {
  try {
    // 1. Ambil semua budget yang sedang aktif berdasarkan tanggal
    const [budgets] = await db.query(`
      SELECT b.*, c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND CURDATE() BETWEEN b.start_date AND b.end_date
    `, [req.user.id]);

    const statuses = [];

    // 2. Untuk setiap budget, kalkulasi total pengeluaran
    for (const budget of budgets) {
      let query = 'SELECT SUM(amount) as total_spent FROM transactions WHERE user_id = ? AND type = "expense" AND transaction_date BETWEEN ? AND ?';
      let params = [req.user.id, budget.start_date, budget.end_date];

      if (budget.category_id) {
        query += ' AND category_id = ?';
        params.push(budget.category_id);
      }

      const [spentResult] = await db.query(query, params);
      const totalSpent = spentResult[0].total_spent || 0;
      const remaining = parseFloat(budget.amount) - parseFloat(totalSpent);

      statuses.push({
        ...budget,
        total_spent: totalSpent,
        remaining: remaining,
        is_exceeded: remaining < 0
      });
    }

    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
