export {
  decodeJwtPayload,
  projectRefFromSupabaseUrl,
  assertServiceRoleKeyMatchesUrl,
} from "../pipeline-shared/supabaseAuth";
import { projectRefFromSupabaseUrl } from "../pipeline-shared/supabaseAuth";

export function projectRefFromDbUrl(dbUrl: string): string | null {
  try {
    const u = new URL(dbUrl.trim());
    const host = u.hostname;
    // Standard direct DB host: db.<ref>.supabase.co
    const m1 = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (m1) return m1[1];
    // Pooler host patterns:
    // - legacy: <ref>.pooler.supabase.com
    // - current: <region>.pooler.supabase.com, with user like `postgres.<ref>` (or `<dbuser>.<ref>`)
    const m2 = host.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/i);
    if (m2) return m2[1];
    if (host.toLowerCase().endsWith(".pooler.supabase.com")) {
      const user = decodeURIComponent(u.username || "");
      const parts = user.split(".").filter(Boolean);
      const candidate = parts.length >= 2 ? parts[parts.length - 1] : null;
      if (candidate && /^[a-z0-9]{10,}$/i.test(candidate)) return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

export function assertDbUrlMatchesUrl(supabaseUrl: string, dbUrl: string) {
  const refFromUrl = projectRefFromSupabaseUrl(supabaseUrl);
  const refFromDb = projectRefFromDbUrl(dbUrl);
  if (!refFromUrl) {
    throw new Error(
      "SUPABASE_URL does not look like https://<project-ref>.supabase.co",
    );
  }
  if (!refFromDb) {
    throw new Error(
      "SUPABASE_DB_URL does not look like a Supabase Postgres connection URL",
    );
  }
  if (refFromDb !== refFromUrl) {
    throw new Error(
      `SUPABASE_DB_URL project ref (${refFromDb}) does not match SUPABASE_URL project ref (${refFromUrl}).`,
    );
  }
}
