const fs = require('fs');
let code = fs.readFileSync('src/features/dashboard/UserDashboardPage.tsx', 'utf8');

code = code.replace(
  '<p className="mt-0.5 text-xs text-red-600 dark:text-red-400">Please resolve your account obligations or unpaid fines to restore full privileges.</p>',
  '{data.summary.clearanceReason ? <p className="mt-0.5 text-xs font-semibold text-red-600 dark:text-red-400">Reason: {data.summary.clearanceReason}</p> : <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">Please resolve your account obligations or unpaid fines to restore full privileges.</p>}'
);

fs.writeFileSync('src/features/dashboard/UserDashboardPage.tsx', code);
