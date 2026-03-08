import { useState } from 'react';
import Storage from '@/lib/storage';
import { Trash2, Plus, ChevronDown, ChevronUp, Calculator, TrendingUp, BookOpen, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';

interface AcademicHubPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const GRADE_MAP: Record<string, number> = {
  'A+': 4.00, 'A': 4.00, 'A-': 3.70,
  'B+': 3.30, 'B': 3.00, 'B-': 2.70,
  'C+': 2.30, 'C': 2.00, 'C-': 1.70,
  'D+': 1.30, 'D': 1.00, 'D-': 0.70,
  'F': 0.00,
};
const GRADE_OPTIONS = Object.keys(GRADE_MAP);

function semGPA(courses: any[]) {
  if (!courses || courses.length === 0) return 0;
  let pts = 0, cr = 0;
  courses.forEach(c => { pts += (c.gpa || 0) * (c.credits || 0); cr += c.credits || 0; });
  return cr > 0 ? pts / cr : 0;
}

const AcademicHubPage = ({ navigateTo }: AcademicHubPageProps) => {
  const [hubTab, setHubTab] = useState('tracker');
  const [semesters, setSemesters] = useState(Storage.getSemesters());
  const settings = Storage.getSettings();
  const [expandedSem, setExpandedSem] = useState<string | null>(semesters.length > 0 ? semesters[semesters.length - 1]?.id : null);
  const [showAddCourse, setShowAddCourse] = useState<string | null>(null);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const [calcCourses, setCalcCourses] = useState<{ name: string; grade: string; credits: number }[]>([
    { name: '', grade: 'A', credits: 3 },
  ]);

  const [simTargetCGPA, setSimTargetCGPA] = useState(settings.targetCGPA);
  const [simCredits, setSimCredits] = useState(30);

  const refresh = () => setSemesters(Storage.getSemesters());

  let totalPoints = 0, totalCredits = 0;
  semesters.forEach((sem: any) => {
    (sem.courses || []).forEach((c: any) => {
      totalPoints += (c.gpa || 0) * (c.credits || 0);
      totalCredits += c.credits || 0;
    });
  });
  const currentCGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const remainingCredits = Math.max(0, settings.totalCreditsRequired - totalCredits);
  const requiredGPA = remainingCredits > 0
    ? (settings.targetCGPA * settings.totalCreditsRequired - totalPoints) / remainingCredits
    : settings.targetCGPA;

  const addSemester = () => {
    const name = (document.getElementById('sem-name-input') as HTMLInputElement)?.value.trim();
    if (!name) return;
    Storage.addSemester({ name });
    refresh();
    setShowAddSemester(false);
    const updated = Storage.getSemesters();
    setExpandedSem(updated[updated.length - 1]?.id);
    toast({ title: 'Semester added', description: name });
  };

  const deleteSemester = async (id: string) => {
    const sem = semesters.find((s: any) => s.id === id);
    const confirmed = await showDialog({ title: 'Delete Semester', message: 'Delete this semester and all its courses? This cannot be undone.', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteSemester(id);
      refresh();
      if (expandedSem === id) setExpandedSem(null);
      toast({ title: 'Semester deleted', description: sem?.name || '' });
    }
  };

  const addCourse = async (semId: string) => {
    const name = (document.getElementById(`course-name-${semId}`) as HTMLInputElement)?.value.trim();
    const grade = (document.getElementById(`course-grade-${semId}`) as HTMLSelectElement)?.value;
    const credits = parseInt((document.getElementById(`course-credits-${semId}`) as HTMLInputElement)?.value) || 3;
    if (!name) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a course name.', type: 'alert' });
      return;
    }
    const gpa = GRADE_MAP[grade] ?? 0;
    Storage.addCourse(semId, { name, grade, gpa, credits });
    addXP(10);
    refresh();
    setShowAddCourse(null);
    toast({ title: 'Course added', description: `${name} — ${grade}` });
  };

  const deleteCourse = (semId: string, courseId: string) => {
    Storage.deleteCourse(semId, courseId);
    refresh();
    toast({ title: 'Course removed' });
  };

  const addCalcRow = () => setCalcCourses(prev => [...prev, { name: '', grade: 'A', credits: 3 }]);
  const removeCalcRow = (i: number) => setCalcCourses(prev => prev.filter((_, idx) => idx !== i));
  const updateCalcRow = (i: number, field: string, value: any) => {
    setCalcCourses(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };
  const calcGPA = () => {
    let pts = 0, cr = 0;
    calcCourses.forEach(c => { const gpa = GRADE_MAP[c.grade] ?? 0; pts += gpa * c.credits; cr += c.credits; });
    return cr > 0 ? (pts / cr).toFixed(2) : '0.00';
  };

  const simRequiredGPA = () => {
    const needed = (simTargetCGPA * (totalCredits + simCredits) - totalPoints) / simCredits;
    return Math.max(0, needed);
  };

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Academic Hub</h1>
            <p className="text-muted-foreground text-sm">Track your grades, CGPA, and academic goals</p>
          </div>
        </div>
        <div className="tab-group">
          {[
            { key: 'tracker', label: 'TRACKER' },
            { key: 'calculator', label: 'CALCULATOR' },
            { key: 'simulation', label: 'SIMULATION' },
          ].map(t => (
            <button key={t.key} className={`tab-item ${hubTab === t.key ? 'active' : ''}`} onClick={() => setHubTab(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">CURRENT CGPA</div>
          <div className={`text-2xl font-bold ${currentCGPA < 2 ? 'text-destructive' : 'text-primary'}`}>{currentCGPA.toFixed(2)}</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">TARGET CGPA</div>
          <div className="text-2xl font-bold text-foreground">{settings.targetCGPA.toFixed(2)}</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">TOTAL CREDITS</div>
          <div className="text-2xl font-bold text-foreground">{totalCredits}</div>
          <div className="text-[0.6rem] text-muted-foreground">{totalCredits} / {settings.totalCreditsRequired}</div>
        </div>
        <div className="glass-card-accent !p-4">
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">REQUIRED GPA</div>
          <div className={`text-2xl font-bold ${requiredGPA > 4 ? 'text-destructive' : 'text-foreground'}`}>{requiredGPA > 4 ? '4.00+' : requiredGPA.toFixed(2)}</div>
          <div className="text-[0.6rem] text-muted-foreground">FOR REMAINING</div>
        </div>
      </div>

      {hubTab === 'tracker' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Semesters ({semesters.length})</h2>
            <button className="btn-green" onClick={() => setShowAddSemester(true)}><Plus className="w-4 h-4 inline-block mr-1" /> Add Semester</button>
          </div>

          {showAddSemester && (
            <div className="glass-card mb-4 flex gap-3 items-end">
              <div className="flex-1"><label className="form-label">SEMESTER NAME</label><input type="text" id="sem-name-input" className="input-simple" placeholder="e.g. Fall 2025" /></div>
              <button className="btn-green" onClick={addSemester}>Add</button>
              <button className="btn-outline" onClick={() => setShowAddSemester(false)}>Cancel</button>
            </div>
          )}

          {semesters.length === 0 ? (
            <div className="glass-card empty-state !p-10"><BookOpen className="w-12 h-12 text-muted-foreground mb-3" /><p>No semesters added yet. Add your first semester to start tracking!</p></div>
          ) : semesters.map((s: any) => {
            const isExpanded = expandedSem === s.id;
            const gpa = semGPA(s.courses);
            return (
              <div key={s.id} className="glass-card mb-3">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedSem(isExpanded ? null : s.id)}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    <div><h3 className="font-semibold text-foreground">{s.name}</h3><span className="text-xs text-muted-foreground">{s.courses.length} course{s.courses.length !== 1 ? 's' : ''}</span></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-bold text-lg">{s.courses.length > 0 ? gpa.toFixed(2) : '—'}</span>
                    <button className="icon-btn !w-7 !h-7 !text-destructive" onClick={(e) => { e.stopPropagation(); deleteSemester(s.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-4 border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
                    {s.courses.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="hidden sm:grid grid-cols-[1fr_80px_80px_40px] gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground px-1"><span>COURSE</span><span>GRADE</span><span>CREDITS</span><span></span></div>
                        {s.courses.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-lg sm:grid sm:grid-cols-[1fr_80px_80px_40px]" style={{ background: 'hsl(var(--bg-input))' }}>
                            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                            <div className="flex items-center gap-2 sm:contents shrink-0">
                              <span className="text-sm font-semibold text-primary">{c.grade}</span>
                              <span className="text-sm text-muted-foreground">{c.credits} cr</span>
                              <button className="icon-btn !w-6 !h-6 !text-destructive" onClick={() => deleteCourse(s.id, c.id)}><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAddCourse === s.id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px] gap-2 items-end mt-2">
                        <div><label className="form-label">COURSE</label><input type="text" id={`course-name-${s.id}`} className="input-simple" placeholder="e.g. Calculus I" /></div>
                        <div><label className="form-label">GRADE</label><select id={`course-grade-${s.id}`} className="input-simple" defaultValue="A">{GRADE_OPTIONS.map(g => <option key={g} value={g}>{g} ({GRADE_MAP[g].toFixed(2)})</option>)}</select></div>
                        <div><label className="form-label">CREDITS</label><input type="number" id={`course-credits-${s.id}`} className="input-simple" defaultValue={3} min={1} max={10} /></div>
                        <div className="col-span-3 flex gap-2 mt-2">
                          <button className="btn-green flex-1" onClick={() => addCourse(s.id)}>Add Course</button>
                          <button className="btn-outline" onClick={() => setShowAddCourse(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-outline w-full mt-1" onClick={() => setShowAddCourse(s.id)}><Plus className="w-3.5 h-3.5 inline-block mr-1" /> Add Course</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hubTab === 'calculator' && (
        <div>
          <div className="glass-card mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">GPA Calculator</h2>
            <p className="text-sm text-muted-foreground mb-4">Enter your courses to calculate semester GPA instantly.</p>
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-[1fr_120px_80px_40px] gap-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground px-1"><span>COURSE NAME</span><span>GRADE</span><span>CREDITS</span><span></span></div>
              {calcCourses.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_80px_40px] gap-2 items-center">
                  <input type="text" className="input-simple" placeholder="Course name" value={row.name} onChange={e => updateCalcRow(i, 'name', e.target.value)} />
                  <select className="input-simple" value={row.grade} onChange={e => updateCalcRow(i, 'grade', e.target.value)}>{GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                  <input type="number" className="input-simple" min={1} max={10} value={row.credits} onChange={e => updateCalcRow(i, 'credits', parseInt(e.target.value) || 1)} />
                  <button className="icon-btn !w-8 !h-8 !text-destructive" onClick={() => removeCalcRow(i)} disabled={calcCourses.length <= 1}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button className="btn-outline mb-4" onClick={addCalcRow}><Plus className="w-3.5 h-3.5 inline-block mr-1" /> Add Course</button>
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'hsl(var(--accent-dim))' }}>
              <span className="text-sm font-semibold text-muted-foreground">CALCULATED GPA</span>
              <span className="text-3xl font-bold text-primary">{calcGPA()}</span>
            </div>
          </div>
          <div className="glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Grade Point Reference</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {GRADE_OPTIONS.map(g => (
                <div key={g} className="text-center p-2 rounded" style={{ background: 'hsl(var(--bg-input))' }}>
                  <div className="text-sm font-bold text-primary">{g}</div>
                  <div className="text-xs text-muted-foreground">{GRADE_MAP[g].toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hubTab === 'simulation' && (
        <div>
          <div className="glass-card mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">CGPA Simulation</h2>
            <p className="text-sm text-muted-foreground mb-6">See what GPA you need in upcoming semesters to reach your target CGPA.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><label className="form-label">TARGET CGPA</label><input type="number" className="input-simple" step={0.01} min={0} max={4} value={simTargetCGPA} onChange={e => setSimTargetCGPA(parseFloat(e.target.value) || 0)} /></div>
              <div><label className="form-label">REMAINING CREDITS TO COMPLETE</label><input type="number" className="input-simple" min={1} max={200} value={simCredits} onChange={e => setSimCredits(parseInt(e.target.value) || 1)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg text-center" style={{ background: 'hsl(var(--bg-input))' }}>
                <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">CURRENT CGPA</div>
                <div className="text-2xl font-bold text-primary">{currentCGPA.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{totalCredits} credits completed</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ background: 'hsl(var(--bg-input))' }}>
                <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">TARGET CGPA</div>
                <div className="text-2xl font-bold text-foreground">{simTargetCGPA.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{totalCredits + simCredits} total credits</div>
              </div>
              <div className="p-4 rounded-lg text-center" style={{ background: simRequiredGPA() > 4 ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--accent-dim))' }}>
                <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-1">REQUIRED GPA</div>
                <div className={`text-2xl font-bold ${simRequiredGPA() > 4 ? 'text-destructive' : 'text-primary'}`}>{simRequiredGPA() > 4 ? '> 4.00' : simRequiredGPA().toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{simRequiredGPA() > 4 ? 'Not achievable' : simRequiredGPA() <= 0 ? 'Already achieved!' : `across ${simCredits} credits`}</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-3">What-If Scenarios</h3>
            <div className="space-y-2">
              {[4.00, 3.70, 3.50, 3.30, 3.00, 2.50].map(gpa => {
                const projected = totalCredits + simCredits > 0 ? (totalPoints + gpa * simCredits) / (totalCredits + simCredits) : 0;
                const meetsTarget = projected >= simTargetCGPA;
                return (
                  <div key={gpa} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(var(--bg-input))' }}>
                    <span className="text-sm text-foreground">If you maintain <span className="font-bold text-primary">{gpa.toFixed(2)}</span> GPA for {simCredits} credits</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${meetsTarget ? 'text-primary' : 'text-destructive'}`}>{projected.toFixed(2)} CGPA</span>
                      <span className="text-xs">{meetsTarget ? '✅' : '❌'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicHubPage;
