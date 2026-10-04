const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

// 1. Import StatusModal
code = code.replace(
  "import { AlertMessage, ConfirmModal",
  "import { AlertMessage, ConfirmModal, StatusModal"
);
if (!code.includes("StatusModal")) {
  code = code.replace("import { AlertMessage", "import { AlertMessage, StatusModal");
}

// 2. Replace error and success rendering
// Old: 
// {error ? <AlertMessage type="error" description={error} /> : null}
// {success ? <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-4 py-3 font-semibold text-[#0b5ea2]"><CheckCircle2 size={18} />{success}</div> : null}

code = code.replace(
  /\{error \? <AlertMessage type="error" description=\{error\} \/> : null\}\r?\n\s*\{success \? <div role="status".*?<\/div> : null\}/g,
  `{error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
      {success ? <StatusModal type="success" description={success} onClose={() => setSuccess('')} /> : null}`
);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
