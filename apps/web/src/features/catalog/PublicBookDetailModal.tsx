import { BookEntry } from './PublicCatalog';
import { X, Book, LayoutGrid, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PublicBookDetailModal({ book, onClose }: { book: BookEntry | null, onClose: () => void }) {
  const navigate = useNavigate();
  if (!book) return null;

  const synopsis = book.synopsis || (book.research && book.research.abstract) || 'No synopsis available for this book.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#22232e] rounded-3xl shadow-2xl ring-1 ring-zinc-200 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-[#121219] dark:hover:bg-white/10 transition-colors z-10"
        >
          <X size={20} className="text-zinc-600 dark:text-zinc-300" />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 p-6 sm:p-8">
          {/* Cover Column */}
          <div className="flex-shrink-0 w-full sm:w-48">
            <div className="aspect-[3/4] w-full rounded-xl bg-zinc-100 dark:bg-[#121219] overflow-hidden shadow-lg ring-1 ring-zinc-200 dark:ring-white/10">
              {book.coverImagePath ? (
                <img src={book.coverImagePath} alt={book.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/400x600/f4f4f5/a1a1aa?text=${encodeURIComponent(book.title)}`; }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-300">
                  <Book size={48} />
                </div>
              )}
            </div>
            
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-[#121219] p-3 rounded-lg border border-zinc-100 dark:border-white/10">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Copies</span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{book.totalCopies}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-[#121219] p-3 rounded-lg border border-zinc-100 dark:border-white/10">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Available</span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{book.availableCopies}</span>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col">
            <div className="mb-2 inline-flex items-center gap-1.5 self-start">
               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${book.availableCopies > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                 {book.availableCopies > 0 ? 'Available Now' : 'Waitlist Only'}
               </span>
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-[#121219] dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
                 {book.categoryName || 'Uncategorized'}
               </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-display text-zinc-900 dark:text-white leading-tight">
              {book.title}
            </h2>
            <p className="mt-1 text-lg font-medium text-[#0b5ea2] dark:text-[#FFF200]">
              {book.authors?.join(', ') || 'Unknown Author'}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {book.isbn && <p><strong className="text-zinc-900 dark:text-zinc-200">ISBN:</strong> {book.isbn}</p>}
              {book.publicationYear && <p><strong className="text-zinc-900 dark:text-zinc-200">Published:</strong> {book.publicationYear}</p>}
            </div>

            <div className="mt-6 flex-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <Info size={16} /> Synopsis
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {synopsis}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => navigate('/login', {
                  state: {
                    returnTo: `/student/catalog?titleId=${encodeURIComponent(String(book.titleId))}&query=${encodeURIComponent(book.title)}`,
                  },
                })}
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#0b5ea2] text-white font-bold text-sm shadow-md hover:bg-[#002266] hover:shadow-lg transition-all dark:bg-[#FFF200] dark:text-[#0b5ea2] dark:hover:bg-yellow-400"
              >
                Request to Borrow
              </button>
              <p className="mt-3 text-xs text-center sm:text-left text-zinc-500 dark:text-zinc-500">
                You will be asked to log in to your STI College account to borrow or reserve this book.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
