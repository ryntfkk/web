"use client";
import { useToast } from '@/components/ui/toast';

import { useState, useRef } from 'react';
import { User, Phone, Mail, Loader2, Camera } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useUpload } from '@/hooks/useUpload';
import { getInitial } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';

export default function AccountPage() {
  const { isLoading: authLoading, isAuthorized, user } = useRequireAuth();
  const { uploadFile, isUploading } = useUpload();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

    const res = await fetchAPI('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, email: email || null }),
    });

    setSaving(false);

    if (res.success) {
      showToast('Profil berhasil diperbarui');
      setIsEditing(false);
      // Update user object di authStore (nama/email berubah)
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

  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized || !user) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24 relative">

      <MobilePageHeader title="Informasi Akun" backHref="/profile" />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="hidden lg:block text-2xl font-bold text-[#1c1b1b]">Informasi Akun</h1>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit} className="text-[#b51822] border-[#b51822] hover:bg-[#FFF5F5]">
              Ubah Profil
            </Button>
          )}
        </div>

        {/* Avatar Section */}
        <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden mb-4 p-6 text-center">
          <div className="relative inline-block mx-auto mb-4">
            <div className="w-24 h-24 rounded-full bg-[#f7f5f4] flex items-center justify-center text-3xl font-bold text-[#b51822] overflow-hidden border-2 border-[#e5e2e1]">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitial(user.name)
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-[#b51822] text-white rounded-full hover:bg-[#90121a] transition-colors border-2 border-white shadow-sm disabled:opacity-50"
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
          <p className="text-sm font-medium text-[#1c1b1b]">{user.name}</p>
          <p className="text-xs text-[#8f6f6d]">{user.phone}</p>
        </div>

        {/* Info / Edit Section */}
        <div className="bg-white rounded border border-[#e5e2e1] overflow-hidden">
          <div className="p-4 border-b border-[#e5e2e1]">
            <h3 className="font-semibold text-[#32201f]">Detail Akun</h3>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1c1b1b] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1c1b1b] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Opsional"
                  className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#9e8e8c] mb-1">Nomor HP</label>
                <input
                  type="text"
                  value={user.phone}
                  disabled
                  className="w-full p-3 border border-[#e5e2e1] rounded text-sm text-[#9e8e8c] bg-[#f7f5f4] cursor-not-allowed"
                />
                <p className="text-xs text-[#9e8e8c] mt-1">Hubungi admin untuk mengubah nomor HP Anda.</p>
              </div>

              {error && <div className="bg-[#FFF5F5] text-[#E53E3E] text-sm p-3 rounded-lg border border-[#FEB2B2]">{error}</div>}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)} type="button">
                  Batal
                </Button>
                <Button className="flex-1 bg-[#b51822] hover:bg-[#90121a]" type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-[#e5e2e1]">
              <div className="w-full flex items-center p-4 text-left">
                <User className="w-5 h-5 text-[#8f6f6d] mr-3" />
                <div className="flex-1">
                  <span className="text-[#32201f] font-medium block text-sm">Nama Lengkap</span>
                  <span className="text-sm text-[#8f6f6d]">{user.name}</span>
                </div>
              </div>
              <div className="w-full flex items-center p-4 text-left">
                <Phone className="w-5 h-5 text-[#8f6f6d] mr-3" />
                <div className="flex-1">
                  <span className="text-[#32201f] font-medium block text-sm">Nomor HP</span>
                  <span className="text-sm text-[#8f6f6d]">{user.phone}</span>
                </div>
              </div>
              <div className="w-full flex items-center p-4 text-left">
                <Mail className="w-5 h-5 text-[#8f6f6d] mr-3" />
                <div className="flex-1">
                  <span className="text-[#32201f] font-medium block text-sm">Email</span>
                  <span className="text-sm text-[#8f6f6d]">{user.email || 'Belum diisi'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
