const fs = require('fs');
let code = fs.readFileSync('src/features/dashboard/UserDashboardPage.tsx', 'utf8');

// Import StatusModal
code = code.replace(
  "import { AlertMessage, AlertTriangle",
  "import { AlertMessage, AlertTriangle, StatusModal"
);
if (!code.includes("StatusModal")) {
  code = code.replace(
    "import { AlertTriangle, ArrowRight",
    "import { AlertTriangle, ArrowRight, StatusModal"
  );
  if (!code.includes("StatusModal")) {
      code = code.replace(
        "import { Link } from 'react-router-dom'",
        "import { Link } from 'react-router-dom'\nimport { StatusModal } from '../../components/ui'"
      );
  }
}

// Replace error and notice inline alerts with StatusModal
code = code.replace(
  /\{error\?<div role="alert" className="mb-5 rounded-2xl bg-\[\#FFF200\] px-4 py-3 text-sm font-semibold text-\[\#003399\]">\{error\}<\/div>:null\}\{notice\?<div role="status" className="mb-5 rounded-2xl bg-\[\#003399\] px-4 py-3 text-sm font-semibold text-\[\#FFFFFF\]">\{notice\}<\/div>:null\}/,
  `{error ? <StatusModal type="error" description={error} onClose={() => setError('')} /> : null}
      {notice ? <StatusModal type="success" description={notice} onClose={() => setNotice('')} /> : null}`
);

fs.writeFileSync('src/features/dashboard/UserDashboardPage.tsx', code);
