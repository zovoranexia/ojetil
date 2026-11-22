"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Sticky save/delete bar shared by every CMS editor. */
export function EditorActions({
  saving,
  canDelete,
  onDelete,
  deleteDescription,
  saveLabel = "Save changes",
}: {
  saving: boolean;
  canDelete: boolean;
  onDelete?: () => void;
  deleteDescription?: string;
  saveLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border-subtle bg-surface-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-between md:-mx-8 md:px-8">
      {canDelete && onDelete ? (
        <ConfirmDialog
          title="Delete permanently?"
          description={deleteDescription ?? "This cannot be undone. The deletion is recorded in the audit log."}
          confirmLabel="Delete"
          tone="destructive"
          onConfirm={onDelete}
          trigger={
            <Button type="button" variant="ghost" className="text-status-rejected hover:bg-status-rejected-bg" disabled={saving}>
              <Trash2 aria-hidden="true" /> Delete
            </Button>
          }
        />
      ) : (
        <span aria-hidden="true" />
      )}
      <Button type="submit" disabled={saving} aria-busy={saving}>
        {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
        {saving ? "Saving…" : saveLabel}
      </Button>
    </div>
  );
}
