import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { addressesAPI } from '../../services/api';
import type { SavedAddress as ApiAddress } from '../../services/api';

interface SavedAddress {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

type AddressFormData = Omit<SavedAddress, '_id'>;

const emptyAddressForm: AddressFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Pakistan',
  isDefault: false,
};

const Addresses = () => {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(emptyAddressForm);

  const fromApi = (address: ApiAddress): SavedAddress => {
    const [firstName = '', ...lastName] = address.fullName.split(' ');
    return {
      _id: address.id,
      firstName,
      lastName: lastName.join(' '),
      phone: address.phone,
      street: address.line1,
      city: address.city,
      state: address.state,
      zipCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefaultShipping,
    };
  };

  const loadAddresses = async () => {
    try {
      const response = await addressesAPI.get();
      setAddresses(response.data.data.map(fromApi));
    } catch {
      showToast('Failed to load addresses', 'error');
    }
  };

  useEffect(() => {
    let active = true;
    addressesAPI.get()
      .then((response) => {
        if (active) setAddresses(response.data.data.map(fromApi));
      })
      .catch(() => showToast('Failed to load addresses', 'error'));
    return () => { active = false; };
  }, [showToast]);

  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData(emptyAddressForm);
    setIsEditing(true);
  };

  const handleEdit = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormData({
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await addressesAPI.remove(id);
      await loadAddresses();
      showToast('Address deleted', 'success');
    } catch {
      showToast('Failed to delete address', 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressesAPI.update(id, { isDefaultShipping: true, isDefaultBilling: true });
      await loadAddresses();
      showToast('Default address updated', 'success');
    } catch {
      showToast('Failed to update default address', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phone,
      line1: formData.street,
      city: formData.city,
      state: formData.state,
      postalCode: formData.zipCode,
      country: formData.country,
      isDefaultShipping: formData.isDefault,
      isDefaultBilling: formData.isDefault,
    };
    try {
      if (editingAddress) {
        await addressesAPI.update(editingAddress._id, payload);
        showToast('Address updated', 'success');
      } else {
        await addressesAPI.create(payload);
        showToast('Address added', 'success');
      }
      await loadAddresses();
      setIsEditing(false);
    } catch {
      showToast('Failed to save address', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Addresses</h2>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No addresses saved</h3>
          <p className="text-gray-500 mb-6">Add an address to make checkout faster</p>
          <button
            onClick={handleAddNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {addresses.map((address, index) => (
            <motion.div
              key={address._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-2xl border p-6 ${
                address.isDefault ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {address.firstName} {address.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{address.phone}</p>
                  </div>
                </div>
                {address.isDefault && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                    Default
                  </span>
                )}
              </div>

              <div className="text-gray-600 mb-4">
                <p>{address.street}</p>
                <p>
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p>{address.country}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleEdit(address)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address._id)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address._id)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 text-sm font-medium hover:bg-blue-50 rounded-xl transition-colors ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    Set Default
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Set as default address</span>
                </label>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    {editingAddress ? 'Update Address' : 'Add Address'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Addresses;
