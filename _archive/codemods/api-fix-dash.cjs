const fs = require('fs');
let code = fs.readFileSync('src/modules/dashboard/dashboard.repository.ts', 'utf8');

code = code.replace(
  /const computedClearance = number\(summary\.active_loans\) > 0 \|\| money\(summary\.outstanding_fines\) > 0 \? 'Not Cleared' : 'Cleared'/,
  `const computedClearance = number(summary.active_loans) > 0 || money(summary.outstanding_fines) > 0 ? 'Not Cleared' : 'Cleared'
      const clearanceReasons = [
        number(summary.active_loans) > 0 ? \`\${number(summary.active_loans)} unreturned \${number(summary.active_loans) === 1 ? 'book' : 'books'}\` : '',
        money(summary.outstanding_fines) > 0 ? \`PHP \${money(summary.outstanding_fines).toFixed(2)} unpaid obligations\` : '',
      ].filter(Boolean)
      const computedClearanceReason = clearanceReasons.join('; ') || 'No library obligations'`
);

code = code.replace(
  /clearanceStatus: summary\.override_status \? String\(summary\.override_status\) : computedClearance \}/,
  `clearanceStatus: summary.override_status ? String(summary.override_status) : computedClearance, clearanceReason: summary.override_status ? 'Authorized override' : computedClearanceReason }`
);

code = code.replace(
  /clearanceStatus:'Cleared'\}/,
  `clearanceStatus:'Cleared', clearanceReason: 'No library obligations'}`
);

fs.writeFileSync('src/modules/dashboard/dashboard.repository.ts', code);
