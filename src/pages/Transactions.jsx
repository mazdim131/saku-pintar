import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatRupiah, formatDate, formatDateInput } from '../utils/format';
import Modal from '../components/Modal';

const EMPTY_FORM = { category_id: '', amount: '', transaction_date: '', note: '', type: 'expense' };

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' });
  const [filter, setFilter] = useState('all'); // all | income | expense
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => { 
    try {
      const [tx, cats] = await Promise.all([api.getTransactions(), api.getCategories()]);
      setTransactions(tx);
      setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, transaction_date: new Date().toISOString().split('T')[0] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (tx) => {
    setEditItem(tx);
    setForm({
      category_id: tx.category_id,
      amount: tx.amount,
      transaction_date: formatDateInput(tx.transaction_date),
      note: tx.note || '',
      type: tx.type,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.category_id || !form.amount || !form.transaction_date) {
      setError('Kategori, jumlah, dan tanggal wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        await api.updateTransaction(editItem.id, form);
      } else {
        await api.createTransaction(form);
      }
      setShowModal(false);
      fetchData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await api.deleteTransaction(id);
      fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleAddCategory = async () => {
    if (!catForm.name) return;
    try {
      await api.createCategory(catForm);
      const cats = await api.getCategories();
      setCategories(cats);
      setCatForm({ name: '', type: 'expense' });
      setShowCatModal(false);
    } catch (e) { alert(e.message); }
  };

  const filteredCats = categories.filter(c => c.type === form.type);
  const filteredTx = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Transaksi</h2>
          <p className="page-subtitle">Catat setiap pemasukan dan pengeluaran</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowCatModal(true)}>+ Kategori</button>
          <button className="btn-primary" onClick={openAdd}>+ Transaksi</button>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'income', 'expense'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Semua' : f === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      <div className="card">
        {filteredTx.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Belum ada transaksi</p>
            <button className="btn-primary" onClick={openAdd}>Tambah Sekarang</button>
          </div>
        ) : (
          <div className="tx-table">
            <div className="tx-table-header">
              <span>Tanggal</span>
              <span>Kategori</span>
              <span>Catatan</span>
              <span>Jumlah</span>
              <span>Aksi</span>
            </div>
            {filteredTx.map(tx => (
              <div key={tx.id} className="tx-row">
                <span className="tx-date">{formatDate(tx.transaction_date)}</span>
                <span>
                  <span className={`badge badge-${tx.type}`}>{tx.category_name}</span>
                </span>
                <span className="tx-note">{tx.note || '-'}</span>
                <span className={`tx-amount-cell ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                </span>
                <span className="tx-actions">
                  <button className="icon-btn edit" onClick={() => openEdit(tx)} title="Edit">✏️</button>
                  <button className="icon-btn delete" onClick={() => handleDelete(tx.id)} title="Hapus">🗑️</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Transaksi' : 'Tambah Transaksi'} onClose={() => setShowModal(false)}>
          <div className="form-row">
            <div className="form-group">
              <label>Tipe</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category_id: '' })}>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Pilih kategori</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Jumlah (Rp)</label>
              <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tanggal</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Catatan (opsional)</label>
            <input type="text" placeholder="Kopi, bensin, dll..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <Modal title="Tambah Kategori" onClose={() => setShowCatModal(false)}>
          <div className="form-group">
            <label>Nama Kategori</label>
            <input type="text" placeholder="Makanan, Transportasi, dll..." value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Tipe</label>
            <select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowCatModal(false)}>Batal</button>
            <button className="btn-primary" onClick={handleAddCategory}>Tambah</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
