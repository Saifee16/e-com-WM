import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface AdminReturn {
  id: string; orderNumber: string; customer: string; email?: string; isGuest: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; reason: string; details?: string;
  resolutionNote?: string; refundConfirmedAt?: string; createdAt: string;
}

const AdminReturns = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<AdminReturn[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const load = async () => { try { const response = await adminAPI.getReturns(); setItems(response.data.data); } catch { showToast('Failed to load returns', 'error'); } };
  useEffect(() => {
    let active = true;
    adminAPI.getReturns()
      .then((response) => {
        if (active) setItems(response.data.data);
      })
      .catch(() => showToast('Failed to load returns', 'error'));
    return () => { active = false; };
  }, [showToast]);

  const resolve = async (item: AdminReturn, status: 'APPROVED' | 'REJECTED') => {
    const resolutionNote = notes[item.id]?.trim() ?? '';
    if (resolutionNote.length < 3) return showToast('Add a resolution note', 'error');
    if (status === 'APPROVED' && !confirmed[item.id]) return showToast('Confirm the manual cash/bank refund first', 'error');
    try {
      await adminAPI.resolveReturn(item.id, { status, resolutionNote, ...(status === 'APPROVED' ? { manualRefundCompleted: true } : {}) });
      await load(); showToast(status === 'APPROVED' ? 'Manual refund recorded' : 'Return rejected', 'success');
    } catch { showToast('Failed to resolve return', 'error'); }
  };

  return <div><h2 className="text-2xl font-bold text-gray-900">Returns & manual refunds</h2><p className="mt-1 text-gray-500">Approval records money already returned outside the system; it does not transfer funds.</p>
    <div className="mt-6 space-y-4">{items.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center text-gray-500"><RotateCcw className="mx-auto mb-3" />No return requests</div> : items.map((item) => <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">{item.orderNumber}</h3><span className="rounded bg-gray-100 px-2 py-1 text-xs">{item.status}</span>{item.isGuest && <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Guest submission</span>}</div>
      <p className="mt-2 text-sm text-gray-500">{item.customer} · {item.email ?? 'No email'}</p><p className="mt-4 text-gray-800">{item.reason}</p>{item.details && <p className="mt-2 text-gray-600">{item.details}</p>}
      {item.status === 'PENDING' ? <div className="mt-5 space-y-3"><textarea aria-label={`Resolution for ${item.orderNumber}`} value={notes[item.id] ?? ''} onChange={(event) => setNotes((value) => ({ ...value, [item.id]: event.target.value }))} placeholder="Resolution note" className="min-h-24 w-full rounded-xl border border-gray-200 px-4 py-3" />
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={confirmed[item.id] ?? false} onChange={(event) => setConfirmed((value) => ({ ...value, [item.id]: event.target.checked }))} />Cash/bank refund has actually been completed</label>
        <div className="flex gap-3"><button onClick={() => resolve(item, 'APPROVED')} className="rounded-lg bg-green-600 px-4 py-2 text-white">Record refunded</button><button onClick={() => resolve(item, 'REJECTED')} className="rounded-lg border border-red-200 px-4 py-2 text-red-700">Reject</button></div></div> : <p className="mt-4 text-sm text-gray-500">{item.resolutionNote}{item.refundConfirmedAt ? ` · Manual refund confirmed ${new Date(item.refundConfirmedAt).toLocaleString()}` : ''}</p>}
    </article>)}</div></div>;
};

export default AdminReturns;
