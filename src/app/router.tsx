import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/login-page'
import { useMyOrganizations } from '@/features/onboarding/api'
import { OnboardingPage } from '@/features/onboarding/onboarding-page'
import { ClientDetailPage } from '@/features/clients/client-detail-page'
import { ClientsPage } from '@/features/clients/clients-page'
import { ProjectDetailPage } from '@/features/projects/project-detail-page'
import { ProjectsPage } from '@/features/projects/projects-page'
import { LeadsPage } from '@/features/leads/leads-page'
import { OrgProvider } from '@/lib/org'
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
    <OrgProvider org={{ id: first.id, name: first.name, currency: first.default_currency }}>
    <Routes>
      <Route element={<AppLayout orgName={first.name} />}>
        <Route index element={<TodayPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="invoices" element={<PlaceholderPage titleKey="nav.invoices" />} />
        <Route path="maintenance" element={<PlaceholderPage titleKey="nav.maintenance" />} />
        <Route path="outreach" element={<PlaceholderPage titleKey="nav.outreach" />} />
        <Route path="settings" element={<PlaceholderPage titleKey="nav.settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </OrgProvider>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Gate />
    </BrowserRouter>
  )
}
