export type PackSummary = {
  id: number | string
  slug: string
  title: string | null
  description: string | null
  tags: string[]
}

import type { NavigatorScreenParams } from '@react-navigation/native'

export type TabParamList = {
  Home: undefined
  Library: undefined
  Packs: undefined
  Settings: undefined
  Stats: undefined
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined
  ReviewSession: undefined
  PackDetail: { slug: string; pack?: PackSummary }
  SupabaseDebug: undefined
  MediaTest: undefined
}
