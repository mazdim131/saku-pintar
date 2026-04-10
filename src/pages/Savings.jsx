import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatRupiah, formatDate, formatDateInput } from '../utils/format';
import Modal from '../components/Modal';

const EMPTY_FORM = { name: '', target_amount: '', deadline: '' };

export default function Savings() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(null); // goal id
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fundAmount, setFundAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchGoals = async () => {
    try {
      const data = await api.getSavingGoals();
      setGoals(data);
    } catch (e) { 
      console.error('Error fetching goals:', e);
      setError('Gagal memuat data. Silakan refresh halaman.');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditItem(goal);
    setForm({
      name: goal.name,
      target_amount: goal.target_amount,
      deadline: formatDateInput(goal.deadline),
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.name.trim()) {
      setError('Nama target wajib diisi');
      return;
    }
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      setError('Target jumlah harus lebih dari 0');
      return;
    }
    if (!form.deadline) {
      setError('Deadline wajib dipilih');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        await api.updateSavingGoal(editItem.id, form);
      } else {
        await api.createSavingGoal(form);
      }
      setShowModal(false);
      fetchGoals();
    } catch (e) { 
      console.error('Error submitting saving goal:', e);
      setError(e.message); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus target tabungan ini?')) return;
    try {
      await api.deleteSavingGoal(id);
      fetchGoals();
    } catch (e) { alert(e.message); }
  };

  const handleAddFunds = async () => {
    if (!fundAmount || fundAmount <= 0) return;
    try {
      await api.addFundsToGoal(showFundModal, { amount: parseFloat(fundAmount) });
      setShowFundModal(null);
      setFundAmount('');
      fetchGoals();
    } catch (e) { alert(e.message); }
  };

  const getDaysLeft = (deadline) => {
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Target Tabungan</h2>
          <p className="page-subtitle">Wujudkan impianmu satu per satu</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Tambah Target</button>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>Belum ada target tabungan</p>
            <button className="btn-primary" onClick={openAdd}>Buat Target Pertama</button>
          </div>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map(goal => {
            const pct = Math.min((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100, 100);
            const daysLeft = getDaysLeft(goal.deadline);
            const isDone = pct >= 100;
            return (
              <div key={goal.id} className={`goal-card ${isDone ? 'done' : ''}`}>
                <div className="goal-card-header">
                  <div className="goal-emoji">{isDone ? '🏆' : '🎯'}</div>
                  <div className="goal-card-actions">
                    <button className="icon-btn edit" onClick={() => openEdit(goal)} title="Edit">✏️</button>
                    <button className="icon-btn delete" onClick={() => handleDelete(goal.id)} title="Hapus">🗑️</button>
                  </div>
                </div>
                <h3 className="goal-card-name">{goal.name}</h3>
                <div className="goal-progress-wrap">
                  <div className="progress-bar large">
                    <div
                      className={`progress-fill ${isDone ? 'done' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="goal-pct-label">{Math.round(pct)}%</span>
                </div>
                <div className="goal-amounts">
                  <div>
                    <div className="goal-amount-label">Terkumpul</div>
                    <div className="goal-amount-value income">{formatRupiah(goal.current_amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="goal-amount-label">Target</div>
                    <div className="goal-amount-value">{formatRupiah(goal.target_amount)}</div>
                  </div>
                </div>
                <div className="goal-deadline">
                  <span>📅 {formatDate(goal.deadline)}</span>
                  <span className={`days-left ${daysLeft < 0 ? 'overdue' : daysLeft < 30 ? 'urgent' : ''}`}>
                    {daysLeft < 0 ? 'Lewat deadline' : daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`}
                  </span>
                </div>
                {!isDone && (
                  <button className="btn-primary full-width" onClick={() => { setShowFundModal(goal.id); setFundAmount(''); }}>
                    + Tambah Dana
                  </button>
                )}
                {isDone && <div className="goal-done-badge">✅ Tercapai!</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'} onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Nama Target</label>
            <input type="text" placeholder="Liburan ke Bali, Laptop baru, dll..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Target Jumlah (Rp)</label>
              <input type="number" placeholder="0" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
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

      {/* Add Funds Modal */}
      {showFundModal && (
        <Modal title="Tambah Dana Tabungan" onClose={() => setShowFundModal(null)}>
          <div className="form-group">
            <label>Jumlah Dana (Rp)</label>
            <input type="number" placeholder="0" value={fundAmount} onChange={e => setFundAmount(e.target.value)} autoFocus />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowFundModal(null)}>Batal</button>
            <button className="btn-primary" onClick={handleAddFunds}>Tambah</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
