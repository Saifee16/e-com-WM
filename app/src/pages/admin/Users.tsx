import { useState } from 'react';
import {
  Search,
  Shield,
  User as UserIcon,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatDate } from '../../utils/format';

interface AdminUserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isAdmin: boolean;
  createdAt: string;
  orders: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([
    { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+92 300 1234567', isAdmin: false, createdAt: '2025-01-15', orders: 5 },
    { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+92 300 7654321', isAdmin: false, createdAt: '2025-01-20', orders: 3 },
    { _id: '3', firstName: 'Wahab', lastName: 'Ahmad', email: 'wahab@example.com', phone: '+92 300 1111111', isAdmin: true, createdAt: '2024-12-01', orders: 0 },
    { _id: '4', firstName: 'Ali', lastName: 'Khan', email: 'ali@example.com', phone: '+92 300 2222222', isAdmin: false, createdAt: '2025-02-01', orders: 2 },
    { _id: '5', firstName: 'Sarah', lastName: 'Ahmed', email: 'sarah@example.com', phone: '+92 300 3333333', isAdmin: false, createdAt: '2025-02-05', orders: 1 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAdmin = (userId: string) => {
    setUsers(users.map((u) => (u._id === userId ? { ...u, isAdmin: !u.isAdmin } : u)));
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter((u) => u._id !== userId));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-gray-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-gray-500 text-sm">Admins</p>
          <p className="text-2xl font-bold text-blue-600">{users.filter((u) => u.isAdmin).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-gray-500 text-sm">New This Month</p>
          <p className="text-2xl font-bold text-green-600">{users.filter((u) => new Date(u.createdAt).getMonth() === new Date().getMonth()).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Contact</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Orders</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Joined</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-blue-600">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500">{user.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleAdmin(user._id)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      user.isAdmin
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {user.isAdmin ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    {user.isAdmin ? 'Admin' : 'User'}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-600">{user.orders}</td>
                <td className="px-6 py-4 text-gray-600">{formatDate(user.createdAt)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteUser(user._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
