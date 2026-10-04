const fs = require('fs');
let code = fs.readFileSync('src/features/auth/LoginPage.tsx', 'utf8');

// Update error alert style
code = code.replace(/border-\[\#003399\] bg-\[\#FFF200\] px-4 py-3 text-sm font-semibold text-\[\#003399\]/g, 'border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600');

// Add forgot password link beside 'Show password'
code = code.replace(
  /(<label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-\[\#0b5ea2\]\/70">.*?<\/label>)/,
  '<div className="flex items-center justify-between">$1<Link to="/forgot-password" className="text-sm font-bold text-[#0b5ea2] hover:underline">Forgot Password?</Link></div>'
);

// Fallback if the previous regex didn't match (because colors might be different)
code = code.replace(
  /(<label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-\[\#003399\]\/70">.*?<\/label>)/,
  '<div className="flex items-center justify-between">$1<Link to="/forgot-password" className="text-sm font-bold text-[#003399] hover:underline">Forgot Password?</Link></div>'
);

// Update button text to 'Log In' instead of 'Login'
code = code.replace(/\{busy \? 'Verifying account?' : 'Login'\}/g, '{busy ? \'Verifying account?\' : \'Log In\'}');

// Remove admin link at bottom
const adminLinkStart = '<div className="mt-6 border-t border-[#003399]/10 pt-6 text-center">';
const adminLinkEnd = '</div>';
const adminStartIdx = code.indexOf(adminLinkStart);
if (adminStartIdx !== -1) {
  const adminEndIdx = code.indexOf(adminLinkEnd, adminStartIdx) + adminLinkEnd.length;
  code = code.substring(0, adminStartIdx) + code.substring(adminEndIdx);
}

fs.writeFileSync('src/features/auth/LoginPage.tsx', code);
