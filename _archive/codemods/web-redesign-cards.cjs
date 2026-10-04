const fs = require('fs');
let code = fs.readFileSync('src/features/circulation/AdminCirculationMonitor.tsx', 'utf8');

const regexStudent = /\{\/\* Student Profile Card \*\/\}[\s\S]*?<\/div>(\s*)\{\/\* Book Profile Card \*\/\}/;
const newStudent = `{/* Student Profile Card */}
            <div className="flex flex-col gap-4 rounded-3xl border border-[#0b5ea2]/10 bg-zinc-50 p-5">
                <div className="flex flex-col items-center gap-3 text-center">
                    {studentInfo?.avatarUrl ? (
                        <img src={studentInfo.avatarUrl} alt="Student" className="h-32 w-32 rounded-2xl object-cover shadow-md border-4 border-white" />
                    ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-[#0b5ea2]/10 text-[#0b5ea2] shadow-sm border-4 border-white">
                            <UserCircle size={64} />
                        </div>
                    )}
                    <div className="w-full overflow-hidden">
                        {studentInfo ? (
                            <>
                                <h3 className="truncate text-lg font-black text-[#0b5ea2]">{studentInfo.name}</h3>
                                <p className="truncate text-sm font-bold text-[#0b5ea2]/70">{schoolId} &bull; {studentInfo.role}</p>
                                <p className="truncate text-xs font-semibold text-[#0b5ea2]/60">{studentInfo.program}</p>
                            </>
                        ) : (
                            <div className="flex h-[72px] flex-col items-center justify-center">
                                <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for student scan...</h3>
                            </div>
                        )}
                    </div>
                </div>
                <input required value={schoolId} onChange={(e) => setSchoolId(e.target.value)} placeholder="Manual School ID e.g. 09-0123" className="mt-auto h-12 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-4 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10 text-center" />
            </div>$1{/* Book Profile Card */}`;

code = code.replace(regexStudent, newStudent);

const regexBook = /\{\/\* Book Profile Card \*\/\}[\s\S]*?<\/div>(\s*)<\/div>(\s*)<div className="flex justify-end/;
const newBook = `{/* Book Profile Card */}
            <div className="flex flex-col gap-4 rounded-3xl border border-[#0b5ea2]/10 bg-zinc-50 p-5">
                <div className="flex flex-col items-center gap-3 text-center">
                    {bookInfo?.coverUrl ? (
                        <img src={bookInfo.coverUrl} alt="Book" className="h-32 w-24 rounded-lg object-cover shadow-md border-4 border-white" />
                    ) : (
                        <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-[#0b5ea2]/10 text-[#0b5ea2] shadow-sm border-4 border-white">
                            <BookText size={48} />
                        </div>
                    )}
                    <div className="w-full overflow-hidden">
                        {bookInfo ? (
                            <>
                                <h3 className="line-clamp-2 text-base font-black leading-tight text-[#0b5ea2]">{bookInfo.title}</h3>
                                <p className="mt-1 truncate text-xs font-semibold text-[#0b5ea2]/70">{bookInfo.authors}</p>
                                <p className="mt-1 truncate text-xs font-bold text-[#0b5ea2]/60">{barcode}</p>
                            </>
                        ) : (
                            <div className="flex h-[72px] flex-col items-center justify-center">
                                <h3 className="font-semibold italic text-[#0b5ea2]/50">Waiting for book scan...</h3>
                            </div>
                        )}
                    </div>
                </div>
                <input required value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Manual Accession e.g. ACC-123" className="mt-auto h-12 w-full rounded-xl border border-[#0b5ea2]/20 bg-white px-4 font-mono text-sm font-bold text-[#0b5ea2] outline-none focus:ring-2 focus:ring-[#0b5ea2]/10 text-center" />
            </div>$1</div>$2<div className="flex justify-end`;

code = code.replace(regexBook, newBook);

fs.writeFileSync('src/features/circulation/AdminCirculationMonitor.tsx', code);
