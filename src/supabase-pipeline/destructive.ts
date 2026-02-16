const SUPABASE_DESTRUCTIVE_FLAG = 'ALLOW_DESTRUCTIVE_SUPABASE'

function isDestructiveFlagEnabled(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function assertDestructiveOperationAllowed(operation: string, details?: string): void {
  if (isDestructiveFlagEnabled(process.env[SUPABASE_DESTRUCTIVE_FLAG])) return

  const scope = details ? ` (${details})` : ''
  throw new Error(
    `[SAFEGUARD] Refusing destructive operation "${operation}"${scope}. ` +
      `Set ${SUPABASE_DESTRUCTIVE_FLAG}=1 to confirm.`
  )
}
