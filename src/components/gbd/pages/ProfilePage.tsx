import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';
import { LogOut, ArrowLeft, Save, User, AtSign, Camera, Loader2, Download, Upload, Trash2, CloudDownload, Bot, Eye, EyeOff } from 'lucide-react';
import { restoreFromLatestBackup } from '@/lib/autoBackup';
import { useDialog } from '../DialogProvider';
import { toast } from '@/hooks/use-toast';
import NotificationToggle from '../NotificationToggle';
import { useI18n } from '@/hooks/useI18n';

interface ProfilePageProps {
  navigateTo: (page: string) => void;
  user: any;
  onLogout: () => void;
  refreshKey: number;
}

const AiKeyInput = () => {
  const [key, setKey] = useState(() => localStorage.getItem('gbd_gemini_api_key') || '');
  const [show, setShow] = useState(false);
  const save = () => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('gbd_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gbd_gemini_api_key');
    }
    toast({ title: trimmed ? 'API key saved' : 'API key removed', description: trimmed ? 'Your Gemini key will be used for AI requests.' : 'Default AI will be used.' });
  };
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Google Gemini API Key</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full text-sm rounded-[var(--radius-sm)] px-3 py-2.5 pr-9 outline-none transition-colors"
            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={save} className="btn-green px-4 text-sm">Save</button>
      </div>
      <p className="text-[0.65rem] text-muted-foreground">
        Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google AI Studio</a>
      </p>
    </div>
  );
};

const ProfilePage = ({ user, onLogout, navigateTo }: ProfilePageProps) => {
  const { showDialog } = useDialog();
  const { t } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [institution, setInstitution] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Failed to fetch profile:', error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setInstitution(data.institution || '');
        setSubject(data.subject || '');
        setSemester(data.semester || '');
        setYear(data.year || '');
        setGender(data.gender || '');
        if (data.avatar_url) {
          try {
            let avatarPath = data.avatar_url;
            if (avatarPath.startsWith('http')) {
              const match = avatarPath.match(/\/avatars\/(.+)$/);
              if (match) avatarPath = match[1];
            }
            const { data: signedData } = await supabase.storage
              .from('avatars')
              .createSignedUrl(avatarPath, 3600);
            if (signedData?.signedUrl) setAvatarUrl(signedData.signedUrl);
          } catch (e) {
            console.error('Failed to get avatar URL:', e);
          }
        }
      }
    } catch (e) {
      console.error('Profile fetch error:', e);
    }
    setLoading(false);
  };

  const compressImage = (file: File, maxSize: number = 200): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image processing timed out')), 15000);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        // Clamp to maxSize preserving aspect ratio
        if (w > h) { if (w > maxSize) { h = Math.max(1, Math.round(h * maxSize / w)); w = maxSize; } }
        else { if (h > maxSize) { w = Math.max(1, Math.round(w * maxSize / h)); h = maxSize; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          0.65
        );
      };
      img.onerror = () => { clearTimeout(timeout); URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      await showDialog({ title: 'Invalid File', message: 'Please select a JPG, PNG, GIF, or WebP image file.', type: 'alert' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      await showDialog({ title: 'File Too Large', message: 'Image must be under 5MB.', type: 'alert' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, 256);
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) {
      setUploadingAvatar(false);
      await showDialog({ title: 'Upload Failed', message: uploadError.message, type: 'alert' });
      return;
    }
    const { data: signedData, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(filePath, 3600);
    if (signedError || !signedData?.signedUrl) {
      setUploadingAvatar(false);
      await showDialog({ title: 'Error', message: 'Failed to get avatar URL.', type: 'alert' });
      return;
    }
    const avatarDisplayUrl = signedData.signedUrl;
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: filePath, updated_at: new Date().toISOString() }).eq('id', user.id);
    setUploadingAvatar(false);
    if (updateError) {
      await showDialog({ title: 'Error', message: updateError.message, type: 'alert' });
    } else {
      setAvatarUrl(avatarDisplayUrl);
      setProfile((prev: any) => ({ ...prev, avatar_url: filePath }));
    }
    } catch (err: any) {
      setUploadingAvatar(false);
      await showDialog({ title: 'Error', message: err?.message || 'Failed to process image.', type: 'alert' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(), bio: bio.trim(), institution: institution.trim(),
      subject: subject.trim(), semester: semester.trim(), year: year.trim(), gender,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    if (error) {
      await showDialog({ title: 'Error', message: error.message, type: 'alert' });
    } else {
      await showDialog({ title: 'Saved!', message: 'Your profile has been updated successfully.', type: 'success', confirmText: 'Great' });
    }
  };

  if (loading) {
    return (
      <div className="page-enter max-w-[800px]">
        <div className="glass-card text-center !py-16">
          <p className="text-muted-foreground animate-pulse">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-[800px]">
      <div className="flex items-center gap-3 mb-6">
        <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card-accent flex items-center gap-5">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover" style={{ border: '2px solid hsl(var(--border-accent))' }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold" style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
                color: 'hsl(var(--primary-foreground))',
              }}>
                {(profile?.username || 'U')[0].toUpperCase()}
              </div>
            )}
            <button className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-lg font-bold text-foreground truncate">{profile?.username || 'username'}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('profile.joined')} {new Date(profile?.created_at).toLocaleDateString()}</p>
            <button className="text-xs text-primary hover:underline mt-1 font-medium" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? t('profile.uploading') : avatarUrl ? t('profile.change_photo') : t('profile.add_photo')}
            </button>
          </div>
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> {t('profile.personal_info')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">{t('profile.full_name')}</label><input type="text" className="input-simple" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" /></div>
            <div><label className="form-label">{t('profile.bio')}</label><input type="text" className="input-simple" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio" /></div>
            <div><label className="form-label">{t('profile.institution')}</label><input type="text" className="input-simple" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. University of Dhaka" /></div>
            <div><label className="form-label">{t('profile.subject')}</label><input type="text" className="input-simple" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div><label className="form-label">{t('profile.semester')}</label><input type="text" className="input-simple" value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 4th" /></div>
            <div><label className="form-label">{t('profile.year')}</label><input type="text" className="input-simple" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2nd" /></div>
            <div>
              <label className="form-label">{t('profile.gender')}</label>
              <select className="input-simple" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">{t('profile.select')}</option>
                <option value="male">{t('profile.male')}</option>
                <option value="female">{t('profile.female')}</option>
                <option value="other">{t('profile.other')}</option>
              </select>
            </div>
          </div>
          <button className="btn-green mt-5 flex items-center gap-2" onClick={saveProfile} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? t('profile.saving') : t('profile.save_changes')}
          </button>
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">{t('profile.data_management')}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-outline flex-1 flex items-center justify-center gap-2" onClick={() => {
              const json = Storage.exportAllData();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `gbd-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
              URL.revokeObjectURL(url);
              toast({ title: 'Export complete', description: 'Your data has been downloaded.' });
            }}>
              <Download className="w-4 h-4" /> {t('profile.export_data')}
            </button>
            <button className="btn-outline flex-1 flex items-center justify-center gap-2" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = '.json';
              input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const confirmed = await showDialog({ title: t('profile.import_data'), message: 'This will overwrite your current local data. Continue?', type: 'confirm', confirmText: 'Import' });
                if (!confirmed) return;
                const text = await file.text();
                try {
                  Storage.importAllData(text);
                  toast({ title: 'Import complete', description: 'Your data has been restored. Refreshing...' });
                  setTimeout(() => window.location.reload(), 1000);
                } catch {
                  toast({ title: 'Import failed', description: 'Invalid JSON file.', variant: 'destructive' });
                }
              };
              input.click();
            }}>
              <Upload className="w-4 h-4" /> {t('profile.import_data')}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <button className="btn-outline flex-1 flex items-center justify-center gap-2" onClick={async () => {
              const confirmed = await showDialog({ title: t('profile.restore_cloud' as any) || 'Restore from Cloud', message: 'This will restore your latest automatic cloud backup and overwrite current local data. Continue?', type: 'confirm', confirmText: 'Restore' });
              if (!confirmed) return;
              try {
                const data = await restoreFromLatestBackup();
                if (!data) {
                  toast({ title: 'No backup found', description: 'No cloud backup available yet.', variant: 'destructive' });
                  return;
                }
                Storage.importAllData(JSON.stringify(data));
                toast({ title: 'Restore complete', description: 'Data restored from cloud backup. Refreshing...' });
                setTimeout(() => window.location.reload(), 1000);
              } catch {
                toast({ title: 'Restore failed', description: 'Could not restore from cloud backup.', variant: 'destructive' });
              }
            }}>
              <CloudDownload className="w-4 h-4" /> {t('profile.restore_cloud' as any) || 'Restore from Cloud'}
            </button>
          </div>
          <button className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-[var(--radius-sm)] text-destructive font-semibold transition-all hover:bg-destructive/10" style={{ border: '1px solid hsl(var(--destructive) / 0.3)' }} onClick={async () => {
            const confirmed = await showDialog({ title: t('profile.clear_all'), message: 'This will permanently delete all your local data. This cannot be undone. Continue?', type: 'confirm', confirmText: 'Clear Everything' });
            if (!confirmed) return;
            Storage.clearAllData();
            toast({ title: 'All data cleared', description: 'Refreshing...' });
            setTimeout(() => window.location.reload(), 1000);
          }}>
            <Trash2 className="w-4 h-4" /> {t('profile.clear_all')}
          </button>
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2"><Bot className="w-4 h-4" /> {t('profile.ai_settings' as any) || 'AI Assistant Settings'}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t('profile.ai_settings_desc' as any) || 'Use your own Gemini API key for free AI usage, or leave empty to use the default.'}</p>
          <AiKeyInput />
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">{t('profile.notifications')}</h3>
          <NotificationToggle />
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">{t('profile.account')}</h3>
          <button className="w-full flex items-center gap-2 justify-center py-3 rounded-[var(--radius-sm)] text-destructive font-semibold transition-all hover:bg-destructive/10" style={{ border: '1px solid hsl(var(--destructive) / 0.3)' }} onClick={onLogout}>
            <LogOut className="w-4 h-4" /> {t('profile.logout')}
          </button>
        </div>

        <div className="glass-card text-center !p-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[0.6rem] font-extrabold" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>G</div>
            <span className="font-bold text-foreground">GBD</span>
          </div>
          <p className="text-xs text-muted-foreground">Good Bye Dopamine v2.0</p>
          <p className="text-[0.65rem] text-muted-foreground mt-1">{t('profile.built_with')}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
