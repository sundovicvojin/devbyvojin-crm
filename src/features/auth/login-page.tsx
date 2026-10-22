import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  email: z.string().email('auth.invalidEmail'),
  password: z.string(),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  async function onSubmit(values: Values) {
    setError(null)
    setMessage(null)
    if (values.password.length < 8) {
      setError(t('auth.shortPassword'))
      return
    }
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp(values)
      if (error) setError(error.message)
      else if (!data.session) setMessage(t('auth.checkEmailConfirm'))
    }
  }

  async function sendMagicLink() {
    setError(null)
    setMessage(null)
    if (!(await trigger('email'))) return
    const { error } = await supabase.auth.signInWithOtp({
      email: getValues('email'),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setMessage(t('auth.magicLinkSent'))
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold">{mode === 'signin' ? t('auth.title') : t('auth.signUpTitle')}</h1>
        <Field label={t('auth.email')} error={errors.email?.message ? t(errors.email.message) : undefined}>
          <Input type="email" autoComplete="email" autoFocus {...register('email')} />
        </Field>
        <Field label={t('auth.password')}>
          <Input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} {...register('password')} />
        </Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => void sendMagicLink()}>
          {t('auth.magicLink')}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? `${t('auth.noAccount')} ${t('auth.signUp')}` : `${t('auth.haveAccount')} ${t('auth.signIn')}`}
        </button>
      </form>
    </div>
  )
}
