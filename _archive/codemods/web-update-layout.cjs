const fs = require('fs');
let code = fs.readFileSync('src/layouts/PortalLayout.tsx', 'utf8');

code = code.replace('<main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8 relative z-10">', '<main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">');

code = code.replace(
  '<div className={cn("relative z-10 transition-all duration-300", desktopCollapsed ? "lg:pl-0" : "lg:pl-64")}>',
  '<div className={cn("relative z-10 transition-all duration-300", desktopCollapsed ? "lg:pl-0" : "lg:pl-64")} style={{ "--sidebar-offset": desktopCollapsed ? "0px" : "256px" } as React.CSSProperties}>'
);

fs.writeFileSync('src/layouts/PortalLayout.tsx', code);
