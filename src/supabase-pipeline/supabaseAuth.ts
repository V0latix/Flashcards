function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

export function projectRefFromSupabaseUrl(url: string): string | null {
  const m = url.trim().match(/^https?:\/\/([a-z0-9]+)\.supabase\.co\/?$/i)
  return m?.[1] ?? null
}

export function assertServiceRoleKeyMatchesUrl(supabaseUrl: string, serviceRoleKey: string) {
  const refFromUrl = projectRefFromSupabaseUrl(supabaseUrl)
  const payload = decodeJwtPayload(serviceRoleKey)
  const refFromKey = (payload?.ref as string | undefined) ?? (payload?.project_ref as string | undefined)
  const role = payload?.role as string | undefined

  if (!payload) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY does not look like a JWT')
  }
  if (!refFromUrl) {
    throw new Error('SUPABASE_URL does not look like https://<project-ref>.supabase.co')
  }
  if (refFromKey && refFromKey !== refFromUrl) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY project ref (${refFromKey}) does not match SUPABASE_URL project ref (${refFromUrl}).`
    )
  }
  if (role && role !== 'service_role') {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY role is "${role}", expected "service_role".`)
  }
}

