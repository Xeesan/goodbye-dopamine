import { useState, useMemo } from 'react';
import Storage from '@/lib/storage';
import { formatDate } from '@/lib/helpers';
import { FileText, Trash2, Edit, Search, X, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';

interface NotesPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const CATEGORIES = ['all', 'General', 'Study', 'Personal', 'Ideas'];

const NotesPage = ({ navigateTo }: NotesPageProps) => {
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState(Storage.getNotes());
  const { showDialog } = useDialog();
  const { addXP } = useGamification();

  const refresh = () => setNotes(Storage.getNotes());

  const filtered = useMemo(() => {
    let result = category === 'all' ? notes : notes.filter(n => n.category === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, category, searchQuery]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const saveNote = async () => {
    const title = (document.getElementById('note-title-input') as HTMLInputElement)?.value.trim();
    const content = (document.getElementById('note-content-input') as HTMLTextAreaElement)?.value.trim();
    const cat = (document.getElementById('note-category-input') as HTMLSelectElement)?.value;
    if (!title) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a note title.', type: 'alert' });
      return;
    }
    if (editingId) {
      Storage.updateNote(editingId, { title, content, category: cat });
    } else {
      Storage.addNote({ title, content, category: cat });
      Storage.addXP(10);
    }
    setShowModal(false);
    setEditingId(null);
    refresh();
    const updated = Storage.getNotes();
    if (!editingId && updated.length > 0) setSelectedNoteId(updated[updated.length - 1].id);
  };

  const deleteNote = async (id: string) => {
    const confirmed = await showDialog({ title: 'Delete Note', message: 'Are you sure you want to delete this note?', type: 'confirm', confirmText: 'Delete' });
    if (confirmed) {
      Storage.deleteNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
      refresh();
    }
  };

  const editNote = (note: any) => { setEditingId(note.id); setShowModal(true); };
  const editingNote = editingId ? notes.find(n => n.id === editingId) : null;

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground text-sm">Capture and organize your thoughts</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <div>
          <button className="btn-green w-full mb-4" onClick={() => { setEditingId(null); setShowModal(true); }}>+ New Note</button>
          <div className="search-input-wrap mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(c => {
              const isActive = c === 'all' ? category === 'all' : category === c;
              return <button key={c} className={`category-pill ${isActive ? 'active' : ''}`} onClick={() => setCategory(c === 'all' ? 'all' : c)}>{c}</button>;
            })}
          </div>
          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-3">{filtered.length} NOTE{filtered.length !== 1 ? 'S' : ''}</div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">{searchQuery ? 'No notes match your search' : 'No notes yet'}</div>
            ) : filtered.map(n => (
              <div key={n.id} onClick={() => setSelectedNoteId(n.id)}
                className={`glass-card !p-3 cursor-pointer transition-all hover:opacity-90 ${selectedNoteId === n.id ? '!border-primary' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground truncate mt-1">{(n.content || '').substring(0, 80) || 'No content'}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="icon-btn !w-6 !h-6 !text-primary" onClick={(e) => { e.stopPropagation(); editNote(n); }}><Edit className="w-3 h-3" /></button>
                    <button className="icon-btn !w-6 !h-6 !text-destructive" onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="note-category-tag">{n.category || 'General'}</span>
                  <span className="text-[0.6rem] text-muted-foreground">{formatDate(n.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card min-h-[400px]">
          {selectedNote ? (
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <h2 className="text-xl font-bold text-foreground break-words">{selectedNote.title}</h2>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => editNote(selectedNote)}><Edit className="w-3 h-3 inline-block mr-1" /> Edit</button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs !text-destructive !border-destructive/30" onClick={() => deleteNote(selectedNote.id)}><Trash2 className="w-3 h-3 inline-block mr-1" /> Delete</button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="note-category-tag">{selectedNote.category || 'General'}</span>
                <span className="text-xs text-muted-foreground">Updated {formatDate(selectedNote.updatedAt)}</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedNote.content || 'No content'}</div>
            </div>
          ) : (
            <div className="empty-state h-full flex flex-col items-center justify-center gap-3 min-h-[350px]">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">{notes.length === 0 ? 'No notes yet. Start capturing your thoughts!' : 'Select a note to view'}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingId(null); }}>
          <div className="modal-card !max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{editingId ? 'Edit Note' : 'New Note'}</h2>
            <div className="space-y-3">
              <div><label className="form-label">Title</label><input type="text" id="note-title-input" className="input-simple" placeholder="Note title" defaultValue={editingNote?.title || ''} /></div>
              <div><label className="form-label">Content</label><textarea id="note-content-input" className="input-simple min-h-[200px] resize-y" placeholder="Write your thoughts..." defaultValue={editingNote?.content || ''} /></div>
              <div><label className="form-label">Category</label>
                <select id="note-category-input" className="input-simple" defaultValue={editingNote?.category || 'General'}>
                  <option value="General">General</option><option value="Study">Study</option><option value="Personal">Personal</option><option value="Ideas">Ideas</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => { setEditingId(null); setShowModal(false); }}>Cancel</button>
              <button className="btn-green flex-1" onClick={saveNote}>{editingId ? 'Update Note' : 'Save Note'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
