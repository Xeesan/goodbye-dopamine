import { useState, useMemo, useCallback, useEffect } from 'react';
import Storage from '@/lib/storage';
import { syncNotesFromDB, addNoteToDB, updateNoteInDB, deleteNoteFromDB } from '@/lib/dbSync';
import { formatDate } from '@/lib/helpers';
import { FileText, Trash2, Edit, Search, X, ArrowLeft, Hash, Eye, Pencil } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';
import MarkdownRenderer from '../MarkdownRenderer';
import { useI18n } from '@/hooks/useI18n';

interface NotesPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const CATEGORIES = ['all', 'General', 'Study', 'Personal', 'Ideas'];

const extractTags = (text: string): string[] => {
  const matches = text.match(/#[a-zA-Z0-9_-]+/g);
  if (!matches) return [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
};

const getAllTags = (notes: any[]): string[] => {
  const tagSet = new Set<string>();
  for (const n of notes) {
    const tags = extractTags(`${n.title || ''} ${n.content || ''}`);
    tags.forEach(t => tagSet.add(t));
  }
  return Array.from(tagSet).sort();
};

const NotesPage = ({ navigateTo, refreshKey }: NotesPageProps) => {
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [notes, setNotes] = useState(Storage.getNotes());
  const { showDialog } = useDialog();
  const { addXP } = useGamification();
  const { t } = useI18n();

  // Sync from DB on mount and when AI adds entries
  useEffect(() => {
    syncNotesFromDB().then(() => setNotes(Storage.getNotes()));
  }, [refreshKey]);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [modalPreview, setModalPreview] = useState(false);

  const refresh = () => setNotes(Storage.getNotes());

  const allTags = useMemo(() => getAllTags(notes), [notes]);

  const filtered = useMemo(() => {
    let result = category === 'all' ? notes : notes.filter(n => n.category === category);
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
    }
    if (activeTag) {
      result = result.filter(n => {
        const tags = extractTags(`${n.title || ''} ${n.content || ''}`);
        return tags.includes(activeTag);
      });
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, category, debouncedSearchQuery, activeTag]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;
  const selectedNoteTags = selectedNote ? extractTags(`${selectedNote.title || ''} ${selectedNote.content || ''}`) : [];

  const openModal = useCallback((note?: any) => {
    if (note) {
      setEditingId(note.id);
      setFormTitle(note.title || '');
      setFormContent(note.content || '');
      setFormCategory(note.category || 'General');
    } else {
      setEditingId(null);
      setFormTitle('');
      setFormContent('');
      setFormCategory('General');
    }
    setModalPreview(false);
    setShowModal(true);
  }, []);

  const saveNote = async () => {
    if (!formTitle.trim()) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a note title.', type: 'alert' });
      return;
    }
    if (editingId) {
      const updates = { title: formTitle.trim(), content: formContent.trim(), category: formCategory };
      Storage.updateNote(editingId, updates);
      // Sync update to DB
      const updated = Storage.getNotes().find(n => n.id === editingId);
      if (updated) updateNoteInDB(updated);
      toast({ title: 'Note updated', description: formTitle.trim() });
    } else {
      const tempId = Storage.addNote({ title: formTitle.trim(), content: formContent.trim(), category: formCategory });
      addXP(10);
      // Sync new note to DB and link ID
      const current = Storage.getNotes();
      const target = current.find(n => n.id === tempId);
      if (target) {
        addNoteToDB(target).then(dbId => {
          if (dbId) {
            const notes = Storage.getNotes();
            const item = notes.find(n => n.id === tempId);
            if (item) { item.id = dbId; Storage.setNotes(notes); refresh(); }
          }
        });
      }
      toast({ title: 'Note created', description: formTitle.trim() });
    }
    setShowModal(false);
    setEditingId(null);
    refresh();
    const updated = Storage.getNotes();
    if (!editingId && updated.length > 0) setSelectedNoteId(updated[updated.length - 1].id);
  };

  const deleteNote = async (id: string) => {
    const note = notes.find(n => n.id === id);
    const confirmed = await showDialog({ title: t('common.delete'), message: 'Are you sure you want to delete this note?', type: 'confirm', confirmText: t('common.delete') });
    if (confirmed) {
      Storage.deleteNote(id);
      deleteNoteFromDB(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
      refresh();
      toast({ title: 'Note deleted', description: note?.title || '' });
    }
  };

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-5">
        <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('notes.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('notes.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <div>
          <button className="btn-green w-full mb-4" onClick={() => openModal()}>{t('notes.new_note')}</button>

          <div className="search-input-wrap mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder={t('notes.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORIES.map(c => {
              const isActive = c === 'all' ? category === 'all' : category === c;
              return <button key={c} className={`category-pill ${isActive ? 'active' : ''}`} onClick={() => setCategory(c === 'all' ? 'all' : c)}>{c}</button>;
            })}
          </div>

          {allTags.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                <Hash className="w-3 h-3" /> {t('notes.tags')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeTag && (
                  <button className="tag-pill active" onClick={() => setActiveTag(null)}>{t('notes.clear')}</button>
                )}
                {allTags.map(tag => (
                  <button key={tag} className={`tag-pill ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(activeTag === tag ? null : tag)}>{tag}</button>
                ))}
              </div>
            </div>
          )}

          <div className="text-[0.7rem] font-semibold tracking-widest text-muted-foreground mb-3">{filtered.length} NOTE{filtered.length !== 1 ? 'S' : ''}</div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8"><span className="text-3xl block mb-2">{searchQuery || activeTag ? '🔍' : '📝'}</span><p className="text-sm text-muted-foreground">{searchQuery || activeTag ? t('notes.no_match') : t('notes.start_writing')}</p></div>
            ) : filtered.map(n => {
              const noteTags = extractTags(`${n.title || ''} ${n.content || ''}`);
              return (
                <div key={n.id} onClick={() => setSelectedNoteId(n.id)}
                  className={`glass-card !p-3 cursor-pointer transition-all hover:opacity-90 ${selectedNoteId === n.id ? '!border-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">{(n.content || '').substring(0, 80) || t('notes.no_content')}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button className="icon-btn !w-6 !h-6 !text-primary" onClick={(e) => { e.stopPropagation(); openModal(n); }}><Edit className="w-3 h-3" /></button>
                      <button className="icon-btn !w-6 !h-6 !text-destructive" onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="note-category-tag">{n.category || 'General'}</span>
                    {noteTags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag-pill text-[0.6rem]">{tag}</span>
                    ))}
                    <span className="text-[0.7rem] text-muted-foreground ml-auto">{formatDate(n.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card min-h-[400px]">
          {selectedNote ? (
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <h2 className="text-xl font-bold text-foreground break-words">{selectedNote.title}</h2>
                <div className="flex gap-2 shrink-0">
                  <button className={`btn-outline !py-1.5 !px-3 !text-xs ${previewMode ? '' : '!bg-primary/10 !text-primary !border-primary/30'}`} onClick={() => setPreviewMode(false)}>
                    <Pencil className="w-3 h-3 inline-block mr-1" /> {t('notes.raw')}
                  </button>
                  <button className={`btn-outline !py-1.5 !px-3 !text-xs ${previewMode ? '!bg-primary/10 !text-primary !border-primary/30' : ''}`} onClick={() => setPreviewMode(true)}>
                    <Eye className="w-3 h-3 inline-block mr-1" /> {t('notes.preview')}
                  </button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => openModal(selectedNote)}><Edit className="w-3 h-3 inline-block mr-1" /> {t('common.edit')}</button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs !text-destructive !border-destructive/30" onClick={() => deleteNote(selectedNote.id)}><Trash2 className="w-3 h-3 inline-block mr-1" /> {t('common.delete')}</button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="note-category-tag">{selectedNote.category || 'General'}</span>
                {selectedNoteTags.map(tag => (
                  <button key={tag} className="tag-pill" onClick={() => { setActiveTag(tag); setSelectedNoteId(null); }}>{tag}</button>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">{t('notes.updated')} {formatDate(selectedNote.updatedAt)}</span>
              </div>
              {previewMode ? (
                <MarkdownRenderer content={selectedNote.content || '*No content*'} />
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedNote.content || t('notes.no_content')}</div>
              )}
            </div>
          ) : (
            <div className="empty-state h-full flex flex-col items-center justify-center gap-3 min-h-[350px]">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">{notes.length === 0 ? t('notes.no_notes_yet') : t('notes.select_note')}</p>
              <p className="text-xs text-muted-foreground">{t('notes.tip')}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingId(null); }}>
          <div className="modal-card !max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editingId ? t('notes.edit_note') : t('notes.new_note_title')}</h2>
              <div className="flex gap-1">
                <button className={`icon-btn !w-8 !h-8 ${!modalPreview ? '!text-primary' : ''}`} onClick={() => setModalPreview(false)} title={t('common.edit')}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button className={`icon-btn !w-8 !h-8 ${modalPreview ? '!text-primary' : ''}`} onClick={() => setModalPreview(true)} title={t('notes.preview')}>
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">{t('notes.title_label')}</label>
                <input type="text" className="input-simple" placeholder={t('notes.note_title_ph')} value={formTitle} onChange={e => setFormTitle(e.target.value)} />
              </div>
              <div>
                <label className="form-label">{t('notes.content')} <span className="text-muted-foreground font-normal text-[0.6rem]">{t('notes.md_supported')}</span></label>
                {modalPreview ? (
                  <div className="input-simple min-h-[200px] overflow-y-auto">
                    <MarkdownRenderer content={formContent || '*Start writing...*'} />
                  </div>
                ) : (
                  <textarea className="input-simple min-h-[200px] resize-y font-mono text-sm" placeholder={t('notes.write_ph')} value={formContent} onChange={e => setFormContent(e.target.value)} />
                )}
              </div>
              <div>
                <label className="form-label">{t('notes.category')}</label>
                <select className="input-simple" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Study">Study</option>
                  <option value="Personal">Personal</option>
                  <option value="Ideas">Ideas</option>
                </select>
              </div>
              {extractTags(formContent).length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[0.6rem] text-muted-foreground">{t('notes.tags')}:</span>
                  {extractTags(formContent).map(tag => (
                    <span key={tag} className="tag-pill text-[0.55rem]">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => { setEditingId(null); setShowModal(false); }}>{t('common.cancel')}</button>
              <button className="btn-green flex-1" onClick={saveNote}>{editingId ? t('notes.update_note') : t('notes.save_note')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
