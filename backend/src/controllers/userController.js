import db from '../config/db.js';

// PUT /api/users/profile
export const updateBalanceAndLimit = async (req, res) => {
  const { total_balance, limit } = req.body;
  const userId = req.user.id;

  try {
    let updateFields = [];
    let queryParams = [];

    if (total_balance !== undefined) {
      updateFields.push('total_balance = ?');
      queryParams.push(total_balance);
    }
    // limit is wrapped in backticks because it is a reserved SQL word
    if (limit !== undefined) {
      updateFields.push('`limit` = ?');
      queryParams.push(limit);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    queryParams.push(userId);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, queryParams);

    // Fetch updated user to return complete new state
    const [users] = await db.query('SELECT id, name, email, total_balance, `limit` FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User profile updated successfully', user: users[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
