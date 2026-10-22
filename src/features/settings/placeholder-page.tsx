import { useTranslation } from 'react-i18next'

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t('placeholder.soon')}</p>
    </div>
  )
}
