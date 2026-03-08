import { useState, useMemo } from 'react';
import Storage from '@/lib/storage';
import { formatDate } from '@/lib/helpers';
import { Book, BookOpen, Bookmark, CheckCircle, Search, X, Trash2, Edit, Star, Plus, ArrowLeft } from 'lucide-react';
import { useDialog } from '../DialogProvider';
import { useGamification } from '@/hooks/useGamification';
import { toast } from '@/hooks/use-toast';

interface BooklistPageProps {
  navigateTo: (page: string) => void;
  refreshKey: number;
}

const STATUS_TABS = [
  { id: 'reading', label: 'Reading', icon: BookOpen, color: 'hsl(var(--primary))' },
  { id: 'want-to-read', label: 'Want to Read', icon: Bookmark, color: 'hsl(var(--warning))' },
  { id: 'finished', label: 'Finished', icon: CheckCircle, color: 'hsl(var(--green))' },
];

const GENRES = ['Fiction', 'Non-Fiction', 'Science', 'Self-Help', 'Biography', 'Academic', 'Philosophy', 'Technology', 'History', 'Other'];

function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)} className="transition-transform hover:scale-110">
          <Star className={`w-4 h-4 ${s <= rating ? 'fill-current' : ''}`}
            style={{ color: s <= rating ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))' }} />
        </button>
      ))}
    </div>
  );
}

const BooklistPage = ({ navigateTo }: BooklistPageProps) => {
  const [activeTab, setActiveTab] = useState('reading');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [books, setBooks] = useState(Storage.getBooks());
  const [newRating, setNewRating] = useState(0);
  const [newGenre, setNewGenre] = useState('Fiction');
  const [newStatus, setNewStatus] = useState('reading');
  const { showDialog } = useDialog();
  const { addXP } = useGamification();

  const refresh = () => setBooks(Storage.getBooks());

  const filtered = useMemo(() => {
    let result = books.filter((b: any) => b.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b: any) =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.genre || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a: any, b: any) => new Date(b.updatedAt || b.addedAt).getTime() - new Date(a.updatedAt || a.addedAt).getTime());
  }, [books, activeTab, searchQuery]);

  const selectedBook = books.find((b: any) => b.id === selectedBookId) || null;

  const totalBooks = books.length;
  const readingCount = books.filter((b: any) => b.status === 'reading').length;
  const finishedCount = books.filter((b: any) => b.status === 'finished').length;
  const totalPages = books.filter((b: any) => b.status === 'finished').reduce((sum: number, b: any) => sum + (b.pages || 0), 0);

  const openAddModal = (status?: string) => {
    setEditingId(null);
    setNewRating(0);
    setNewGenre('Fiction');
    setNewStatus(status || activeTab);
    setShowModal(true);
  };

  const openEditModal = (book: any) => {
    setEditingId(book.id);
    setNewRating(book.rating || 0);
    setNewGenre(book.genre || 'Fiction');
    setNewStatus(book.status || 'reading');
    setShowModal(true);
  };

  const saveBook = async () => {
    const title = (document.getElementById('book-title') as HTMLInputElement)?.value.trim();
    const author = (document.getElementById('book-author') as HTMLInputElement)?.value.trim();
    if (!title) {
      await showDialog({ title: 'Missing Info', message: 'Please enter a book title.', type: 'alert' });
      return;
    }
    const pages = parseInt((document.getElementById('book-pages') as HTMLInputElement)?.value) || 0;
    const currentPage = parseInt((document.getElementById('book-current-page') as HTMLInputElement)?.value) || 0;
    const notes = (document.getElementById('book-notes') as HTMLTextAreaElement)?.value.trim();

    if (editingId) {
      Storage.updateBook(editingId, { title, author, genre: newGenre, pages, currentPage: Math.min(currentPage, pages), rating: newRating, notes, status: newStatus });
      toast({ title: 'Book updated', description: title });
    } else {
      Storage.addBook({ title, author, genre: newGenre, pages, currentPage: Math.min(currentPage, pages), rating: newRating, notes, status: newStatus });
      addXP(10);
      toast({ title: 'Book added', description: `${title} by ${author || 'Unknown'}` });
    }
    setShowModal(false);
    setEditingId(null);
    refresh();
  };

  const deleteBook = async (id: string) => {
    const book = books.find((b: any) => b.id === id);
    const confirmed = await showDialog({ title: 'Remove Book', message: 'Are you sure you want to remove this book from your list?', type: 'confirm', confirmText: 'Remove' });
    if (confirmed) {
      Storage.deleteBook(id);
      if (selectedBookId === id) setSelectedBookId(null);
      refresh();
      toast({ title: 'Book removed', description: book?.title || '' });
    }
  };

  const moveBook = (id: string, status: string) => {
    const book = books.find((b: any) => b.id === id);
    const updates: any = { status };
    if (status === 'finished' && book?.pages) updates.currentPage = book.pages;
    Storage.updateBook(id, updates);
    if (status === 'finished') addXP(25);
    refresh();
    toast({ title: status === 'finished' ? 'Book finished! 🎉' : 'Status updated', description: book?.title || '' });
  };

  const updateProgress = (id: string, currentPage: number) => {
    const book = books.find((b: any) => b.id === id);
    const maxPage = book?.pages || 9999;
    Storage.updateBook(id, { currentPage: Math.max(0, Math.min(currentPage, maxPage)) });
    refresh();
  };

  const editingBook = editingId ? books.find((b: any) => b.id === editingId) : null;

  return (
    <div className="page-enter max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button className="icon-btn !w-9 !h-9" onClick={() => navigateTo('dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booklist</h1>
            <p className="text-muted-foreground text-sm">Track your reading journey, one book at a time.</p>
          </div>
        </div>
        <button className="btn-green" onClick={() => openAddModal()}>
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-card !p-4 text-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: 'hsl(var(--purple) / 0.12)', color: 'hsl(var(--purple))' }}>
            <Book className="w-4.5 h-4.5" />
          </div>
          <div className="text-xl font-bold text-foreground">{totalBooks}</div>
          <div className="text-[0.7rem] font-semibold tracking-widest text-muted-foreground">TOTAL BOOKS</div>
        </div>
        <div className="glass-card !p-4 text-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}>
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div className="text-xl font-bold text-primary">{readingCount}</div>
          <div className="text-[0.6rem] font-semibold tracking-widest text-muted-foreground">READING NOW</div>
        </div>
        <div className="glass-card !p-4 text-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: 'hsl(var(--green) / 0.12)', color: 'hsl(var(--green))' }}>
            <CheckCircle className="w-4.5 h-4.5" />
          </div>
          <div className="text-xl font-bold" style={{ color: 'hsl(var(--green))' }}>{finishedCount}</div>
          <div className="text-[0.6rem] font-semibold tracking-widest text-muted-foreground">FINISHED</div>
        </div>
        <div className="glass-card !p-4 text-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: 'hsl(var(--warning) / 0.12)', color: 'hsl(var(--warning))' }}>
            <Star className="w-4.5 h-4.5" />
          </div>
          <div className="text-xl font-bold" style={{ color: 'hsl(var(--warning))' }}>{totalPages}</div>
          <div className="text-[0.6rem] font-semibold tracking-widest text-muted-foreground">PAGES READ</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map(tab => {
          const Icon = tab.icon;
          const count = books.filter((b: any) => b.status === tab.id).length;
          return (
            <button key={tab.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-all ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              style={{
                background: activeTab === tab.id ? `${tab.color}15` : 'hsl(var(--bg-card))',
                border: `1px solid ${activeTab === tab.id ? `${tab.color}33` : 'hsl(var(--border))'}`,
                color: activeTab === tab.id ? tab.color : undefined,
              }}
              onClick={() => { setActiveTab(tab.id); setSelectedBookId(null); }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                background: activeTab === tab.id ? `${tab.color}20` : 'hsl(var(--bg-input))',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div>
          <div className="search-input-wrap mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search books..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="glass-card empty-state !p-10">
                <Book className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{searchQuery ? 'No books match your search' : `No books in "${STATUS_TABS.find(t => t.id === activeTab)?.label}"`}</p>
                <button className="btn-outline mt-3 !text-xs" onClick={() => openAddModal()}>+ Add Book</button>
              </div>
            ) : filtered.map((book: any) => (
              <div key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className={`glass-card !p-4 cursor-pointer transition-all hover:opacity-90 ${selectedBookId === book.id ? '!border-primary' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="w-1.5 rounded-full shrink-0" style={{
                    background: book.status === 'reading' ? 'hsl(var(--primary))' : book.status === 'finished' ? 'hsl(var(--green))' : 'hsl(var(--warning))',
                    minHeight: '40px',
                  }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{book.title}</h3>
                    {book.author && <p className="text-xs text-muted-foreground truncate mt-0.5">by {book.author}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded" style={{
                        background: 'hsl(var(--purple) / 0.1)',
                        color: 'hsl(var(--purple))',
                      }}>{book.genre || 'General'}</span>
                      {book.rating > 0 && <StarRating rating={book.rating} onChange={() => {}} />}
                      {book.pages > 0 && <span className="text-[0.6rem] text-muted-foreground">{book.currentPage || 0}/{book.pages}p</span>}
                    </div>
                    {book.pages > 0 && book.status === 'reading' && (
                      <div className="mt-2">
                        <div className="xp-bar !h-1.5">
                          <div className="xp-bar-fill" style={{ width: `${Math.min(100, Math.round(((book.currentPage || 0) / book.pages) * 100))}%` }} />
                        </div>
                        <div className="text-[0.55rem] text-muted-foreground mt-0.5 text-right">{Math.round(((book.currentPage || 0) / book.pages) * 100)}%</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card min-h-[400px]">
          {selectedBook ? (
            <div>
              <div className="flex justify-between items-start mb-5 gap-3 flex-wrap">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground break-words">{selectedBook.title}</h2>
                  {selectedBook.author && <p className="text-sm text-muted-foreground mt-1">by <span className="text-foreground font-medium">{selectedBook.author}</span></p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => openEditModal(selectedBook)}>
                    <Edit className="w-3 h-3 inline-block mr-1" /> Edit
                  </button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs !text-destructive !border-destructive/30" onClick={() => deleteBook(selectedBook.id)}>
                    <Trash2 className="w-3 h-3 inline-block mr-1" /> Remove
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span className="text-[0.65rem] font-semibold px-2.5 py-1 rounded" style={{
                  background: 'hsl(var(--purple) / 0.1)',
                  color: 'hsl(var(--purple))',
                }}>{selectedBook.genre || 'General'}</span>
                {selectedBook.pages > 0 && (
                  <span className="text-xs text-muted-foreground">{selectedBook.currentPage || 0} / {selectedBook.pages} pages</span>
                )}
                <span className="text-xs text-muted-foreground">Added {formatDate(selectedBook.addedAt)}</span>
              </div>

              {selectedBook.pages > 0 && (
                <div className="mb-5">
                  <label className="form-label">READING PROGRESS</label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <div className="xp-bar !h-3">
                        <div className="xp-bar-fill" style={{ width: `${Math.min(100, Math.round(((selectedBook.currentPage || 0) / selectedBook.pages) * 100))}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">{Math.round(((selectedBook.currentPage || 0) / selectedBook.pages) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[0.65rem] font-semibold text-muted-foreground shrink-0">PAGE</label>
                    <input
                      type="number"
                      className="input-simple !py-1.5 !px-3 !text-sm w-20"
                      min={0}
                      max={selectedBook.pages}
                      value={selectedBook.currentPage || 0}
                      onChange={e => updateProgress(selectedBook.id, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs text-muted-foreground">of {selectedBook.pages}</span>
                    {selectedBook.currentPage < selectedBook.pages && (
                      <button className="btn-outline !py-1 !px-2.5 !text-[0.65rem]" onClick={() => updateProgress(selectedBook.id, (selectedBook.currentPage || 0) + 1)}>+1</button>
                    )}
                    {selectedBook.pages > 10 && selectedBook.currentPage < selectedBook.pages && (
                      <button className="btn-outline !py-1 !px-2.5 !text-[0.65rem]" onClick={() => updateProgress(selectedBook.id, Math.min(selectedBook.pages, (selectedBook.currentPage || 0) + 10))}>+10</button>
                    )}
                  </div>
                </div>
              )}

              {selectedBook.rating > 0 && (
                <div className="mb-5">
                  <label className="form-label">YOUR RATING</label>
                  <StarRating rating={selectedBook.rating} onChange={(r) => { Storage.updateBook(selectedBook.id, { rating: r }); refresh(); }} />
                </div>
              )}

              <div className="mb-5">
                <label className="form-label">STATUS</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = selectedBook.status === tab.id;
                    return (
                      <button key={tab.id}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold transition-all`}
                        style={{
                          background: isActive ? `${tab.color}15` : 'hsl(var(--bg-input))',
                          border: `1px solid ${isActive ? `${tab.color}33` : 'transparent'}`,
                          color: isActive ? tab.color : 'hsl(var(--muted-foreground))',
                        }}
                        onClick={() => !isActive && moveBook(selectedBook.id, tab.id)}
                      >
                        <Icon className="w-3.5 h-3.5" /> {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedBook.notes && (
                <div>
                  <label className="form-label">NOTES</label>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedBook.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state h-full flex flex-col items-center justify-center gap-3 min-h-[350px]">
              <Book className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">{books.length === 0 ? 'Your bookshelf is empty. Add your first book!' : 'Select a book to view details'}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingId(null); }}>
          <div className="modal-card !max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{editingId ? 'Edit Book' : 'Add Book'}</h2>
            <div className="space-y-3">
              <div>
                <label className="form-label">Title *</label>
                <input type="text" id="book-title" className="input-simple" placeholder="Book title" defaultValue={editingBook?.title || ''} />
              </div>
              <div>
                <label className="form-label">Author</label>
                <input type="text" id="book-author" className="input-simple" placeholder="Author name" defaultValue={editingBook?.author || ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Genre</label>
                  <select className="input-simple" value={newGenre} onChange={e => setNewGenre(e.target.value)}>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="input-simple" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {STATUS_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Total Pages</label>
                  <input type="number" id="book-pages" className="input-simple" placeholder="0" min={0} defaultValue={editingBook?.pages || ''} />
                </div>
                <div>
                  <label className="form-label">Current Page</label>
                  <input type="number" id="book-current-page" className="input-simple" placeholder="0" min={0} defaultValue={editingBook?.currentPage || ''} />
                </div>
              </div>
              <div>
                <label className="form-label">Rating</label>
                <StarRating rating={newRating} onChange={setNewRating} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea id="book-notes" className="input-simple min-h-[80px] resize-y" placeholder="Your thoughts..." defaultValue={editingBook?.notes || ''} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</button>
              <button className="btn-green flex-1" onClick={saveBook}>{editingId ? 'Update' : 'Add Book'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BooklistPage;
