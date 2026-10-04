const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/auth/LoginPage.tsx', 'utf8');

code = code.replace(/await login\(normalizedSchoolId, password\)/, "await login(normalizedSchoolId, 'Student', password)");

fs.writeFileSync('apps/web/src/features/auth/LoginPage.tsx', code);
