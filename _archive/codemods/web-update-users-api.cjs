const fs = require('fs');
let code = fs.readFileSync('src/features/users/users-api.ts', 'utf8');

const target = "detail: async (id: number) => (await request<UserDetail>(`/api/v1/admin/users/${id}`)).data,";
const newMethod = `detail: async (id: number) => (await request<UserDetail>(\`/api/v1/admin/users/\${id}\`)).data,
  getAvatar: async (schoolId: string) => (await request<{ avatarUrl: string | null }>(\`/api/v1/profile/avatar/user/\${encodeURIComponent(schoolId)}\`)).data,`;

code = code.replace(target, newMethod);
fs.writeFileSync('src/features/users/users-api.ts', code);
