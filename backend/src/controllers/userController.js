import db from '../config/db.js';

// PUT /api/users/profile
export const updateBalanceAndLimit = async (req, res) => {
  const { total_balance } = req.body;
  const userId = req.user.id;

  try {
    let updateFields = [];
    let queryParams = [];

    if (total_balance !== undefined) {
      updateFields.push('total_balance = ?');
      queryParams.push(total_balance);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    queryParams.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, queryParams);

    const [users] = await db.query('SELECT id, name, email, total_balance FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User profile updated successfully', user: users[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
