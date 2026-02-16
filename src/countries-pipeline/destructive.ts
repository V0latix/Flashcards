const COUNTRIES_DESTRUCTIVE_FLAG = 'ALLOW_DESTRUCTIVE_COUNTRIES'

function isDestructiveFlagEnabled(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

export function assertDestructiveOperationAllowed(operation: string, details?: string): void {
  if (isDestructiveFlagEnabled(process.env[COUNTRIES_DESTRUCTIVE_FLAG])) return

  const scope = details ? ` (${details})` : ''
  throw new Error(
    `[SAFEGUARD] Refusing destructive operation "${operation}"${scope}. ` +
      `Set ${COUNTRIES_DESTRUCTIVE_FLAG}=1 to confirm.`
  )
}
