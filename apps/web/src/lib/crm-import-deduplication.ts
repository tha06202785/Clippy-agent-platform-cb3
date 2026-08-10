export type ImportIdentity = {
  email?: string | null;
  phone?: string | null;
};

export type ExistingImportIdentity = ImportIdentity & { id: string };

export type DuplicateReason =
  | "missing_identity"
  | "duplicate_email"
  | "duplicate_phone"
  | "conflicting_identity";

export function normaliseImportEmail(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function normaliseImportPhone(value?: string | null) {
  return value?.replace(/\D/g, "") || "";
}

export function createImportDuplicateGuard(existing: ExistingImportIdentity[]) {
  const emailOwners = new Map<string, string>();
  const phoneOwners = new Map<string, string>();

  for (const lead of existing) {
    const email = normaliseImportEmail(lead.email);
    const phone = normaliseImportPhone(lead.phone);
    if (email && !emailOwners.has(email)) emailOwners.set(email, lead.id);
    if (phone && !phoneOwners.has(phone)) phoneOwners.set(phone, lead.id);
  }

  return (identity: ImportIdentity): DuplicateReason | null => {
    const email = normaliseImportEmail(identity.email);
    const phone = normaliseImportPhone(identity.phone);
    if (!email && !phone) return "missing_identity";

    const emailOwner = email ? emailOwners.get(email) : undefined;
    const phoneOwner = phone ? phoneOwners.get(phone) : undefined;
    if (emailOwner && phoneOwner && emailOwner !== phoneOwner) {
      return "conflicting_identity";
    }
    if (emailOwner) return "duplicate_email";
    if (phoneOwner) return "duplicate_phone";

    const batchOwner = `batch:${email || phone}`;
    if (email) emailOwners.set(email, batchOwner);
    if (phone) phoneOwners.set(phone, batchOwner);
    return null;
  };
}
