import { CalendarCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function TodayPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{t('today.title')}</h1>
      <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
        <CalendarCheck className="size-8 text-muted-foreground" />
        <p className="font-medium">{t('today.emptyTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('today.emptyBody')}</p>
      </div>
    </div>
  )
}
