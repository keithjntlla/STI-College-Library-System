const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const heroRegex = /<section className="relative overflow-hidden bg-\[#003399\] dark:bg-\[#002266\] pb-24 border-b-4 border-\[#FFF200\]">/;

const newHero = `<section className="relative overflow-hidden pb-24 border-b-4 border-[#FFF200]">
        
        {/* Background Image with Heavy Blue Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/library-hero.webp')" }}
        >
          {/* Dual Overlay: Solid blue base + gradient for depth */}
          <div className="absolute inset-0 bg-[#003399]/85 dark:bg-[#001133]/90"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#003399] via-transparent to-transparent opacity-80"></div>
        </div>`;

code = code.replace(heroRegex, newHero);
fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
