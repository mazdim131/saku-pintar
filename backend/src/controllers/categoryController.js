import db from '../config/db.js';

export const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ message: 'Name and type are required' });

  try {
    const [result] = await db.query('INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)', [req.user.id, name, type]);
    res.status(201).json({ message: 'Category created', id: result.insertId, name, type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  const { name, type } = req.body;
  const { id } = req.params;

  try {
    const [result] = await db.query('UPDATE categories SET name = ?, type = ? WHERE id = ? AND user_id = ?', [name, type, id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Category not found or unauthorized' });
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Category not found or unauthorized' });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Cannot delete category as it is used in existing transactions' });
    }
    res.status(500).json({ error: error.message });
  }
};
