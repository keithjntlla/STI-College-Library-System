const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/auth/AdminLoginPage.tsx', 'utf8');

// Remove role state (it probably defaults to Admin but let's check)
code = code.replace(/const \[role, setRole\] = useState<AuthRole>\('.*?'\)\n\s*/, '');

// Change login call
code = code.replace(/await login\(normalizedSchoolId, role, password\)/, 'await login(normalizedSchoolId, password)');

// Remove login_as error check
code = code.replace(/if \(!role\) nextErrors.login_as = 'Select the account role you are signing in as.'\n\s*/, '');

// Remove dropdown label (use a safer string-based approach)
const labelStart = '<label className="block"><span className="text-sm font-bold text-[#003399]">Login as</span>';
const labelEnd = '</label>';
const startIdx = code.indexOf(labelStart);
if (startIdx !== -1) {
  const endIdx = code.indexOf(labelEnd, startIdx) + labelEnd.length;
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

// Update error alert style
code = code.replace(/border-\[#003399\] bg-\[#FFF200\] px-4 py-3 text-sm font-semibold text-\[#003399\]/, 'border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600');

// Update button text to 'Log In'
code = code.replace(/\{busy \? 'Verifying account…' : 'Login'\}/, '{busy ? \'Verifying account…\' : \'Log In\'}');

fs.writeFileSync('apps/web/src/features/auth/AdminLoginPage.tsx', code);
