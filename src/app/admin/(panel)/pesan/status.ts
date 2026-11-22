import type { ContactMessageStatus } from "@prisma/client";

export const MESSAGE_STATUSES = ["NEW", "READ", "ARCHIVED"] as const satisfies readonly ContactMessageStatus[];

export const MESSAGE_STATUS_TONE = { NEW: "pending", READ: "neutral", ARCHIVED: "info" } as const satisfies Record<ContactMessageStatus, string>;
