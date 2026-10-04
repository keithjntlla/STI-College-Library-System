const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// Update checkout to use confirmCheckout
code = code.replace(
  "await circulationApi.fulfillClaim(barcode, schoolId)",
  "await circulationApi.confirmCheckout(barcode, schoolId)"
);
code = code.replace(
  "setSuccess('School ID and barcode verified. The claim is now an active loan.')",
  "setSuccess('Checkout confirmed successfully. The book is now an active loan.')"
);

// Rewrite the top of handleScan to use copyByBarcode
const handleScanRegex = /const handleScan = async \(data: string\) => \{[\s\S]*?if \(data\.startsWith\('STILIB\.ATTENDANCE\.'\)\) \{/;

const newHandleScan = `const handleScan = async (data: string) => {
    setShowScanner(false)
    setSuccess('')
    setError('')
    
    // Parse Book QR JSON
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.barcode || parsed.accession_number) {
          const barcodeValue = parsed.barcode || parsed.accession_number;
          setBarcode(barcodeValue);
          setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.');
          
          try {
             const result = await catalogApi.copyByBarcode(barcodeValue);
             if (result) {
                 setBookInfo({ title: result.title, authors: result.author || '', coverUrl: null });
             } else {
                 setBookInfo({ title: \`Book \${parsed.accession_number || barcodeValue}\`, authors: 'Scan Confirmed', coverUrl: null });
             }
          } catch(e) {
             setBookInfo({ title: \`Book \${parsed.accession_number || barcodeValue}\`, authors: 'Scan Confirmed', coverUrl: null });
          }
          return;
        }
      } catch(e) {}
    }
    
    // Check traditional book prefixes just in case
    if (data.startsWith('ACC-') || data.startsWith('BC-') || data.includes('-IMP-')) {
      setBarcode(data)
      setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.')
      try {
          const result = await catalogApi.copyByBarcode(data);
          if (result) {
              setBookInfo({ title: result.title, authors: result.author || '', coverUrl: null });
          } else {
              setBookInfo({ title: \`Book \${data}\`, authors: 'Scan Confirmed', coverUrl: null });
          }
      } catch(e) {
          setBookInfo({ title: \`Book \${data}\`, authors: 'Scan Confirmed', coverUrl: null });
      }
      return;
    }
    
    // Parse Student Attendance Token
    if (data.startsWith('STILIB.ATTENDANCE.')) {`;

code = code.replace(handleScanRegex, newHandleScan);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
