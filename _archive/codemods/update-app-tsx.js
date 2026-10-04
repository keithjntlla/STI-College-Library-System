const fs = require('fs');
let code = fs.readFileSync('apps/web/src/App.tsx', 'utf8');

// Add import
if (!code.includes('ForgotPasswordPage')) {
  code = code.replace(/import \{ AdminLoginPage \} from '.\/features\/auth\/AdminLoginPage'/, "import { AdminLoginPage } from './features/auth/AdminLoginPage'\nimport { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'");
}

// Change root route to PublicCatalog (or just BookCatalog)
// Currently it is <Route path="/" element={<AuthenticatedHome />} />
// I will change it to BookCatalog
code = code.replace(/<Route path="\/" element=\{<AuthenticatedHome \/>\} \/>/, '<Route path="/" element={<BookCatalog />} />');

// Add forgot password route
if (!code.includes('path="/forgot-password"')) {
  code = code.replace(/<Route path="\/register" element=\{<RegistrationPage \/>\} \/>/, '<Route path="/register" element={<RegistrationPage />} />\n      <Route path="/forgot-password" element={<ForgotPasswordPage />} />');
}

fs.writeFileSync('apps/web/src/App.tsx', code);
