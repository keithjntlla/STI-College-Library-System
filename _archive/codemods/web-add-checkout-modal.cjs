const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// 1. Add showConfirmCheckout state
const stateMatch = "const [cancelTarget, setCancelTarget] = useState<CirculationMonitorData['items'][number] | null>(null)";
const stateReplace = "const [cancelTarget, setCancelTarget] = useState<CirculationMonitorData['items'][number] | null>(null)\n  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false);";
code = code.replace(stateMatch, stateReplace);

// 2. Change checkout function signature
const checkoutMatch = "async function checkout(event: FormEvent) {\n    event.preventDefault(); if (submitting) return; setSubmitting(true); setError(''); setSuccess('')";
const checkoutReplace = "function promptCheckout(event: React.FormEvent) {\n    event.preventDefault();\n    if (!schoolId || !barcode) return;\n    setShowConfirmCheckout(true);\n  }\n\n  async function checkout() {\n    if (submitting) return; setSubmitting(true); setError(''); setSuccess('')";
code = code.replace(checkoutMatch, checkoutReplace);

// 3. Change form onSubmit
const formMatch = "<form onSubmit={checkout}";
const formReplace = "<form onSubmit={promptCheckout}";
code = code.replace(formMatch, formReplace);

// 4. Add the modal at the bottom
const modalMatch = "{showScanner ? <CirculationScannerModal onClose={() => setShowScanner(false)} onScan={handleScan} /> : null}";
const modalReplace = `{showConfirmCheckout ? (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#FFFFFF] shadow-2xl p-6">
          <h2 className="font-display text-xl font-bold text-[#0b5ea2] mb-2">Confirm Checkout</h2>
          <p className="text-[#0b5ea2]/70 mb-6">Are you sure you want to check out this book to this student?</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowConfirmCheckout(false)} disabled={submitting} className="rounded-xl px-4 py-2 font-bold text-[#0b5ea2] hover:bg-zinc-100 disabled:opacity-50">Cancel</button>
            <button onClick={() => { checkout(); setShowConfirmCheckout(false); }} disabled={submitting} className="rounded-xl bg-[#0b5ea2] px-6 py-2 font-bold text-white shadow-md hover:bg-[#004488] disabled:opacity-50">
              {submitting ? 'Confirming...' : 'Yes, Check Out'}
            </button>
          </div>
        </div>
      </div>
  ) : null}
  {showScanner ? <CirculationScannerModal onClose={() => setShowScanner(false)} onScan={handleScan} /> : null}`;
code = code.replace(modalMatch, modalReplace);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
