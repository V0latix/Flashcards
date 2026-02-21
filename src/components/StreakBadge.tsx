import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../supabase/client'

type StreakState = {
  loading: boolean
  count: number
  includesToday: boolean
  error: boolean
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const previousDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return toIsoDate(date)
}

const computeStreak = (doneDays: Set<string>, today: string) => {
  const includesToday = doneDays.has(today)
  let cursor = includesToday ? today : previousDate(today)
  let count = 0

  while (doneDays.has(cursor)) {
    count += 1
    cursor = previousDate(cursor)
  }

  return { count, includesToday }
}

function StreakBadge() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const userId = user?.id ?? null
  const [refreshToken, setRefreshToken] = useState(0)
  const [state, setState] = useState<StreakState>({
    loading: true,
    count: 0,
    includesToday: false,
    error: false
  })

  useEffect(() => {
    const triggerRefresh = () => {
      setRefreshToken((prev) => prev + 1)
    }

    window.addEventListener('focus', triggerRefresh)
    window.addEventListener('daily-status-updated', triggerRefresh as EventListener)

    return () => {
      window.removeEventListener('focus', triggerRefresh)
      window.removeEventListener('daily-status-updated', triggerRefresh as EventListener)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadStreak = async () => {
      if (authLoading) {
        return
      }

      if (!userId) {
        if (!cancelled) {
          setState({ loading: false, count: 0, includesToday: false, error: false })
        }
        return
      }

      if (!cancelled) {
        setState((prev) => ({ ...prev, loading: true, error: false }))
      }

      const today = toIsoDate(new Date())
      const { data, error } = await supabase
        .from('daily_cards_status')
        .select('day')
        .eq('user_id', userId)
        .eq('done', true)
        .lte('day', today)
        .order('day', { ascending: false })
        .limit(400)

      if (cancelled) {
        return
      }

      if (error) {
        console.error('streak query failed', error.message)
        setState({ loading: false, count: 0, includesToday: false, error: true })
        return
      }

      const doneDays = new Set(
        (data ?? [])
          .map((row) => (typeof row.day === 'string' ? row.day.slice(0, 10) : ''))
          .filter((day) => day.length === 10)
      )
      const streak = computeStreak(doneDays, today)
      setState({
        loading: false,
        count: streak.count,
        includesToday: streak.includesToday,
        error: false
      })
    }

    void loadStreak()

    return () => {
      cancelled = true
    }
  }, [authLoading, refreshToken, userId])

  const countLabel = useMemo(() => {
    if (state.loading || authLoading) {
      return '...'
    }
    if (!userId) {
      return '--'
    }
    return String(state.count)
  }, [authLoading, state.loading, state.count, userId])

  const statusLabel = useMemo(() => {
    if (state.loading || authLoading) {
      return t('streak.loading')
    }
    if (!userId) {
      return t('streak.signedOut')
    }
    if (state.error) {
      return t('streak.error')
    }
    if (state.includesToday) {
      return t('streak.todayDone')
    }
    return t('streak.todayPending')
  }, [authLoading, state.loading, state.error, state.includesToday, t, userId])

  const title = `${t('streak.label')}: ${countLabel} • ${statusLabel}`

  return (
    <div
      className={state.count > 0 ? 'streak-badge streak-badge-active' : 'streak-badge'}
      title={title}
      aria-label={title}
    >
      <span className="streak-icon" aria-hidden="true">
        🔥
      </span>
      <span className="streak-value">{countLabel}</span>
    </div>
  )
}

export default StreakBadge
