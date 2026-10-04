const fs = require('fs');
let code = fs.readFileSync('src/modules/circulation/circulation.service.ts', 'utf8');

const target = "if (activeCount >= 2 && !alreadyActive) throw new HttpError(422, 'STUDENT_BORROW_LIMIT_REACHED', 'Transaction Blocked: Students cannot exceed 2 books', { activeCount, limit: 2 })";

const replacement = `if (activeCount >= 2 && !alreadyActive) throw new HttpError(422, 'STUDENT_BORROW_LIMIT_REACHED', 'Transaction Blocked: Students cannot exceed 2 books', { activeCount, limit: 2 })

          // NEW: Strict Fines & Overdue Check
          const [finesRows] = await connection.execute("SELECT COUNT(*) as unpaid FROM fines WHERE user_id = ? AND payment_status = 'Unpaid'", [borrower.user_id])
          if (Number(finesRows[0]?.unpaid ?? 0) > 0) throw new HttpError(422, 'STUDENT_HAS_UNPAID_FINES', 'Transaction Blocked: This student has unpaid library fines that must be settled first.')
          
          const [overdueRows] = await connection.execute("SELECT COUNT(*) as overdue FROM borrow_transactions WHERE user_id = ? AND transaction_status = 'Overdue'", [borrower.user_id])
          if (Number(overdueRows[0]?.overdue ?? 0) > 0) throw new HttpError(422, 'STUDENT_HAS_OVERDUE_BOOKS', 'Transaction Blocked: This student has overdue books that must be returned first.')`;

code = code.replace(target, replacement);
fs.writeFileSync('src/modules/circulation/circulation.service.ts', code);
