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
  let digits = value?.replace(/\D/g, "") || "";
  if (digits.startsWith("0011")) digits = digits.slice(4);

  const countryCodeMatch = digits.match(/^610?([2-8]\d{8})$/);
  if (countryCodeMatch) return `61${countryCodeMatch[1]}`;

  const localMatch = digits.match(/^0([2-8]\d{8})$/);
  if (localMatch) return `61${localMatch[1]}`;

  return digits;
}

/**
 * Includes the historical digit-only formats that may already be stored in
 * lead_identities while new writes use the canonical Australian 61... form.
 */
export function importPhoneIdentityVariants(value?: string | null) {
  const digits = value?.replace(/\D/g, "") || "";
  const canonical = normaliseImportPhone(value);
  if (!canonical) return [];

  const variants = new Set([canonical, digits]);
  const australianMatch = canonical.match(/^61([2-8]\d{8})$/);
  if (australianMatch) {
    variants.add(`0${australianMatch[1]}`);
    variants.add(`610${australianMatch[1]}`);
  }

  variants.delete("");
  return [...variants];
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
