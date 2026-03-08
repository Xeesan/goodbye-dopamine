import { useState } from 'react';
import Storage from '@/lib/storage';

interface AcademicHubPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const AcademicHubPage = ({ navigateTo }: AcademicHubPageProps) => {
  const [hubTab, setHubTab] = useState('tracker');
  const semesters = Storage.getSemesters();
  const settings = Storage.getSettings();

  let totalPoints = 0, totalCredits = 0;
  semesters.forEach((sem: any) => {
    (sem.courses || []).forEach((c: any) => {
      totalPoints += (c.gpa || 0) * (c.credits || 0);
      totalCredits += c.credits || 0;
    });
  });
  const currentCGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  const requiredGPA = totalCredits < settings.totalCreditsRequired
    ? ((settings.targetCGPA * settings.totalCreditsRequired - totalPoints) / (settings.totalCreditsRequired - totalCredits)).toFixed(2)
    : settings.targetCGPA.toFixed(2);

  const addSemester = () => {
    const name = prompt('Semester name (e.g. Fall 2025):');
    if (!name) return;
    Storage.addSemester({ name });
    navigateTo('academic-hub');
  };

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Hub</h1>
          <p className="text-muted-foreground text-sm">Track your grades, CGPA, and academic goals</p>
        </div>
        <div className="tab-group">
          {['tracker', 'calculator', 'simulation'].map(t => (
            <button key={t} className={`tab-item ${hubTab === t ? 'active' : ''}`} onClick={() => setHubTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* CGPA Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1 flex items-center gap-1">CURRENT CGPA</div>
          <div className={`text-2xl font-bold ${parseFloat(currentCGPA) < 2 ? 'text-destructive' : 'text-primary'}`}>{currentCGPA}</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">TARGET CGPA</div>
          <div className="text-2xl font-bold text-foreground">{settings.targetCGPA.toFixed(2)}</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">TOTAL CREDITS</div>
          <div className="text-2xl font-bold text-foreground">{totalCredits}</div>
          <div className="text-[0.6rem] text-muted-foreground">{totalCredits} / {settings.totalCreditsRequired} COMPLETED</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">REQUIRED GPA</div>
          <div className="text-2xl font-bold text-foreground">{requiredGPA}</div>
          <div className="text-[0.6rem] text-muted-foreground">FOR REMAINING SEMESTERS</div>
        </div>
      </div>

      {/* Semesters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Semesters</h2>
            <button className="btn-green" onClick={addSemester}>+ Add Semester</button>
          </div>
          {semesters.length === 0 ? (
            <div className="glass-card empty-state !p-10">
              <p>No semesters added yet. Add your first semester to start tracking!</p>
            </div>
          ) : semesters.map((s: any, i: number) => (
            <div key={s.id} className="glass-card mb-3 !p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">{s.name || `Semester ${i + 1}`}</h3>
                <span className="text-primary font-semibold">
                  {s.courses.length > 0 ? (s.courses.reduce((a: number, c: any) => a + c.gpa * c.credits, 0) / s.courses.reduce((a: number, c: any) => a + c.credits, 0)).toFixed(2) : '-'} GPA
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.courses.length} courses</div>
            </div>
          ))}
        </div>
        <div className="glass-card-accent">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">GPA Trend</h3>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-muted-foreground">Add semesters to see your GPA trend</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicHubPage;
