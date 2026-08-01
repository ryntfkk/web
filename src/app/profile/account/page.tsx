"use client";
import { useToast } from '@/components/ui/toast';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, Phone, Mail, Loader2, Camera } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { fetchAPI } from '@/lib/api';
import { useUpload } from '@/hooks/useUpload';
import { getInitial } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import ProfileCompletionBanner from '@/components/profile/ProfileCompletionBanner';

export default function AccountPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const { uploadFile, isUploading } = useUpload();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when entering edit mode
  const handleEdit = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email || '');
      setError('');
      setIsEditing(true);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama tidak boleh kosong');
      return;
    }

    setSaving(true);
    setError('');

    // `phone` SENGAJA tidak dikirim. Nomor hanya berubah lewat OTP; dulu form ini
    // mewajibkan nomor untuk SETIAP simpan, sehingga user Google (yang belum
    // punya nomor) tidak bisa sekadar mengganti namanya.
    const res = await fetchAPI('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, email: email || null }),
    });

    setSaving(false);

    if (res.success) {
      showToast('Profil berhasil diperbarui');
      setIsEditing(false);
      useAuthStore.getState().updateUser({ name, email });
    } else {
      setError(res.message || 'Gagal memperbarui profil');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 5MB', 'error');
      return;
    }

    const fileUrl = await uploadFile(file);
    if (fileUrl) {
      // Save new avatar to backend
      const res = await fetchAPI('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: fileUrl }),
      });
      
      if (res.success) {
        showToast('Foto profil berhasil diperbarui');
        useAuthStore.getState().updateUser({ avatar_url: fileUrl });
      } else {
        showToast(res.message || 'Gagal memperbarui foto profil', 'error');
      }
    } else {
      showToast('Gagal mengupload foto', 'error');
    }
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  if (!isAuthorized || !user) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10 relative">

      <MobilePageHeader title="Informasi Akun" backHref="/profile" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="hidden lg:block text-2xl font-bold text-brand-gray-900">Informasi Akun</h1>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit} className="text-brand-red border-brand-red hover:bg-brand-error-soft">
              Ubah Profil
            </Button>
          )}
        </div>

        {/* Avatar Section */}
        <div className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden mb-4 p-6 text-center">
          <div className="relative inline-block mx-auto mb-4">
            <div className="relative w-24 h-24 rounded-full bg-brand-gray-60 flex items-center justify-center text-3xl font-bold text-brand-red overflow-hidden border-2 border-brand-gray-100">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt="Avatar" fill sizes="96px" className="object-cover" />
              ) : (
                getInitial(user.name)
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-brand-red text-white rounded-full hover:bg-brand-red-dark transition-colors border-2 border-white shadow-sm disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/png,image/jpg" 
              className="hidden" 
            />
          </div>
          <p className="text-sm font-medium text-brand-gray-900">{user.name}</p>
          <p className="text-xs text-brand-gray-400">{user.phone || 'Nomor HP belum diisi'}</p>
        </div>

        {!user.profile_complete && (
          <div className="mb-4">
            <ProfileCompletionBanner onVerify={() => setShowPhoneModal(true)} />
          </div>
        )}

        {/* Info / Edit Section */}
        <div className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden">
          <div className="p-4 border-b border-brand-gray-100">
            <h3 className="font-semibold text-brand-gray-800">Detail Akun</h3>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Opsional"
                  className="w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-gray-900 mb-1">Nomor HP</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-400 bg-brand-gray-60">
                    {user.phone || 'Belum diisi'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPhoneModal(true)}
                    className="text-xs border-brand-red text-brand-red hover:bg-brand-error-soft"
                  >
                    {user.phone ? 'Ubah' : 'Verifikasi'}
                  </Button>
                </div>
                <p className="text-xs text-brand-gray-450 mt-1">
                  Nomor diverifikasi lewat OTP WhatsApp agar mitra menghubungi orang yang benar.
                  Login tetap memakai username.
                </p>
              </div>

              {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} type="button">
                  Batal
                </Button>
                <Button className="flex-1 bg-brand-red hover:bg-brand-red-dark" type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-brand-gray-100">
              <div className="w-full flex items-center p-4 text-left">
                <User className="w-5 h-5 text-brand-gray-400 mr-3" />
                <div className="flex-1">
                  <span className="text-brand-gray-800 font-medium block text-sm">Nama Lengkap</span>
                  <span className="text-sm text-brand-gray-400">{user.name}</span>
                </div>
              </div>
              <div className="w-full flex items-center p-4 text-left">
                <Phone className="w-5 h-5 text-brand-gray-400 mr-3" />
                <div className="flex-1">
                  <span className="text-brand-gray-800 font-medium block text-sm">Nomor HP</span>
                  <span className="text-sm text-brand-gray-400">{user.phone || 'Belum diisi'}</span>
                </div>
                {!user.phone_verified && (
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="text-xs font-semibold text-brand-red hover:underline"
                  >
                    Verifikasi
                  </button>
                )}
              </div>
              <div className="w-full flex items-center p-4 text-left">
                <Mail className="w-5 h-5 text-brand-gray-400 mr-3" />
                <div className="flex-1">
                  <span className="text-brand-gray-800 font-medium block text-sm">Email</span>
                  <span className="text-sm text-brand-gray-400">{user.email || 'Belum diisi'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => showToast('Nomor HP berhasil diverifikasi')}
      />
    </div>
  );
}
