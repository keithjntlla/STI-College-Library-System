const fs = require('fs');
let code = fs.readFileSync('src/modules/users/profile-avatar.routes.ts', 'utf8');
code = code.replace("await db.execute(", "await db.execute<RowDataPacket[]>(");
fs.writeFileSync('src/modules/users/profile-avatar.routes.ts', code);

let circ = fs.readFileSync('src/modules/circulation/circulation.service.ts', 'utf8');
circ = circ.replace("await connection.execute(\"SELECT COUNT(*) as unpaid", "await connection.execute<RowDataPacket[]>(\"SELECT COUNT(*) as unpaid");
circ = circ.replace("await connection.execute(\"SELECT COUNT(*) as overdue", "await connection.execute<RowDataPacket[]>(\"SELECT COUNT(*) as overdue");
fs.writeFileSync('src/modules/circulation/circulation.service.ts', circ);
