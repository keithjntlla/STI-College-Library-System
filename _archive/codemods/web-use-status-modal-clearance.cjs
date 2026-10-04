const fs = require('fs');
let code = fs.readFileSync('src/features/clearance/AdminClearancePage.tsx', 'utf8');

// Import StatusModal
code = code.replace(
  "import { Button, StatusBadge",
  "import { Button, StatusBadge, StatusModal"
);

if (!code.includes("StatusModal")) {
  code = code.replace("import { Button, PageHeader", "import { Button, PageHeader, StatusModal");
}
if (!code.includes("StatusModal")) {
  code = "import { StatusModal } from '../../components/ui';\n" + code;
}

// Replace error inline alert with StatusModal
code = code.replace(
  /\{error \? <div role="alert" className="mb-5 flex gap-2 rounded-xl bg-\[\#FFF200\] p-4 font-bold text-\[\#003399\]"><AlertTriangle size=\{18\} \/>\{error\}<\/div> : null\}/,
  "{error ? <StatusModal type=\"error\" description={error} onClose={() => setError('')} /> : null}"
);

fs.writeFileSync('src/features/clearance/AdminClearancePage.tsx', code);
