import { useState } from 'react';
import Storage from '@/lib/storage';
import { formatDate } from '@/lib/helpers';
import { FileText } from 'lucide-react';

interface NotesPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const CATEGORIES = ['all', 'General', 'Study', 'Personal', 'Ideas'];

const NotesPage = ({ navigateTo }: NotesPageProps) => {
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  const notes = Storage.getNotes();
  const filtered = category === 'all' ? notes : notes.filter(n => n.category === category);

  const saveNote = () => {
    const title = (document.getElementById('note-title-input') as HTMLInputElement)?.value.trim();
    const content = (document.getElementById('note-content-input') as HTMLTextAreaElement)?.value.trim();
    const cat = (document.getElementById('note-category-input') as HTMLSelectElement)?.value;
    if (!title) { alert('Please enter a title'); return; }
    if (editingId) {
      Storage.updateNote(editingId, { title, content, category: cat });
      setEditingId(null);
    } else {
      Storage.addNote({ title, content, category: cat });
      Storage.addXP(10);
    }
    setShowModal(false);
    navigateTo('notes');
  };

  const deleteNote = (id: string) => {
    if (confirm('Delete this note?')) {
      Storage.deleteNote(id);
      setSelectedNote(null);
      navigateTo('notes');
    }
  };

  const editNote = (note: any) => {
    setEditingId(note.id);
    setShowModal(true);
  };

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div>
          <button className="btn-green w-full mb-4" onClick={() => { setEditingId(null); setShowModal(true); }}>+ New Note</button>
          
          <div className="search-input-wrap mb-4">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search notes..." />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(c => (
              <button key={c} className={`category-pill ${category === c.toLowerCase() || (c === 'all' && category === 'all') ? 'active' : ''}`}
                onClick={() => setCategory(c.toLowerCase() === 'all' ? 'all' : c)}>{c}</button>
            ))}
          </div>

          <div className="text-[0.65rem] font-semibold tracking-widest text-muted-foreground mb-3">RECENT NOTES</div>
          <div className="space-y-2">
            {filtered.map(n => (
              <button key={n.id} onClick={() => setSelectedNote(n)}
                className={`glass-card !p-3 w-full text-left cursor-pointer transition-all ${selectedNote?.id === n.id ? '!border-primary' : ''}`}>
                <div className="font-medium text-foreground text-sm truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">{(n.content || '').substring(0, 60)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="note-category-tag">{n.category || 'General'}</span>
                  <span className="text-[0.6rem] text-muted-foreground">{formatDate(n.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="glass-card min-h-[300px]">
          {selectedNote ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">{selectedNote.title}</h2>
                <div className="flex gap-2">
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => editNote(selectedNote)}>Edit</button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs !text-destructive !border-destructive/30" onClick={() => deleteNote(selectedNote.id)}>Delete</button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="note-category-tag">{selectedNote.category || 'General'}</span>
                <span className="text-xs text-muted-foreground">{formatDate(selectedNote.updatedAt)}</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'hsl(var(--text-secondary))' }}>
                {selectedNote.content || 'No content'}
              </div>
            </div>
          ) : (
            <div className="empty-state h-full">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p>No notes yet. Start capturing your thoughts!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card !max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{editingId ? 'Edit Note' : 'New Note'}</h2>
            <input type="text" id="note-title-input" className="input-simple mb-3" placeholder="Note title"
              defaultValue={editingId ? notes.find(n => n.id === editingId)?.title : ''} />
            <textarea id="note-content-input" className="input-simple mb-3 min-h-[150px] resize-y" placeholder="Write your thoughts..."
              defaultValue={editingId ? notes.find(n => n.id === editingId)?.content : ''} />
            <label className="form-label">Category</label>
            <select id="note-category-input" className="input-simple mb-4"
              defaultValue={editingId ? notes.find(n => n.id === editingId)?.category : 'General'}>
              <option value="General">General</option>
              <option value="Study">Study</option>
              <option value="Personal">Personal</option>
              <option value="Ideas">Ideas</option>
            </select>
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => { setEditingId(null); setShowModal(false); }}>Cancel</button>
              <button className="btn-green flex-1" onClick={saveNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
