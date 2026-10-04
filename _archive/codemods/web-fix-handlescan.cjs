const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

const regex = /const handleScan = async \(data: string\) => \{[\s\S]*?\}; const \[submitting/;
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
          
          try {
             const result = await catalogApi.search({ q: accession, page: 1, limit: 1, scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' });
             if (result.items.length > 0) {
                 const b = result.items[0];
                 setBookInfo({ title: b.title, authors: b.authors?.join(', ') ?? '', coverUrl: b.coverImagePath });
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
         const result = await catalogApi.search({ q: data, page: 1, limit: 1, scope: 'all', categoryId: '', author: '', publicationYear: '', availability: '' });
         if (result.items.length > 0) {
             setBookInfo({ title: result.items[0].title, authors: result.items[0].authors?.join(', ') ?? '', coverUrl: result.items[0].coverImagePath });
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
    
    if (data.includes('-')) {
        setSchoolId(data)
        setSuccess('Input logged successfully. Scan book next, or confirm checkout.')
    }
  }; const [submitting`;

code = code.replace(regex, newHandleScan);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
