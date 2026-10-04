const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/PublicCatalog.tsx', 'utf8');

const styleBlock = `
<style>
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    animation: marquee 40s linear infinite;
  }
  .animate-marquee:hover {
    animation-play-state: paused;
  }
</style>
`;

code = code.replace('export function PublicCatalog() {', styleBlock + '\nexport function PublicCatalog() {');

const newHeroEnd = `            </div>

            {/* Book Marquee */}
            <div className="mt-16 w-[100vw] relative left-1/2 -ml-[50vw] overflow-hidden py-4 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex w-max animate-marquee gap-6 px-6">
                {[
                  '9780060935467.jpg', '9780062316097.jpg', '9780134610993.jpg', '9780135957059.jpg',
                  '9780201633610.jpg', '9780262033848.jpg', '9780307887894.jpg', '9780374533557.jpg',
                  '9780441172719.jpg', '9780451524935.jpg', '9780521809269.jpg', '9780702077050.jpg',
                  '9780743273565.jpg', '9781305585126.jpg'
                ].map((cover, i) => (
                  <div key={i} className="w-24 sm:w-32 aspect-[3/4] flex-shrink-0 rounded-lg overflow-hidden shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <img src={\`/covers/\${cover}\`} alt="Book Cover" className="w-full h-full object-cover" />
                  </div>
                ))}
                {[
                  '9780060935467.jpg', '9780062316097.jpg', '9780134610993.jpg', '9780135957059.jpg',
                  '9780201633610.jpg', '9780262033848.jpg', '9780307887894.jpg', '9780374533557.jpg',
                  '9780441172719.jpg', '9780451524935.jpg', '9780521809269.jpg', '9780702077050.jpg',
                  '9780743273565.jpg', '9781305585126.jpg'
                ].map((cover, i) => (
                  <div key={\`dup-\${i}\`} className="w-24 sm:w-32 aspect-[3/4] flex-shrink-0 rounded-lg overflow-hidden shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                    <img src={\`/covers/\${cover}\`} alt="Book Cover" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>`;

code = code.replace(`            </div>
          </div>
        </div>
      </section>`, newHeroEnd);

fs.writeFileSync('src/features/catalog/PublicCatalog.tsx', code);
