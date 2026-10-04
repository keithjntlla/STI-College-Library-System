const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

code = code.replace(/async function checkout\(event: FormEvent\) \{[\s\S]*?setSubmitting\(false\) \n\s*\}/, `function promptCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (!schoolId || !barcode) return;
    setShowConfirmCheckout(true);
  }

  async function checkout() {
    if (submitting) return; setSubmitting(true); setError(''); setSuccess('')
    try { await circulationApi.confirmCheckout(barcode, schoolId); setBarcode(''); setSuccess('Checkout confirmed successfully. The book is now an active loan.'); setShowConfirmCheckout(false); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Checkout could not be confirmed.') }
    finally { setSubmitting(false) }
  }`);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
