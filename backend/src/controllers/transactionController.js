import db from '../config/db.js';

// Mengambil semua transaksi milik seorang user
export const getTransactions = async (req, res) => {
  try {
    // Menggabungkan (JOIN) dengan tabel categories untuk mendapatkan nama kategori yang mudah dibaca
    const [transactions] = await db.query(`
      SELECT t.*, c.name as category_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `, [req.user.id]);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Membuat transaksi baru dan secara otomatis memperbarui total_balance
export const createTransaction = async (req, res) => {
  const { category_id, amount, transaction_date, note, type } = req.body;
  
  // Validation
  if (!category_id) {
    return res.status(400).json({ message: 'Category is required' });
  }
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }
  if (!transaction_date) {
    return res.status(400).json({ message: 'Transaction date is required' });
  }
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'Type must be either income or expense' });
  }

  try {
    // Memulai transaksi database untuk memastikan integritas data (jika salah satu gagal, semua dibatalkan)
    await db.query('BEGIN');
    
    // 1. Menyimpan data riwayat transaksi baru ke tabel transactions
    const [result] = await db.query(
      'INSERT INTO transactions (user_id, category_id, amount, transaction_date, note, type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, category_id, amount, transaction_date, note, type]
    );

    // 2. Menghitung bagaimana transaksi baru ini memengaruhi total saldo pengguna
    // Jika itu pemasukan (income), kita tambahkan (+). Jika pengeluaran (expense), kita kurangkan (-).
    const balanceChange = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
    
    // 3. Memperbarui total_balance milik user di database
    await db.query('UPDATE users SET total_balance = total_balance + ? WHERE id = ?', [balanceChange, req.user.id]);

    // 4. Menerapkan/menyimpan perubahan permanen (Commit) jika kedua query di atas berhasil
    await db.query('COMMIT');
    
    const [users] = await db.query('SELECT id, name, email, total_balance, `limit` FROM users WHERE id = ?', [req.user.id]);
    res.status(201).json({ message: 'Transaksi berhasil dibuat dan saldo diperbarui', id: result.insertId, user: users[0] });
  } catch (error) {
    // 5. Membatalkan (Rollback) perubahan jika terjadi error (misalnya koneksi database terputus di tengah jalan)
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};

// Memperbarui transaksi yang ada dan menyesuaikan total_balance sesuai perubahan tersebut
export const updateTransaction = async (req, res) => {
  const { category_id, amount, transaction_date, note, type } = req.body;
  const { id } = req.params;

  try {
    await db.query('BEGIN');
    
    // 1. Mengambil data transaksi lama untuk membatalkan efeknya pada saldo
    const [oldTx] = await db.query('SELECT amount, type FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (oldTx.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan atau tidak diizinkan' });
    }
    
    // 2. Menghitung efek dari transaksi lama sehingga kita bisa mengembalikannya nanti
    const oldAmount = parseFloat(oldTx[0].amount);
    const oldType = oldTx[0].type;
    const oldBalanceChange = oldType === 'income' ? oldAmount : -oldAmount;
    
    // 3. Menghitung efek baru berdasarkan data yang telah diperbarui oleh user
    const newAmount = parseFloat(amount);
    const newBalanceChange = type === 'income' ? newAmount : -newAmount;
    
    // 4. Menghitung selisih bersih (Selisih Bersih = Efek Baru - Efek Lama)
    // Contoh: Pengeluaran lama adalah 10.000, diubah menjadi 15.000. Selisih bersih terhadap saldo adalah -5.000 (saldo harus dikurangi 5rb lagi).
    const netChange = newBalanceChange - oldBalanceChange;

    // 5. Memperbarui catatan transaksi di database dengan data yang baru
    await db.query(
      'UPDATE transactions SET category_id = ?, amount = ?, transaction_date = ?, note = ?, type = ? WHERE id = ? AND user_id = ?',
      [category_id, amount, transaction_date, note, type, id, req.user.id]
    );

    // 6. Memperbarui total saldo pengguna jika ada selisih perhitungan dari perubahan transaksi
    if (netChange !== 0) {
      await db.query('UPDATE users SET total_balance = total_balance + ? WHERE id = ?', [netChange, req.user.id]);
    }

    await db.query('COMMIT');
    
    const [users] = await db.query('SELECT id, name, email, total_balance, `limit` FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Transaksi berhasil diperbarui', user: users[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};

// Menghapus rekaman transaksi dan membatalkan efeknya terhadap total_balance
export const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');

    // 1. Mendapatkan detail transaksi lama sebelum dihapus dari database
    const [oldTx] = await db.query('SELECT amount, type FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (oldTx.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Transaksi tidak ditemukan atau tidak diizinkan' });
    }

    // 2. Menghitung nilai pembalikan (reverse) terhadap saldo
    // Jika kita menghapus transaksi pemasukan, itu berarti uang ditarik sehingga saldo dipotong (-).
    // Jika kita menghapus transaksi pengeluaran (misal salah catat), uang dikembalikan ke saldo (+).
    const amount = parseFloat(oldTx[0].amount);
    const type = oldTx[0].type;
    const balanceChange = type === 'income' ? -amount : amount;

    // 3. Menghapus rekaman transaksi dari database secara permanen
    await db.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    // 4. Mengembalikan (revert) perubahan saldo pada profil pengguna 
    await db.query('UPDATE users SET total_balance = total_balance + ? WHERE id = ?', [balanceChange, req.user.id]);
    
    await db.query('COMMIT');
    
    const [users] = await db.query('SELECT id, name, email, total_balance, `limit` FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Transaksi berhasil dihapus dan saldo sudah dikembalikan', user: users[0] });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};
