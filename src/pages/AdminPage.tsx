import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, Ticket, DollarSign, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { AdminStats, AdminEvent } from '../types';
import { adminApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { token, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);

  // Form state
  const [form, setForm] = useState({ title: '', location: '', date: '', price: '', category: 'Concerts', description: '' });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([adminApi.stats(token), adminApi.events(token)]);
      setStats(s);
      setEvents(e);
    } catch {
      toast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Hooks must be called unconditionally — useEffect before guards
  useEffect(() => { loadData(); }, [token, isAdmin]);

  if (!token) return <Navigate to="/login" replace />;

  // 403: authenticated but not admin — don't logout, just show error
  if (token && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <AlertTriangle size={40} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-6">Your account does not have admin permissions. This page is restricted to administrators only.</p>
          <Button variant="primary" onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    );
  }


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    try {
      await adminApi.createEvent({ ...form, price: parseFloat(form.price) }, token);
      toast('Event created successfully', 'success');
      setShowCreate(false);
      setForm({ title: '', location: '', date: '', price: '', category: 'Concerts', description: '' });
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create event', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteEvent(deleteTarget.id, token);
      toast('Event deleted', 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete event', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all';

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1">Administration</p>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)} leftIcon={<Plus size={15} />}>
            New Event
          </Button>
        </div>

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<BarChart3 size={22} className="text-blue-600" />}
              label="Total Events"
              value={String(stats?.events ?? 0)}
              color="bg-blue-50"
            />
            <StatCard
              icon={<Ticket size={22} className="text-emerald-600" />}
              label="Total Bookings"
              value={String(stats?.bookings ?? 0)}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<DollarSign size={22} className="text-[#F84464]" />}
              label="Total Revenue"
              value={`₹${(stats?.revenue ?? 0).toLocaleString('en-IN')}`}
              color="bg-[#F84464]/10"
            />
          </div>
        )}

        {/* Events table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">All Events</h2>
            <p className="text-xs text-slate-400">{events.length} events</p>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No events yet. Create your first event!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map(ev => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{ev.title}</td>
                      <td className="px-6 py-4 text-slate-600">{ev.category}</td>
                      <td className="px-6 py-4 text-slate-500">{ev.location}</td>
                      <td className="px-6 py-4 text-slate-500">{ev.date}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">₹{Number(ev.basePrice).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(ev)}
                          leftIcon={<Trash2 size={13} className="text-red-400" />}
                          className="text-red-500 hover:bg-red-50"
                          aria-label={`Delete ${ev.title}`}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create event modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Event" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label htmlFor="ev-title" className="block text-sm font-semibold text-slate-700 mb-1.5">Event Title <span className="text-red-500">*</span></label>
            <input id="ev-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sunburn Festival 2026" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ev-loc" className="block text-sm font-semibold text-slate-700 mb-1.5">Location <span className="text-red-500">*</span></label>
              <input id="ev-loc" required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Goa" className={inputCls} />
            </div>
            <div>
              <label htmlFor="ev-date" className="block text-sm font-semibold text-slate-700 mb-1.5">Date <span className="text-red-500">*</span></label>
              <input id="ev-date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ev-price" className="block text-sm font-semibold text-slate-700 mb-1.5">Price (₹) <span className="text-red-500">*</span></label>
              <input id="ev-price" type="number" required min="1" step="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1499" className={inputCls} />
            </div>
            <div>
              <label htmlFor="ev-cat" className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
              <select id="ev-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                {['Concerts', 'Sports', 'Comedy', 'Tech Events', 'Music', 'Theatre', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="ev-desc" className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea id="ev-desc" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short event description…" className={inputCls + ' resize-none'} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={creating}>Publish Event</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Event" maxWidth="max-w-sm">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete Event</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
