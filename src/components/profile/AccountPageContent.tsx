"use client";
import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, Phone, Mail, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { fetchAPI } from '@/lib/api';
import { useUpload } from '@/hooks/useUpload';
import { getInitial } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import PhoneVerificationModal from '@/components/ui/PhoneVerificationModal';
import EmailVerificationModal from '@/components/ui/EmailVerificationModal';
import ProfileCompletionBanner from '@/components/profile/ProfileCompletionBanner';

interface AccountPageContentProps {
  user: any; // We'll pass the user object from the parent route which already authenticated
}

export default function AccountPageContent({ user }: AccountPageContentProps) {
  const { uploadFile, isUploading } = useUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="text-brand-red border-brand-red hover:bg-brand-error-soft">
            Ubah Profil
          </Button>
        )}
      </div>

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
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Opsional"
                  className="flex-1 min-w-0 p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailModal(true)}
                  className="text-xs border-brand-red text-brand-red hover:bg-brand-error-soft shrink-0"
                >
                  {user.email_verified ? 'Ubah' : 'Verifikasi'}
                </Button>
              </div>
              <p className="text-xs mt-1">
                {user.email_verified ? (
                  <span className="text-brand-success">Email terverifikasi.</span>
                ) : (
                  <span className="text-brand-gray-450">
                    Belum terverifikasi. Verifikasi diperlukan untuk mendaftar sebagai mitra dan menerima kabar pencairan dana.
                  </span>
                )}
              </p>
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
                Nomor diverifikasi lewat OTP WhatsApp agar mitra menghubungi orang yang benar. Login tetap memakai username.
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
              {!user.email_verified && (
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="text-xs font-semibold text-brand-red hover:underline"
                >
                  Verifikasi
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSuccess={() => setShowEmailModal(false)}
        subtitle="Agar kami bisa mengabari kamu"
        reason="Verifikasi email agar kamu menerima kabar penting: hasil pendaftaran mitra, status pencairan dana, dan pemulihan akun."
      />

      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => showToast('Nomor HP berhasil diverifikasi')}
      />
    </>
  );
}
