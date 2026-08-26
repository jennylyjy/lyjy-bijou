/** Defense-in-depth UI check. Real authorization must be enforced by Firestore rules. */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const configured = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // Keep existing installations working until the allow-list is configured.
  if (!configured?.length) return true;
  return Boolean(email && configured.includes(email.toLowerCase()));
}
