import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/login-page'
import { useMyOrganizations } from '@/features/onboarding/api'
import { OnboardingPage } from '@/features/onboarding/onboarding-page'
import { PlaceholderPage } from '@/features/settings/placeholder-page'
import { TodayPage } from '@/features/today/today-page'
import { AppLayout } from './layout'

function FullScreenMessage({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>
}

function Gate() {
  const { t } = useTranslation()
  const { session, loading } = useAuth()
  const orgs = useMyOrganizations()

  if (loading) return <FullScreenMessage text={t('common.loading')} />
  if (!session) return <LoginPage />
  if (orgs.isPending) return <FullScreenMessage text={t('common.loading')} />
  if (orgs.isError) return <FullScreenMessage text={t('common.error')} />

  const first = orgs.data[0]?.organizations
  if (!first) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<AppLayout orgName={first.name} />}>
        <Route index element={<TodayPage />} />
        <Route path="clients" element={<PlaceholderPage titleKey="nav.clients" />} />
        <Route path="leads" element={<PlaceholderPage titleKey="nav.leads" />} />
        <Route path="projects" element={<PlaceholderPage titleKey="nav.projects" />} />
        <Route path="invoices" element={<PlaceholderPage titleKey="nav.invoices" />} />
        <Route path="maintenance" element={<PlaceholderPage titleKey="nav.maintenance" />} />
        <Route path="outreach" element={<PlaceholderPage titleKey="nav.outreach" />} />
        <Route path="settings" element={<PlaceholderPage titleKey="nav.settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Gate />
    </BrowserRouter>
  )
}
