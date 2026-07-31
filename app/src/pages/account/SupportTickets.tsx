import { useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { contactAPI } from '../../services/api';
import type { ContactMessage } from '../../types';

const SupportTickets = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<ContactMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try { const response = await contactAPI.mine(); setTickets(response.data.data); }
    catch { showToast('Failed to load support tickets', 'error'); }
  };
  useEffect(() => {
    let active = true;
    contactAPI.mine()
      .then((response) => {
        if (active) setTickets(response.data.data);
      })
      .catch(() => showToast('Failed to load support tickets', 'error'));
    return () => { active = false; };
  }, [showToast]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    try {
      await contactAPI.submit({ name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, subject, message });
      setSubject(''); setMessage(''); await load();
      showToast('Support ticket opened', 'success');
    } catch { showToast('Failed to open support ticket', 'error'); }
  };

  return <div>
    <h2 className="text-2xl font-bold text-gray-900">Support tickets</h2>
    <p className="mt-1 text-gray-500">Contact Us and complaints are tracked in this one support queue.</p>
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
      <input aria-label="Subject" required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="w-full rounded-xl border border-gray-200 px-4 py-3" />
      <textarea aria-label="Message" required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" className="min-h-32 w-full rounded-xl border border-gray-200 px-4 py-3" />
      <button className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white">Open ticket</button>
    </form>
    <div className="mt-6 space-y-4">
      {tickets.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500"><LifeBuoy className="mx-auto mb-3" />No tickets yet</div> : tickets.map((ticket) =>
        <article key={ticket.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-gray-900">{ticket.subject}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{ticket.status.replace('_', ' ')}</span></div>
          <p className="mt-3 whitespace-pre-wrap text-gray-600">{ticket.message}</p>
          <p className="mt-3 text-xs text-gray-400">Updated {new Date(ticket.statusUpdatedAt).toLocaleString()}</p>
        </article>)}
    </div>
  </div>;
};

export default SupportTickets;
