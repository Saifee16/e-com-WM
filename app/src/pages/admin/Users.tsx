import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, LoaderCircle, Search, Shield, User as UserIcon, X } from 'lucide-react';
import { adminAPI } from '../../services/api';
import type { AdminUser } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatDate } from '../../utils/format';

type UserForm = Pick<AdminUser, 'firstName' | 'lastName' | 'email' | 'phone'>;

const formFor = (user: AdminUser): UserForm => ({
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone ?? '',
});

const AdminUsers = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminAPI.getUsers();
        if (active) setUsers(response.data.data);
      } catch (loadError) {
        if (active) setError(getApiErrorMessage(loadError, 'Unable to load users.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadUsers();
    return () => { active = false; };
  }, [reloadVersion]);

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || [user.firstName, user.lastName, user.email, user.id].some((value) => value.toLowerCase().includes(query));
  });

  const openEditor = (user: AdminUser) => {
    setEditingUser(user);
    setForm(formFor(user));
  };

  const saveUser = async () => {
    if (!editingUser || !form) return;
    try {
      setIsSaving(true);
      const response = await adminAPI.updateUser(editingUser.id, {
        ...form,
        phone: form.phone?.trim() || null,
      });
      const updated = response.data.data;
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      showToast('User details updated', 'success');
      setEditingUser(null);
      setForm(null);
    } catch (saveError) {
      showToast(getApiErrorMessage(saveError, 'User could not be updated.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const newThisMonth = users.filter((user) => {
    const date = new Date(user.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">Edit customer identity and contact details. Administrator accounts are managed separately by Super Admins.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search name, email, or ID..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Total Customers" value={users.length} color="text-gray-900" />
        <Stat label="Active Customers" value={users.filter((user) => user.status === 'ACTIVE').length} color="text-blue-600" />
        <Stat label="New This Month" value={newThisMonth} color="text-green-600" />
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <Failure message={error} onRetry={() => setReloadVersion((version) => version + 1)} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50"><tr>
              {['User', 'Contact', 'Account ID', 'Role & Access', 'Orders', 'Joined', 'Actions'].map((heading) => <th key={heading} className="text-left px-6 py-4 text-sm font-medium text-gray-500">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-medium text-blue-600">{user.firstName[0]}{user.lastName[0]}</div><p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p></div></td>
                  <td className="px-6 py-4"><p className="text-gray-700">{user.email}</p><p className="text-sm text-gray-500">{user.phone || 'No phone saved'}</p></td>
                  <td className="px-6 py-4"><code className="text-xs text-gray-500">{user.id}</code></td>
                  <td className="px-6 py-4"><p className="flex items-center gap-2 text-sm text-gray-700">{user.role === 'CUSTOMER' ? <UserIcon className="w-4 h-4" /> : <Shield className="w-4 h-4 text-purple-600" />}{user.role.replace('_', ' ')}</p><span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.status.toLowerCase()}</span></td>
                  <td className="px-6 py-4 text-gray-600">{user.orders}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4"><button type="button" onClick={() => openEditor(user)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" aria-label={`Edit ${user.email}`}><Edit2 className="w-5 h-5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && <p className="p-8 text-center text-gray-500">No matching users found.</p>}
        </div>
      )}

      {editingUser && form && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !isSaving && setEditingUser(null)}>
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between"><div><h3 className="text-xl font-bold">Edit user</h3><p className="text-xs text-gray-500 mt-1">ID: {editingUser.id}</p></div><button type="button" onClick={() => setEditingUser(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4"><Field label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} /><Field label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} /></div>
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone" value={form.phone ?? ''} onChange={(value) => setForm({ ...form, phone: value })} />
            </div>
            <div className="p-6 border-t flex justify-end gap-3"><button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600" disabled={isSaving}>Cancel</button><button type="button" onClick={() => void saveUser()} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50">{isSaving ? 'Saving…' : 'Save changes'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-gray-500 text-sm">{label}</p><p className={`text-2xl font-bold ${color}`}>{value}</p></div>;
const Loading = () => <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><LoaderCircle className="w-9 h-9 text-blue-600 animate-spin mx-auto mb-3" /><p className="text-gray-500">Loading users…</p></div>;
const Failure = ({ message, onRetry }: { message: string; onRetry: () => void }) => <div className="bg-white rounded-2xl border border-red-200 p-12 text-center"><AlertCircle className="w-9 h-9 text-red-500 mx-auto mb-3" /><p className="text-gray-600 mb-4">{message}</p><button type="button" onClick={onRetry} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Try again</button></div>;
const Field = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <label className="block text-sm font-medium text-gray-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></label>;
export default AdminUsers;
