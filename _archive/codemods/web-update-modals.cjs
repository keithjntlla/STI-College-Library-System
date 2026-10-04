const fs = require('fs');
const path = require('path');

const dir = 'src/features/catalog';

// 1. BookQuotationModal.tsx
let bqm = fs.readFileSync(path.join(dir, 'BookQuotationModal.tsx'), 'utf8');
bqm = bqm.replace('className="fixed inset-0 z-[100] overflow-y-auto bg-[#0b5ea2]/75 p-4"', 'className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"');
bqm = bqm.replace('className="mx-auto my-6 w-full max-w-xl rounded-2xl bg-white p-6 text-[#0b5ea2]"', 'className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-[#0b5ea2]"');
fs.writeFileSync(path.join(dir, 'BookQuotationModal.tsx'), bqm);

// 2. AddMultipleCopiesModal.tsx
let amc = fs.readFileSync(path.join(dir, 'AddMultipleCopiesModal.tsx'), 'utf8');
amc = amc.replace('className="fixed inset-0 z-50 overflow-y-auto bg-[#0b5ea2]/75 p-4"', 'className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"');
amc = amc.replace('className="mx-auto my-8 w-full max-w-md rounded-2xl bg-white p-6 text-[#0b5ea2]"', 'className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-[#0b5ea2]"');
fs.writeFileSync(path.join(dir, 'AddMultipleCopiesModal.tsx'), amc);

// 3. AddResearchModal.tsx
let arm = fs.readFileSync(path.join(dir, 'AddResearchModal.tsx'), 'utf8');
arm = arm.replace('className="fixed inset-0 z-50 overflow-y-auto bg-[#0b5ea2]/75 p-4"', 'className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"');
arm = arm.replace('className="mx-auto my-8 w-full max-w-2xl rounded-2xl bg-white p-6 text-[#0b5ea2]"', 'className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-[#0b5ea2]"');
fs.writeFileSync(path.join(dir, 'AddResearchModal.tsx'), arm);

// 4. ChangeTitleCategoryModal.tsx
let ctc = fs.readFileSync(path.join(dir, 'ChangeTitleCategoryModal.tsx'), 'utf8');
ctc = ctc.replace('className="fixed inset-0 z-[100] overflow-y-auto bg-[#0b5ea2]/75 p-4"', 'className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"');
ctc = ctc.replace('className="mx-auto my-12 w-full max-w-md rounded-2xl bg-white p-6 text-[#0b5ea2]"', 'className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-[#0b5ea2]"');
fs.writeFileSync(path.join(dir, 'ChangeTitleCategoryModal.tsx'), ctc);

// 5. CatalogManagementPage.tsx (Archive modal)
let cmp = fs.readFileSync(path.join(dir, 'CatalogManagementPage.tsx'), 'utf8');
cmp = cmp.replace('className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b5ea2]/75 p-4"', 'className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0b5ea2]/75 p-4 backdrop-blur-sm"');
fs.writeFileSync(path.join(dir, 'CatalogManagementPage.tsx'), cmp);

console.log('Done simple modals');
