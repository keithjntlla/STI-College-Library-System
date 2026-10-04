const fs = require('fs');
let code = fs.readFileSync('src/modules/users/profile-avatar.routes.ts', 'utf8');

const target = "profileAvatarRouter.post('/me',";
const newRoute = `profileAvatarRouter.get('/user/:schoolId', requireJwtRoles('Admin', 'Librarian'), handle(async (request, response) => {
  requireSupabase()
  const schoolId = String(request.params.schoolId)
  const [rows] = await db.execute(
    \`SELECT p.storage_path 
       FROM profile_avatar_submissions p 
       JOIN accounts a ON a.account_id = p.account_id 
      WHERE a.school_id = ? AND p.status = 'Approved' 
      ORDER BY p.reviewed_at DESC LIMIT 1\`, [schoolId]
  )
  const approved = rows[0]
  response.json({ success: true, data: {
    avatarUrl: approved ? await signedUrl(String(approved.storage_path)) : null
  } })
}))

profileAvatarRouter.post('/me',`;

code = code.replace(target, newRoute);
fs.writeFileSync('src/modules/users/profile-avatar.routes.ts', code);
