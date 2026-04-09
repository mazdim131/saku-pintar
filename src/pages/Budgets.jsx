import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatRupiah, formatDate, formatDateInput } from '../utils/format';
import Modal from '../components/Modal';

const PERIODS = ['daily', 'weekly', 'monthly'];
const PERIOD_LABELS = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };
const EMPTY_FORM = { category_id: '', amount: '', period: 'monthly', start_date: '', end_date: '' };

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [b, bs, cats] = await Promise.all([
        api.getBudgets(),
        api.getBudgetStatus(),
        api.getCategories(),
      ]);
      setBudgets(b);
      setBudgetStatus(bs);
      setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setForm({ ...EMPTY_FORM, start_date: firstDay, end_date: lastDay });
    setError('');
    setShowModal(true);
  };

  const openEdit = (budget) => {
    setEditItem(budget);
    setForm({
      category_id: budget.category_id || '',
      amount: budget.amount,
      period: budget.period,
      start_date: formatDateInput(budget.start_date),
      end_date: formatDateInput(budget.end_date),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.start_date || !form.end_date) {
      setError('Jumlah, tanggal mulai, dan tanggal akhir wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, category_id: form.category_id || null };
      if (editItem) {
        await api.updateBudget(editItem.id, payload);
      } else {
        await api.createBudget(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus anggaran ini?')) return;
    try {
      await api.deleteBudget(id);
      fetchData();
    } catch (e) { alert(e.message); }
  };

  // Merge status data into budgets
  const getBudgetWithStatus = (budget) => {
    return budgetStatus.find(bs => bs.id === budget.id) || budget;
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Anggaran</h2>
          <p className="page-subtitle">Kendalikan pengeluaranmu dengan budget</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Tambah Anggaran</button>
      </div>

      {budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Belum ada anggaran</p>
            <button className="btn-primary" onClick={openAdd}>Buat Anggaran Pertama</button>
          </div>
        </div>
      ) : (
        <div className="budgets-grid">
          {budgets.map(budget => {
            const withStatus = getBudgetWithStatus(budget);
            const isActive = budgetStatus.some(bs => bs.id === budget.id);
            const spent = parseFloat(withStatus.total_spent || 0);
            const total = parseFloat(budget.amount);
            const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
            const isExceeded = withStatus.is_exceeded;
            const isNear = !isExceeded && pct >= 80;

            return (
              <div key={budget.id} className={`budget-card ${isExceeded ? 'exceeded' : isNear ? 'near' : ''}`}>
                <div className="budget-card-top">
                  <div>
                    <div className="budget-category">
                      {budget.category_name || 'Semua Kategori'}
                    </div>
                    <div className="budget-period">
                      <span className={`badge badge-period`}>{PERIOD_LABELS[budget.period]}</span>
                      {isActive && <span className="badge badge-active">Aktif</span>}
                    </div>
                  </div>
                  <div className="budget-card-actions">
                    <button className="icon-btn edit" onClick={() => openEdit(budget)} title="Edit">✏️</button>
                    <button className="icon-btn delete" onClick={() => handleDelete(budget.id)} title="Hapus">🗑️</button>
                  </div>
                </div>

                <div className="budget-amount-row">
                  <div>
                    <div className="budget-label">Limit</div>
                    <div className="budget-limit">{formatRupiah(budget.amount)}</div>
                  </div>
                  {isActive && (
                    <div className="text-right">
                      <div className="budget-label">Terpakai</div>
                      <div className={`budget-spent ${isExceeded ? 'expense' : ''}`}>{formatRupiah(spent)}</div>
                    </div>
                  )}
                </div>

                {isActive && (
                  <>
                    <div className="progress-bar large">
                      <div
                        className={`progress-fill ${isExceeded ? 'danger' : isNear ? 'warning' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="budget-footer">
                      <span className={isExceeded ? 'expense' : 'income'}>
                        {isExceeded ? `⚠️ Melebihi ${formatRupiah(Math.abs(withStatus.remaining))}` : `Sisa ${formatRupiah(withStatus.remaining)}`}
                      </span>
                      <span className="budget-pct">{Math.round(pct)}%</span>
                    </div>
                  </>
                )}

                <div className="budget-dates">
                  {formatDate(budget.start_date)} — {formatDate(budget.end_date)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Anggaran' : 'Tambah Anggaran'} onClose={() => setShowModal(false)}>
          <div className="form-row">
            <div className="form-group">
              <label>Kategori (opsional)</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Semua Kategori</option>
                {categories.filter(c => c.type === 'expense').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Periode</label>
              <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                {PERIODS.map(p => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Jumlah Anggaran (Rp)</label>
            <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tanggal Mulai</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tanggal Akhir</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
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
    </div>
  );
}
