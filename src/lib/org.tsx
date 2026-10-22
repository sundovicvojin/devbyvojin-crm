import { createContext, use, type ReactNode } from 'react'
import type { Currency } from '@/types/database'

export type CurrentOrg = { id: string; name: string; currency: Currency }

const OrgContext = createContext<CurrentOrg | null>(null)

export function OrgProvider({ org, children }: { org: CurrentOrg; children: ReactNode }) {
  return <OrgContext value={org}>{children}</OrgContext>
}

export function useOrg(): CurrentOrg {
  const org = use(OrgContext)
  if (!org) throw new Error('useOrg van OrgProvider-a')
  return org
}
