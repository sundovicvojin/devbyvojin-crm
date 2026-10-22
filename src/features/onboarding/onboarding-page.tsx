import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateOrganization } from './api'

const schema = z.object({
  name: z.string().trim().min(1, 'onboarding.nameRequired'),
  currency: z.enum(['EUR', 'RSD', 'USD']),
})
type Values = z.infer<typeof schema>

export function OnboardingPage() {
  const { t } = useTranslation()
  const create = useCreateOrganization()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', currency: 'EUR' } })

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">{t('onboarding.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.subtitle')}</p>
        </div>
        <Field label={t('onboarding.name')} error={errors.name?.message ? t(errors.name.message) : undefined}>
          <Input autoFocus {...register('name')} />
        </Field>
        <Field label={t('onboarding.currency')}>
          <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" {...register('currency')}>
            <option value="EUR">EUR</option>
            <option value="RSD">RSD</option>
            <option value="USD">USD</option>
          </select>
        </Field>
        {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
        <Button type="submit" className="w-full" disabled={create.isPending}>
          {create.isPending ? t('common.loading') : t('onboarding.create')}
        </Button>
      </form>
    </div>
  )
}
