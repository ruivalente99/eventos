import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, globalRole: true, createdAt: true, allowedThemes: true,
      eventRoles: { include: { event: true } },
    },
    orderBy: { name: "asc" },
  });
  return <UsersManager initialUsers={users} />;
}
