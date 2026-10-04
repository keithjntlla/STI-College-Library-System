const fs = require('fs');
let code = fs.readFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', 'utf8');

// Replace the grey gradient with a real photo
const oldBg = `<div className="absolute inset-0 bg-gradient-to-br from-amber-100/40 via-zinc-200/60 to-zinc-300/80 dark:from-zinc-800 dark:to-zinc-900 filter blur-xl scale-110"></div>`;
const newBg = `<div className="absolute inset-0 bg-[#003399]/20 mix-blend-overlay z-10"></div>
          <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1000" alt="Library Campus" className="absolute inset-0 w-full h-full object-cover" />`;
code = code.replace(oldBg, newBg);

// Remove the floating book container
const startMarker = '{/* Right Content: Floating Book Showcase */}';
const endMarker = '</section>';
const startIndex = code.indexOf(startMarker);
const endIndex = code.lastIndexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  // We need to keep the closing </div> of the flex container, which is right before </section>
  const before = code.substring(0, startIndex);
  const after = `
        </div>
      </section>`;
  code = before + after;
  fs.writeFileSync('apps/web/src/features/catalog/PublicCatalog.tsx', code);
  console.log('Success');
} else {
  console.log('Failed');
}
