'use client';

import { useState, useEffect } from 'react';
import { XIcon, UserIcon, MailIcon, LockIcon, CalendarIcon, PhoneIcon, MapPinIcon, CreditCardIcon, CameraIcon } from 'lucide-react';
import { authAPI, User } from '@/lib/api/auth';

interface EnhancedCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

interface CreateUserForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mobile_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  aadhar_number: string;
  pan_number: string;
  role: string;
  profile_pic: File | null;
  date_of_joining: string;
}

export default function EnhancedCreateUserModal({ isOpen, onClose, onUserCreated }: EnhancedCreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [roleChoices, setRoleChoices] = useState<Array<{value: string, label: string}>>([]);
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    mobile_number: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    aadhar_number: '',
    pan_number: '',
    role: '',
    profile_pic: null,
    date_of_joining: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadRoleChoices();
    }
  }, [isOpen]);

  const loadRoleChoices = async () => {
    try {
      const roles = await authAPI.getRoleChoices();
      // Filter out client role for staff management
      const staffRoles = roles.filter(role => role.value !== 'client');
      setRoleChoices(staffRoles);
    } catch (error) {
      console.error('Failed to load role choices:', error);
      // Fallback to empty array if API fails
      setRoleChoices([]);
    }
  };

  const validateEmail = async (email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    
    try {
      const emailCheck = await authAPI.checkEmailExists(email);
      if (emailCheck.exists) {
        setEmailError('Email already exists. Please use a different email address.');
        return false;
      } else {
        setEmailError('');
        return true;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('Error checking email availability');
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear email error when user starts typing
    if (name === 'email' && emailError) {
      setEmailError('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      profile_pic: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.role) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Check if email already exists
      const isEmailValid = await validateEmail(formData.email);
      if (!isEmailValid) {
        setLoading(false);
        return;
      }
      
      const userData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth || undefined,
        mobile_number: formData.mobile_number,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
        aadhar_number: formData.aadhar_number,
        role: formData.role,
        date_of_joining: formData.date_of_joining || undefined
      };

      await authAPI.createUser(userData);
      onUserCreated();
      onClose();
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        mobile_number: '',
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        aadhar_number: '',
        pan_number: '',
        role: '',
        profile_pic: null,
        date_of_joining: ''
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Staff User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <UserIcon size={20} className="mr-2" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <MailIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => validateEmail(formData.email)}
                    required
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="user@example.com"
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <CalendarIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <PhoneIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <MapPinIcon size={20} className="mr-2" />
              Address Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Country"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                />
              </div>
            </div>
          </div>

          {/* Identity Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCardIcon size={20} className="mr-2" />
              Identity Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  name="aadhar_number"
                  value={formData.aadhar_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456789012"
                  maxLength={12}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  {roleChoices.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Joining
                </label>
                <div className="relative">
                  <CalendarIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="date_of_joining"
                    value={formData.date_of_joining}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Picture */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CameraIcon size={20} className="mr-2" />
              Profile Picture
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.profile_pic && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {formData.profile_pic.name}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
