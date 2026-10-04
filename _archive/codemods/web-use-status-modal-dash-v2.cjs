const fs = require('fs');
let code = fs.readFileSync('src/features/dashboard/UserDashboardPage.tsx', 'utf8');

const regexError = /\{error \? <div role="alert"[\s\S]*?<\/div> : null\}/;
code = code.replace(regexError, '{error ? <StatusModal type="error" description={error} onClose={() => setError(\'\')} /> : null}');

const regexNotice = /\{notice \? <div role="status"[\s\S]*?<\/div> : null\}/;
code = code.replace(regexNotice, '{notice ? <StatusModal type="success" description={notice} onClose={() => setNotice(\'\')} /> : null}');

// Also need to add StatusModal to imports if it's not there!
if (!code.includes('StatusModal')) {
    code = code.replace(
        "import { Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge } from '../../components/ui'",
        "import { Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge, StatusModal } from '../../components/ui'"
    );
}

fs.writeFileSync('src/features/dashboard/UserDashboardPage.tsx', code);
