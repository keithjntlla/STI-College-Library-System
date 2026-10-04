const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/dashboard/UserDashboardPage.tsx', 'utf8');

code = code.replace(
    "import { Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge } from '../../components/ui'",
    "import { Button, CardLink, PageHeader, SectionCard, StatCard, StatusBadge, StatusModal } from '../../components/ui'"
);

fs.writeFileSync('apps/web/src/features/dashboard/UserDashboardPage.tsx', code);
