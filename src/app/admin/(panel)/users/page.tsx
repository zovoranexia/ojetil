import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPageHeading, DataTable, Panel, Td, Th } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/config/locales";
import { adminDateTime } from "@/lib/admin-format";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/security/guards";
import { CreateUserForm, UserRowControls } from "./user-controls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("metaTitle") };
}

export default async function UsersPage() {
  const me = await requirePageAccess("users:manage", "/admin/users");
  const [users, t, tRoles, locale] = await Promise.all([
    db.user.findMany({
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, lockedUntil: true, createdAt: true },
    }),
    getTranslations("admin.users"),
    getTranslations("admin.roles"),
    getLocale() as Promise<AppLocale>,
  ]);
  const now = new Date();

  return (
    <>
      <AdminPageHeading title={t("title")} description={t("description")} />
      <Panel title={t("addTitle")} className="mb-6">
        <CreateUserForm />
      </Panel>
      <DataTable caption={t("tableCaption")}>
        <thead>
          <tr>
            <Th>{t("columns.user")}</Th>
            <Th>{t("columns.role")}</Th>
            <Th>{t("columns.lastSignIn")}</Th>
            <Th>{t("columns.status")}</Th>
            <Th>{t("columns.manage")}</Th>
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
                <span className="text-sm">{tRoles(`${u.role}.label`)}</span>
              </Td>
              <Td className="tabular-nums text-ink-secondary">{adminDateTime(u.lastLoginAt, locale)}</Td>
              <Td>
                {!u.isActive ? (
                  <Badge tone="neutral">{t("state.deactivated")}</Badge>
                ) : u.lockedUntil && u.lockedUntil > now ? (
                  <Badge tone="pending">{t("state.locked")}</Badge>
                ) : (
                  <Badge tone="verified">{t("state.active")}</Badge>
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
