import { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import type { ContactMessage } from '../../types';
import { adminAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const ContactMessages = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const loadMessages = async () => {
    try {
      const response = await adminAPI.getContactMessages();
      setMessages(response.data.data);
    } catch {
      showToast('Failed to load contact messages', 'error');
    }
  };

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: ContactMessage['status']) => {
    try {
      await adminAPI.updateContactMessage(id, status);
      await loadMessages();
      showToast('Message updated', 'success');
    } catch {
      showToast('Failed to update message', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contact Messages</h2>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
            <MailCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No contact messages yet
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                      {message.status}
                    </span>
                    {message.isGuest && <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium">Guest submission</span>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {message.name} · {message.email} · {new Date(message.createdAt).toLocaleString()}
                  </p>
                  <p className="text-gray-700 mt-4 whitespace-pre-wrap">{message.message}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(message.id, 'IN_PROGRESS')}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    In progress
                  </button>
                  <button
                    onClick={() => updateStatus(message.id, 'RESOLVED')}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactMessages;
