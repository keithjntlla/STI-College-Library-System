const fs = require('fs');
let code = fs.readFileSync('src/features/catalog/AssetCodeModal.tsx', 'utf8');

code = code.replace(/z-\[100\]/g, 'z-[999]');
code = code.replace(/Barcode and QR code/g, 'QR Code');
code = code.replace(/<div className="grid gap-5 lg:grid-cols-\[minmax\(260px,0\.8fr\)_minmax\(460px,1\.4fr\)\]\">[\s\S]*?<\/div><\/>/, 
`<div className="flex flex-col items-center justify-center max-w-sm mx-auto">
            <article className="w-full rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] p-4"><div className="mb-3 flex items-center justify-center gap-2 font-bold text-[#0b5ea2]"><QrCode size={18} /> Asset QR Code</div><div className="flex min-h-[252px] items-center justify-center rounded-xl border border-[#0b5ea2]/15 p-4 bg-zinc-50"><AssetCodeCanvas dataUri={asset.qrCodeData} kind="QR code" testId="admin-qr-code" /></div><button disabled={downloading !== null} onClick={() => void download('qr')} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-white disabled:opacity-50"><Download size={16} />{downloading === 'qr' ? 'Downloading...' : 'Download Print Label (QR)'}</button></article>
          </div></>`
);

fs.writeFileSync('src/features/catalog/AssetCodeModal.tsx', code);
