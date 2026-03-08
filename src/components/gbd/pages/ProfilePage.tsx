import Storage from '@/lib/storage';
import { Copy, LogOut, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';

interface ProfilePageProps {
  navigateTo: (page: string) => void;
  user: any;
  onLogout: () => void;
  refreshKey: number;
}

const ProfilePage = ({ user, onLogout }: ProfilePageProps) => {
  const settings = Storage.getSettings();
  const { showDialog } = useDialog();

  const saveProfile = async () => {
    const u = Storage.getUser();
    const s = Storage.getSettings();
    u.name = (document.getElementById('profile-name') as HTMLInputElement)?.value.trim() || u.name;
    s.institution = (document.getElementById('profile-institution') as HTMLInputElement)?.value.trim();
    s.subject = (document.getElementById('profile-subject') as HTMLInputElement)?.value.trim();
    s.semester = (document.getElementById('profile-semester') as HTMLInputElement)?.value.trim();
    s.year = (document.getElementById('profile-year') as HTMLInputElement)?.value.trim();
    s.gender = (document.getElementById('profile-gender') as HTMLSelectElement)?.value;
    Storage.setUser(u);
    Storage.setSettings(s);
    await showDialog({ title: 'Saved!', message: 'Your profile has been updated successfully.', type: 'success', confirmText: 'Great' });
  };

  const copyId = async () => {
    if (user) {
      try {
        await navigator.clipboard.writeText(user.uid);
        await showDialog({ title: 'Copied!', message: `Your Unique ID has been copied: ${user.uid}`, type: 'success', confirmText: 'OK' });
      } catch {
        await showDialog({ title: 'Your Unique ID', message: user.uid, type: 'info', confirmText: 'OK' });
      }
    }
  };

  return (
    <div className="page-enter max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your academic profile and settings</p>
      </div>
      <div className="space-y-6">
        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">Academic Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="form-label">FULL NAME</label><input type="text" className="input-simple" id="profile-name" defaultValue={user?.name || ''} /></div>
            <div><label className="form-label">INSTITUTION</label><input type="text" className="input-simple" id="profile-institution" placeholder="e.g. University of Dhaka" defaultValue={settings.institution || ''} /></div>
            <div><label className="form-label">SUBJECT</label><input type="text" className="input-simple" id="profile-subject" placeholder="e.g. Computer Science" defaultValue={settings.subject || ''} /></div>
            <div><label className="form-label">SEMESTER</label><input type="text" className="input-simple" id="profile-semester" placeholder="e.g. 4th" defaultValue={settings.semester || ''} /></div>
            <div><label className="form-label">YEAR</label><input type="text" className="input-simple" id="profile-year" placeholder="e.g. 2nd" defaultValue={settings.year || ''} /></div>
            <div>
              <label className="form-label">GENDER</label>
              <select className="input-simple" id="profile-gender" defaultValue={settings.gender || ''}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button className="btn-green mt-5" onClick={saveProfile}>Save Changes</button>
        </div>

        <div className="glass-card-accent">
          <h3 className="font-semibold text-foreground mb-5">Management</h3>
          <div className="space-y-3">
            <button className="btn-outline w-full flex items-center gap-2 justify-center" onClick={copyId}>
              <Copy className="w-4 h-4" /> Copy Unique ID: {user?.uid || '---'}
            </button>
            <button className="w-full flex items-center gap-2 justify-center py-3 rounded-[var(--radius-sm)] text-destructive font-semibold transition-all hover:bg-destructive/10" style={{ border: '1px solid hsl(var(--destructive) / 0.3)' }} onClick={onLogout}>
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
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
