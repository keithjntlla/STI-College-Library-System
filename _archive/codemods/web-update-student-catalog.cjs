const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/BookCatalog.tsx', 'utf8');

// 1. Remove the static error alert
code = code.replace(/{error \? <AlertMessage type=\"error\" description=\{error\} \/> : null}/, '');

// 2. Add the modals before the <BookOverview ... /> at the end
const modals = `
      {error ? (
        <div className="fixed inset-0 lg:pl-[calc(1rem+var(--sidebar-offset,0px))] transition-[padding] duration-300 z-[999] flex items-center justify-center bg-[#0b5ea2]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-red-100">
            <h3 className="font-display text-xl font-bold text-red-600">Action blocked</h3>
            <p className="mt-2 text-sm text-zinc-700">{error}</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setError('')} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 transition-colors">Okay, understood</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmCartBook ? (
        <div className="fixed inset-0 lg:pl-[calc(1rem+var(--sidebar-offset,0px))] transition-[padding] duration-300 z-[999] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-[#0b5ea2]">Confirm Addition</h3>
            <p className="mt-2 text-sm text-[#0b5ea2]/70">Are you sure you want to add <strong>{confirmCartBook.title}</strong> to your borrow cart?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmCartBook(null)} className="h-10 rounded-xl px-4 text-sm font-bold text-[#0b5ea2] hover:bg-zinc-100 transition-colors">Cancel</button>
              <button onClick={() => performAddToCart(confirmCartBook)} className="h-10 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-[#FFFFFF] hover:bg-[#004488] transition-colors">Yes, Add to Cart</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmReserveBook ? (
        <div className="fixed inset-0 lg:pl-[calc(1rem+var(--sidebar-offset,0px))] transition-[padding] duration-300 z-[999] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-[#0b5ea2]">Confirm Reservation</h3>
            <p className="mt-2 text-sm text-[#0b5ea2]/70">Are you sure you want to reserve <strong>{confirmReserveBook.title}</strong>? You will be placed in the queue.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmReserveBook(null)} className="h-10 rounded-xl px-4 text-sm font-bold text-[#0b5ea2] hover:bg-zinc-100 transition-colors">Cancel</button>
              <button disabled={reserving === confirmReserveBook.titleId} onClick={() => performReserve(confirmReserveBook)} className="h-10 rounded-xl bg-[#FFF200] px-4 text-sm font-bold text-[#0b5ea2] hover:bg-[#e6da00] transition-colors disabled:opacity-50">Yes, Reserve</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTitleId !== null`;

code = code.replace(/{selectedTitleId !== null/, modals);

fs.writeFileSync('src/features/catalog/BookCatalog.tsx', code);
