'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/auth-context';
import { useLoading } from '@/context/loading-context';
import authService from '@/lib/authService';
import { useApiCall } from '@/hooks/useApiCall';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export default function Profile() {
  const { user, getAccessToken } = useAuth();
  const { call, loading: apiLoading, error } = useApiCall();
  const { showLoading, hideLoading } = useLoading();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      const token = getAccessToken();
      if (!token) return;

      showLoading('Loading profile');
      try {
        await call(
          () => authService.getMe(token),
          {
            onSuccess: (data) => {
              setProfile(data);
              setFormData({
                username: data.username || '',
                email: data.email || '',
              });
            },
            onError: (message) => {
              console.error('Failed to load profile:', message);
            },
          }
        );
      } finally {
        hideLoading();
      }
    };

    loadProfile();
  }, [getAccessToken, call, showLoading, hideLoading]);

  // Handle form submission
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const token = getAccessToken();
    if (!token) {
      setIsSaving(false);
      return;
    }

    showLoading('Saving changes');
    try {
      await call(
        () => authService.updateMe(token, formData),
        {
          onSuccess: (data) => {
            setProfile(data);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
          },
          onError: (message) => {
            console.error('Failed to update profile:', message);
          },
        }
      );
    } finally {
      hideLoading();
      setIsSaving(false);
    }
  };

  // Get initials for avatar
  const getInitials = (email: string, username?: string) => {
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (apiLoading) {
    return (
      <MainLayout>
        <PageHeader title="Profile" />
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-600">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <PageHeader title="Profile" />
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-600">Failed to load profile</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Profile" />
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              Profile updated successfully!
            </div>
          )}

          {/* User Avatar and Basic Info */}
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-white text-xl font-semibold">
                {getInitials(profile.email, profile.username)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.username || profile.email}
              </h2>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500 capitalize">
                Role: {profile.role || 'viewer'}
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveChanges} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter your username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-primary-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    username: profile.username || '',
                    email: profile.email || '',
                  })
                }
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}