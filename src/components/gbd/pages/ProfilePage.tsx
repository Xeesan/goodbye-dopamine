import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Storage from '@/lib/storage';
import { LogOut, ArrowLeft, Save, User, AtSign, Camera, Loader2, Download, Upload } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { toast } from '@/hooks/use-toast';

interface ProfilePageProps {
  navigateTo: (page: string) => void;
  user: any;
  onLogout: () => void;
  refreshKey: number;
}

const ProfilePage = ({ user, onLogout, navigateTo }: ProfilePageProps) => {
  const { showDialog } = useDialog();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
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
        // Extract file path from full URL if needed, then generate signed URL
        let avatarPath = data.avatar_url;
        if (avatarPath.startsWith('http')) {
          // Extract path after /avatars/
          const match = avatarPath.match(/\/avatars\/(.+)$/);
          if (match) {
            avatarPath = match[1];
          }
        }
        const { data: signedData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(avatarPath, 3600);
        if (signedData?.signedUrl) setAvatarUrl(signedData.signedUrl);
      }
    }
    setLoading(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      await showDialog({ title: 'Invalid File', message: 'Please select an image file (JPG, PNG, etc.)', type: 'alert' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      await showDialog({ title: 'File Too Large', message: 'Image must be under 5MB.', type: 'alert' });
      return;
    }

    setUploadingAvatar(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      await showDialog({ title: 'Upload Failed', message: uploadError.message, type: 'alert' });
      return;
    }

    // Get signed URL (private bucket access)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('avatars')
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData?.signedUrl) {
      setUploadingAvatar(false);
      await showDialog({ title: 'Error', message: 'Failed to get avatar URL.', type: 'alert' });
      return;
    }

    const avatarDisplayUrl = signedData.signedUrl;

    // Store the file path (not URL) in profile so we can always generate new signed URLs
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    setUploadingAvatar(false);

    if (updateError) {
      await showDialog({ title: 'Error', message: updateError.message, type: 'alert' });
    } else {
      setAvatarUrl(avatarDisplayUrl);
      setProfile((prev: any) => ({ ...prev, avatar_url: filePath }));
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim(),
        institution: institution.trim(),
        subject: subject.trim(),
        semester: semester.trim(),
        year: year.trim(),
        gender,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      await showDialog({ title: 'Error', message: error.message, type: 'alert' });
    } else {
      await showDialog({ title: 'Saved!', message: 'Your profile has been updated successfully.', type: 'success', confirmText: 'Great' });
    }
  };

  if (loading) {
    return (
      <div className="page-enter max-w-[800px] mx-auto">
        <div className="glass-card text-center !py-16">
          <p className="text-muted-foreground animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-[800px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account and academic info</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Identity card with avatar */}
        <div className="glass-card-accent flex items-center gap-5">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover"
                style={{ border: '2px solid hsl(var(--border-accent))' }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold" style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
                color: 'hsl(var(--primary-foreground))',
              }}>
                {(profile?.username || 'U')[0].toUpperCase()}
              </div>
            )}
            {/* Camera overlay */}
            <button
              className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-lg font-bold text-foreground truncate">{profile?.username || 'username'}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Joined {new Date(profile?.created_at).toLocaleDateString()}</p>
            <button
              className="text-xs text-primary hover:underline mt-1 font-medium"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Add profile photo'}
            </button>
          </div>
        </div>

        {/* Edit form */}
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">FULL NAME</label>
              <input type="text" className="input-simple" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <label className="form-label">BIO</label>
              <input type="text" className="input-simple" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio about yourself" />
            </div>
            <div>
              <label className="form-label">INSTITUTION</label>
              <input type="text" className="input-simple" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. University of Dhaka" />
            </div>
            <div>
              <label className="form-label">SUBJECT</label>
              <input type="text" className="input-simple" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="form-label">SEMESTER</label>
              <input type="text" className="input-simple" value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 4th" />
            </div>
            <div>
              <label className="form-label">YEAR</label>
              <input type="text" className="input-simple" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2nd" />
            </div>
            <div>
              <label className="form-label">GENDER</label>
              <select className="input-simple" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button className="btn-green mt-5 flex items-center gap-2" onClick={saveProfile} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Data Management */}
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">Data Management</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="btn-outline flex-1 flex items-center justify-center gap-2" onClick={() => {
              const json = Storage.exportAllData();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `gbd-backup-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast({ title: 'Export complete', description: 'Your data has been downloaded.' });
            }}>
              <Download className="w-4 h-4" /> Export Data
            </button>
            <button className="btn-outline flex-1 flex items-center justify-center gap-2" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const confirmed = await showDialog({ title: 'Import Data', message: 'This will overwrite your current local data. Continue?', type: 'confirm', confirmText: 'Import' });
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
              <Upload className="w-4 h-4" /> Import Data
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">Account</h3>
          <button className="w-full flex items-center gap-2 justify-center py-3 rounded-[var(--radius-sm)] text-destructive font-semibold transition-all hover:bg-destructive/10" style={{ border: '1px solid hsl(var(--destructive) / 0.3)' }} onClick={onLogout}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="glass-card text-center !p-5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[0.6rem] font-extrabold" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>G</div>
            <span className="font-bold text-foreground">GBD</span>
          </div>
          <p className="text-xs text-muted-foreground">Good Bye Dopamine v2.0</p>
          <p className="text-[0.65rem] text-muted-foreground mt-1">Built with ❤️ for students</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
