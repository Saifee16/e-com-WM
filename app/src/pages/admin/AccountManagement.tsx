import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, KeyRound, LoaderCircle, Plus, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { adminAPI, type AdminAccount } from '../../services/api';
import { getApiErrorMessage } from '../../utils/api-error';
import { formatDate } from '../../utils/format';

type AccountForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AdminAccount['role'];
  status: AdminAccount['status'];
  password: string;
  requirePasswordChange: boolean;
};

const emptyForm: AccountForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'ADMIN',
  status: 'ACTIVE',
  password: '',
  requirePasswordChange: false,
};

const formFor = (account: AdminAccount): AccountForm => ({
  ...emptyForm,
  firstName: account.firstName,
  lastName: account.lastName,
  email: account.email,
  phone: account.phone ?? '',
  role: account.role,
  status: account.status,
});

const AccountManagement = () => {
  const { adminUser } = useAdminAuth();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [resetting, setResetting] = useState<AdminAccount | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAdminAccounts({ search: search.trim() || undefined });
      setAccounts(response.data.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load administrator accounts.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    if (adminUser?.role === 'SUPER_ADMIN') void loadAccounts();
    else setIsLoading(false);
  }, [adminUser?.role, loadAccounts]);

  if (adminUser?.role !== 'SUPER_ADMIN') {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">Super Admin access is required for account management.</div>;
  }

  const closeModal = (force = false) => {
    if (!isSaving || force) {
      setEditing(null);
      setResetting(null);
      setIsCreating(false);
      setForm(emptyForm);
    }
  };

  const createAccount = async () => {
    try {
      setIsSaving(true);
      await adminAPI.createAdminAccount({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone.trim() || null,
        role: form.role,
        password: form.password,
        requirePasswordChange: form.requirePasswordChange,
      });
      showToast('Administrator account created', 'success');
      closeModal(true);
      await loadAccounts();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Administrator account could not be created.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAccount = async () => {
    if (!editing) return;
    try {
      setIsSaving(true);
      await adminAPI.updateAdminAccount(editing.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone.trim() || null,
        role: form.role,
        status: form.status,
      });
      showToast('Administrator account updated', 'success');
      closeModal(true);
      await loadAccounts();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Administrator account could not be updated.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!resetting) return;
    try {
      setIsSaving(true);
      await adminAPI.resetAdminAccountPassword(resetting.id, {
        password: form.password,
        requirePasswordChange: form.requirePasswordChange,
      });
      showToast('Password replaced and existing sessions revoked', 'success');
      closeModal(true);
      await loadAccounts();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Password could not be reset.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const revokeSessions = async (account: AdminAccount) => {
    try {
      await adminAPI.revokeAdminAccountSessions(account.id);
      showToast('Sessions revoked', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Sessions could not be revoked.'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Admin account management</h2>
          <p className="text-sm text-slate-500">Manage Admin and Super Admin access. Passwords are never viewable.</p>
        </div>
        <button type="button" onClick={() => { setForm({ ...emptyForm }); setEditing(null); setResetting(null); setIsCreating(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" aria-hidden="true" /> Create Admin account
        </button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
        <button type="button" onClick={() => void loadAccounts()} className="rounded-xl border border-slate-200 px-4 text-slate-600 hover:bg-slate-50" aria-label="Refresh accounts"><RefreshCw className="h-5 w-5" /></button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {isLoading ? <div className="p-12 text-center text-slate-500"><LoaderCircle className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-700" />Loading accounts…</div> : (
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50"><tr>{['Account', 'Role', 'Status', 'Last login', 'Created', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4 text-left text-sm font-medium text-slate-500">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserRound className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{account.firstName} {account.lastName}</p><p className="text-sm text-slate-500">{account.email}</p></div></div></td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><ShieldCheck className="h-4 w-4 text-purple-600" />{account.role.replace('_', ' ')}</span>{account.mustChangePassword && <p className="mt-1 text-xs text-amber-700">Password change required</p>}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${account.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{account.status === 'BLOCKED' ? 'Suspended' : 'Active'}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatDate(account.createdAt)}</td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => { setEditing(account); setResetting(null); setIsCreating(false); setForm(formFor(account)); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</button><button type="button" onClick={() => { setResetting(account); setEditing(null); setIsCreating(false); setForm({ ...emptyForm, password: '' }); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={`Reset password for ${account.email}`}><KeyRound className="h-4 w-4" /></button><button type="button" onClick={() => void revokeSessions(account)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={`Revoke sessions for ${account.email}`}><Ban className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && accounts.length === 0 && <p className="p-8 text-center text-slate-500">No administrator accounts found.</p>}
      </div>

      {(editing || resetting || isCreating) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => closeModal()}><div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-6"><div><h3 className="text-xl font-bold text-slate-950">{resetting ? 'Reset password' : editing ? 'Edit admin account' : 'Create admin account'}</h3><p className="mt-1 text-xs text-slate-500">Passwords are hashed immediately and never returned.</p></div><button type="button" onClick={() => closeModal()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-4 p-6">
          {!resetting && <><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} /><Field label="Last name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} /></div><Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><div className="grid gap-4 sm:grid-cols-2"><SelectField label="Role" value={form.role} options={['ADMIN', 'SUPER_ADMIN']} onChange={(value) => setForm({ ...form, role: value as AccountForm['role'] })} disabled={editing?.id === adminUser.id} />{editing ? <SelectField label="Status" value={form.status} options={['ACTIVE', 'BLOCKED']} onChange={(value) => setForm({ ...form, status: value as AccountForm['status'] })} disabled={editing.id === adminUser.id} /> : <div />}</div></>}
          {!editing && <><Field label={resetting ? 'New strong password' : 'Password'} type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required /><label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.requirePasswordChange} onChange={(event) => setForm({ ...form, requirePasswordChange: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-700" />Require password change on next login</label><p className="text-xs text-slate-500">Use at least 12 characters with upper/lowercase letters, a number, and a special character.</p></>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 p-6"><button type="button" onClick={() => closeModal()} className="px-4 py-2 text-slate-600" disabled={isSaving}>Cancel</button><button type="button" onClick={() => void (resetting ? resetPassword() : editing ? saveAccount() : createAccount())} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{resetting ? 'Replace password' : editing ? 'Save changes' : 'Create account'}<Check className="h-4 w-4" /></button></div>
      </div></div>}
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => <label className="block text-sm font-medium text-slate-700">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600" /></label>;
const SelectField = ({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) => <label className="block text-sm font-medium text-slate-700">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100">{options.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}</select></label>;

export default AccountManagement;
