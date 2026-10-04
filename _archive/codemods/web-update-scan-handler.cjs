const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// Add attendanceApi import
code = code.replace(
  "import { circulationApi } from './circulation-api'",
  "import { circulationApi } from './circulation-api'\nimport { attendanceApi } from '../attendance/attendance-api'"
);

// Replace handleScan
const oldHandleScan = /const handleScan = \(data: string\) => \{[\s\S]*?\}; const \[submitting/;

const newHandleScan = `const handleScan = async (data: string) => {
    setShowScanner(false)
    setSuccess('')
    setError('')
    
    // Parse Book QR JSON
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.barcode || parsed.accession_number) {
          setBarcode(parsed.accession_number || parsed.barcode);
          setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.')
          return;
        }
      } catch(e) {}
    }
    
    // Check traditional book prefixes just in case
    if (data.startsWith('ACC-') || data.startsWith('BC-') || data.includes('-IMP-')) {
      setBarcode(data)
      setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.')
      return;
    }
    
    // Parse Student Attendance Token
    if (data.startsWith('STILIB.ATTENDANCE.')) {
      try {
        setSubmitting(true);
        const result = await attendanceApi.resolveScan(data);
        setSchoolId(result.visitor.schoolId);
        setSuccess('Student ID scanned and verified. Scan book next, or confirm checkout.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid student QR code.')
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    // Fallback for manual typing / old barcode formats
    setSchoolId(data)
    setSuccess('Input logged successfully. Scan book next, or confirm checkout.')
  }; const [submitting`;

code = code.replace(oldHandleScan, newHandleScan);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
