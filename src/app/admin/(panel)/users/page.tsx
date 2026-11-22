import type { Metadata } from "next";
import { AdminPageHeading, DataTable, Panel, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/config/rbac";
import { adminDateTime } from "@/lib/admin-format";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/security/guards";
import { CreateUserForm, UserRowControls } from "./user-controls";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requirePageAccess("users:manage", "/admin/users");
  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, lockedUntil: true, createdAt: true },
  });
  const now = new Date();

  return (
    <>
      <AdminPageHeading
        title="Users & roles"
        description="Staff accounts are never deleted — deactivate them to preserve the audit trail. Role changes and deactivation sign the person out immediately."
      />
      <Panel title="Add staff account" className="mb-6">
        <CreateUserForm />
      </Panel>
      <DataTable caption="Staff accounts">
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Last sign-in</Th>
            <Th>Status</Th>
            <Th>Manage</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.isActive ? "hover:bg-paper" : "bg-surface-muted/50"}>
              <Td>
                <span className="font-medium">{u.name}</span>
                <span className="block text-xs text-ink-secondary">{u.email}</span>
              </Td>
              <Td>
                <span className="text-sm">{ROLE_LABELS[u.role].label}</span>
              </Td>
              <Td className="tabular-nums text-ink-secondary">{adminDateTime(u.lastLoginAt)}</Td>
              <Td>
                {!u.isActive ? (
                  <Badge tone="neutral">Deactivated</Badge>
                ) : u.lockedUntil && u.lockedUntil > now ? (
                  <Badge tone="pending">Locked</Badge>
                ) : (
                  <Badge tone="verified">Active</Badge>
                )}
              </Td>
              <Td>
                <UserRowControls id={u.id} name={u.name} role={u.role} isActive={u.isActive} isSelf={u.id === me.id} />
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
