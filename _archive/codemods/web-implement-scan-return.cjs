const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// 1. Add returnTarget state
code = code.replace(
  "const [cancelTarget, setCancelTarget] = useState<CirculationMonitorData['items'][number] | null>(null)",
  "const [cancelTarget, setCancelTarget] = useState<CirculationMonitorData['items'][number] | null>(null)\n  const [returnTarget, setReturnTarget] = useState<CirculationMonitorData['items'][number] | null>(null)"
);

// 2. Add handleReturnScan function before completeReturn
const returnScanFunc = `  async function handleReturnScan(data: string) {
    if (!returnTarget) return;
    setError(''); setSuccess('');
    let scannedBarcode = '';
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        scannedBarcode = parsed.barcode || parsed.accession_number;
      } catch (e) {}
    } else {
      scannedBarcode = data;
    }
    
    if (scannedBarcode !== returnTarget.barcode && scannedBarcode !== returnTarget.accessionNumber) {
      setError(\`Barcode mismatch! Expected \${returnTarget.barcode}, but scanned \${scannedBarcode}. This is the wrong book.\`);
      setReturnTarget(null);
      return;
    }

    const tid = returnTarget.transactionId;
    setReturnTarget(null);
    setBusyId(tid);
    try { await circulationApi.returnBook(tid); setSuccess('Return completed and the waiting queue was advanced.'); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Return could not be completed.'); }
    finally { setBusyId(null); }
  }

  async function completeReturn`;
code = code.replace(/async function completeReturn/, returnScanFunc);

// 3. Update the Process Return button
code = code.replace(
  "onClick={() => void completeReturn(item.transactionId)}",
  "onClick={() => { setReturnTarget(item); }}"
);

// 4. Render CirculationScannerModal for returnTarget
code = code.replace(
  "{showScanner ? <CirculationScannerModal onClose={() => setShowScanner(false)} onScan={handleScan} /> : null}",
  "{showScanner ? <CirculationScannerModal onClose={() => setShowScanner(false)} onScan={handleScan} /> : null}\n    {returnTarget ? <CirculationScannerModal onClose={() => setReturnTarget(null)} onScan={handleReturnScan} /> : null}"
);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
