import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, ArrowLeft, Save, User, AtSign } from 'lucide-react';
import { useDialog } from '../DialogProvider';

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
    }
    setLoading(false);
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
        {/* Identity card */}
        <div className="glass-card-accent flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-extrabold" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 76%))',
            color: 'hsl(var(--primary-foreground))',
          }}>
            {(profile?.username || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-lg font-bold text-foreground truncate">{profile?.username || 'username'}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Joined {new Date(profile?.created_at).toLocaleDateString()}</p>
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

        {/* Actions */}
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
