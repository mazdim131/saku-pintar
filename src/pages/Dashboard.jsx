import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { formatRupiah, formatDate } from '../utils/format';
import Modal from '../components/Modal';

export default function Dashboard({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [savingGoals, setSavingGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInput, setLimitInput] = useState(user?.limit || 0);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tx, bs, sg] = await Promise.all([
          api.getTransactions(),
          api.getBudgetStatus(),
          api.getSavingGoals(),
        ]);
        setTransactions(tx);
        setBudgetStatus(bs);
        setSavingGoals(sg);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    const handleRefresh = () => fetchAll();
    window.addEventListener('refreshDashboard', handleRefresh);
    return () => window.removeEventListener('refreshDashboard', handleRefresh);
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const limit = parseFloat(user?.limit || 0);
  const limitUsed = limit > 0 ? Math.min((totalExpense / limit) * 100, 100) : 0;

  const recentTx = transactions.slice(0, 5);

  const handleSaveLimit = async () => {
    try {
      const result = await api.updateProfile({ limit: parseFloat(limitInput) });
      updateUser(result.user);
      setShowLimitModal(false);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div></div>;

  const exceededBudgets = budgetStatus.filter(b => b.is_exceeded);
  const nearBudgets = budgetStatus.filter(b => !b.is_exceeded && (b.total_spent / b.amount) > 0.8);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Halo, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="page-subtitle">Berikut ringkasan keuangan kamu hari ini</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-balance">
          <div className="stat-label">Total Saldo</div>
          <div className="stat-value">{formatRupiah(balance)}</div>
          <div className="stat-meta">Saldo terkini</div>
        </div>
        <div className="stat-card stat-income">
          <div className="stat-label">Total Pemasukan</div>
          <div className="stat-value income">{formatRupiah(totalIncome)}</div>
          <div className="stat-meta">{transactions.filter(t => t.type === 'income').length} transaksi</div>
        </div>
        <div className="stat-card stat-expense">
          <div className="stat-label">Total Pengeluaran</div>
          <div className="stat-value expense">{formatRupiah(totalExpense)}</div>
          <div className="stat-meta">{transactions.filter(t => t.type === 'expense').length} transaksi</div>
        </div>
        <div className="stat-card stat-limit" onClick={() => { setLimitInput(limit); setShowLimitModal(true); }} style={{cursor:'pointer'}}>
          <div className="stat-label">Limit Pengeluaran</div>
          <div className="stat-value">{limit > 0 ? formatRupiah(limit) : 'Belum diset'}</div>
          {limit > 0 && (
            <div className="limit-bar-wrap">
              <div className="limit-bar">
                <div
                  className={`limit-fill ${limitUsed >= 100 ? 'danger' : limitUsed >= 80 ? 'warning' : ''}`}
                  style={{ width: `${limitUsed}%` }}
                />
              </div>
              <span className="limit-pct">{Math.round(limitUsed)}%</span>
            </div>
          )}
          <div className="stat-meta">Klik untuk ubah limit</div>
        </div>
      </div>

      {/* Alerts */}
      {(exceededBudgets.length > 0 || nearBudgets.length > 0) && (
        <div className="alert-section">
          {exceededBudgets.map(b => (
            <div key={b.id} className="alert alert-danger">
              ⚠️ Anggaran <strong>{b.category_name || 'Umum'}</strong> sudah melebihi limit! (Terpakai: {formatRupiah(b.total_spent)} / {formatRupiah(b.amount)})
            </div>
          ))}
          {nearBudgets.map(b => (
            <div key={b.id} className="alert alert-warning">
              🔔 Anggaran <strong>{b.category_name || 'Umum'}</strong> hampir habis ({Math.round((b.total_spent / b.amount) * 100)}%)
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h3>Transaksi Terakhir</h3>
            <button className="btn-link" onClick={() => onNavigate('transactions')}>Lihat semua →</button>
          </div>
          {recentTx.length === 0 ? (
            <div className="empty-state">Belum ada transaksi</div>
          ) : (
            <div className="tx-list">
              {recentTx.map(tx => (
                <div key={tx.id} className="tx-item">
                  <div className={`tx-dot ${tx.type}`}></div>
                  <div className="tx-info">
                    <div className="tx-note">{tx.note || tx.category_name}</div>
                    <div className="tx-date">{formatDate(tx.transaction_date)}</div>
                  </div>
                  <div className={`tx-amount ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saving Goals */}
        <div className="card">
          <div className="card-header">
            <h3>Target Tabungan</h3>
            <button className="btn-link" onClick={() => onNavigate('savings')}>Lihat semua →</button>
          </div>
          {savingGoals.length === 0 ? (
            <div className="empty-state">Belum ada target tabungan</div>
          ) : (
            <div className="goals-list">
              {savingGoals.slice(0, 3).map(g => {
                const pct = Math.min((parseFloat(g.current_amount) / parseFloat(g.target_amount)) * 100, 100);
                return (
                  <div key={g.id} className="goal-item">
                    <div className="goal-header">
                      <span className="goal-name">{g.name}</span>
                      <span className="goal-pct">{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="goal-amounts">
                      <span>{formatRupiah(g.current_amount)}</span>
                      <span>{formatRupiah(g.target_amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showLimitModal && (
        <Modal title="Set Limit Pengeluaran" onClose={() => setShowLimitModal(false)}>
          <div className="form-group">
            <label>Limit Pengeluaran (Rp)</label>
            <input
              type="number"
              value={limitInput}
              onChange={e => setLimitInput(e.target.value)}
              placeholder="Contoh: 5000000"
            />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowLimitModal(false)}>Batal</button>
            <button className="btn-primary" onClick={handleSaveLimit}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
