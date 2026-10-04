const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// Add usersApi import and catalogApi import if needed
if (!code.includes("import { usersApi }")) {
  code = code.replace(
    "import { attendanceApi } from '../attendance/attendance-api'",
    "import { attendanceApi } from '../attendance/attendance-api'\nimport { usersApi } from '../users/users-api'\nimport { catalogApi } from '../catalog/catalog-api'"
  );
}

// Add state for studentInfo and bookInfo
const stateTarget = "const [barcode, setBarcode] = useState(''); const [schoolId, setSchoolId] = useState('');";
const newState = `const [barcode, setBarcode] = useState(''); const [schoolId, setSchoolId] = useState('');
  const [studentInfo, setStudentInfo] = useState<{name: string, role: string, program: string, avatarUrl: string | null} | null>(null);
  const [bookInfo, setBookInfo] = useState<{title: string, authors: string, coverUrl: string | null} | null>(null);
`;
code = code.replace(stateTarget, newState);

// Update handleScan to populate studentInfo and bookInfo
const oldHandleScan = /const handleScan = async \(data: string\) => \{[\s\S]*?\}; const \[submitting/;
const newHandleScan = `const handleScan = async (data: string) => {
    setShowScanner(false)
    setSuccess('')
    setError('')
    
    // Parse Book QR JSON
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.barcode || parsed.accession_number) {
          const accession = parsed.accession_number || parsed.barcode;
          setBarcode(accession);
          setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.');
          
          // Fetch book details
          try {
             const result = await catalogApi.search({ q: accession, page: 1, limit: 1, status: '', author: '', publicationYear: '', availability: '' });
             if (result.items.length > 0) {
                 const b = result.items[0];
                 let coverUrl = null;
                 if (b.physicalCopies?.[0]?.id) {
                     coverUrl = \`/api/v1/admin/books/assets/\${b.physicalCopies[0].id}/cover.png\`; // Approximation, we don't have explicit cover endpoints in the API list but this is standard, or just no cover
                 }
                 setBookInfo({ title: b.title, authors: b.authors ?? '', coverUrl: null });
             }
          } catch(e) {}
          
          return;
        }
      } catch(e) {}
    }
    
    // Check traditional book prefixes just in case
    if (data.startsWith('ACC-') || data.startsWith('BC-') || data.includes('-IMP-')) {
      setBarcode(data)
      setSuccess('Book scanned successfully. Scan student ID next, or confirm checkout.')
      
      try {
         const result = await catalogApi.search({ q: data, page: 1, limit: 1, status: '', author: '', publicationYear: '', availability: '' });
         if (result.items.length > 0) {
             setBookInfo({ title: result.items[0].title, authors: result.items[0].authors ?? '', coverUrl: null });
         }
      } catch(e) {}
      
      return;
    }
    
    // Parse Student Attendance Token
    if (data.startsWith('STILIB.ATTENDANCE.')) {
      try {
        setSubmitting(true);
        const result = await attendanceApi.resolveScan(data);
        setSchoolId(result.visitor.schoolId);
        
        // Fetch Avatar
        let avatarUrl = null;
        try {
            const avatarRes = await usersApi.getAvatar(result.visitor.schoolId);
            avatarUrl = avatarRes.avatarUrl;
        } catch(e) {}
        
        setStudentInfo({
            name: result.visitor.name,
            role: result.visitor.role,
            program: result.visitor.program ?? '',
            avatarUrl
        });
        
        setSuccess('Student verified. Scan book next, or confirm checkout.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid student QR code.')
      } finally {
        setSubmitting(false);
      }
      return;
    }
    
    // Fallback for manual typing
    if (data.includes('-')) {
        setSchoolId(data)
        setSuccess('Input logged successfully. Scan book next, or confirm checkout.')
    }
  }; const [submitting`;
code = code.replace(oldHandleScan, newHandleScan);

// Update layout
const oldLayout = /<div className="mb-5 flex flex-col xl:flex-row gap-5">[\s\S]*?<\/div>\s*<\/div>/;
const newLayout = `<div className="mb-5 flex flex-col xl:flex-row gap-5">
      {/* Scanner Terminal Left - Now White/Blue */}
      <div className="flex w-full xl:w-1/3 flex-col gap-4 rounded-3xl bg-white border border-[#0b5ea2]/15 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-[#0b5ea2]/5"><QrCode size={180} /></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
              <h2 className="font-display text-xl font-bold text-[#0b5ea2]">Checkout Terminal</h2>
              <p className="mt-1 text-sm text-[#0b5ea2]/70">Open the webcam to scan the student's ID and the book's QR code in any order.</p>
          </div>
          <button onClick={() => setShowScanner(true)} className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#0b5ea2] text-lg font-bold text-white hover:bg-[#004488] shadow-md transition-all">
            <QrCode size={24} />
            Open Scanner
          </button>
        </div>
      </div>
      
      {/* Scanner Terminal Right (Inputs & Scanned Details) */}
      <div className="flex-1 rounded-3xl border border-[#0b5ea2]/15 bg-white p-6 shadow-sm">
        <form onSubmit={checkout} className="flex h-full flex-col justify-between gap-5">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Student Profile Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#0b5ea2]/10 bg-zinc-50 p-4">
                <div className="flex items-center gap-4">
                    {studentInfo?.avatarUrl ? (
                        <img src={studentInfo.avatarUrl} alt="Student" className="h-16 w-16 rounded-full object-cover shadow-sm" />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0b5ea2]/10 text-[#0b5ea2]">
                            <UserCircle size={32} />
                        </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                        {studentInfo ? (
                            <>
                                <h3 className="truncate font-bold text-[#0b5ea2]">{studentInfo.name}</h3>
                                <p className="truncate text-xs font-semibold text-[#0b5ea2]/70">{schoolId} &bull; {studentInfo.role}</p>
                                <p className="truncate text-xs text-[#0b5ea2]/60">{studentInfo.program}</p>
                            </>
                        ) : (
                            <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for student scan...</h3>
                        )}
                    </div>
                </div>
                <input required value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="Manual School ID e.g. 09-0123" className="h-10 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10" />
            </div>

            {/* Book Profile Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#0b5ea2]/10 bg-zinc-50 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b5ea2]/10 text-[#0b5ea2]">
                        <BookText size={32} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {bookInfo ? (
                            <>
                                <h3 className="truncate font-bold text-[#0b5ea2]">{bookInfo.title}</h3>
                                <p className="truncate text-xs text-[#0b5ea2]/70">{bookInfo.authors}</p>
                                <p className="mt-1 truncate text-xs font-bold text-[#0b5ea2]/60">{barcode}</p>
                            </>
                        ) : (
                            <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for book scan...</h3>
                        )}
                    </div>
                </div>
                <input required value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Manual Accession e.g. ACC-123" className="h-10 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-3 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10" />
            </div>

          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-[#0b5ea2]/10">
            <button type="button" onClick={() => {setBarcode(''); setSchoolId(''); setSuccess(''); setError(''); setStudentInfo(null); setBookInfo(null);}} className="rounded-xl px-5 py-3 font-bold text-[#0b5ea2] hover:bg-zinc-100">Clear</button>
            <button type="submit" disabled={submitting || !schoolId || !barcode} className="flex items-center gap-2 rounded-xl bg-[#0b5ea2] px-8 py-3 text-lg font-bold text-white shadow-md hover:bg-[#004488] disabled:opacity-50">
              {submitting ? 'Confirming...' : <><ScanBarcode size={20} /> Confirm Checkout</>}
            </button>
          </div>
        </form>
      </div>
    </div>`;

code = code.replace(oldLayout, newLayout);

// Verify borrower logic reset 
const verifyRegex = /setSuccess\('Student and Book loaded. Click Confirm Checkout when ready.'\); window.scrollTo\(\{ top: 0, behavior: 'smooth' \}\) \}\}/;
const newVerify = `setStudentInfo({ name: item.userName, role: item.role, program: '', avatarUrl: null }); setBookInfo({ title: item.title, authors: '', coverUrl: null }); setSuccess('Student and Book loaded. Click Confirm Checkout when ready.'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}`;
code = code.replace(verifyRegex, newVerify);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
