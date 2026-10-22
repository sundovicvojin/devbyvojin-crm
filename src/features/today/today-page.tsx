import { CalendarCheck, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/empty-state'
import { useClients } from '@/features/clients/api'
import { formatDate, formatMoney, toDateInput } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { useCompleteReminder, useToday } from './api'

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{count}</span>
      </h2>
      <ul className="divide-y rounded-xl border">{children}</ul>
    </section>
  )
}

const rowCls = 'flex items-center justify-between gap-3 px-4 py-2.5 text-sm'

export function TodayPage() {
  const { t } = useTranslation()
  const org = useOrg()
  const today = useToday(org.id)
  const clients = useClients(org.id)
  const complete = useCompleteReminder()
  const clientName = (id: string) => clients.data?.find((c) => c.id === id)?.name ?? ''
  const todayStr = toDateInput(new Date())
  const overdueCls = (d: string) => (d < todayStr ? 'text-destructive' : 'text-muted-foreground')

  if (today.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (today.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const d = today.data
  const empty = d.leads.length + d.tasks.length + d.invoices.length + d.reminders.length + d.expiries.length === 0

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('today.title')}</h1>
        <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat('sr-Latn-RS', { dateStyle: 'full' }).format(new Date())}</p>
      </div>

      {empty ? (
        <EmptyState
          icon={CalendarCheck}
          title={t('today.emptyTitle')}
          body={t('today.emptyBody')}
        />
      ) : null}

      {d.invoices.length > 0 ? (
        <Section title={t('today.overdueInvoices')} count={d.invoices.length}>
          {d.invoices.map((i) => (
            <li key={i.id}>
              <Link to="/invoices" className={`${rowCls} hover:bg-muted/50`}>
                <span>{i.number} · {clientName(i.client_id)}</span>
                <span className="text-destructive">{formatMoney(i.total, i.currency)} · {formatDate(i.due_date)}</span>
              </Link>
            </li>
          ))}
        </Section>
      ) : null}

      {d.leads.length > 0 ? (
        <Section title={t('today.followUps')} count={d.leads.length}>
          {d.leads.map((l) => (
            <li key={l.id}>
              <Link to={`/leads?lead=${l.id}`} className={`${rowCls} hover:bg-muted/50`}>
                <span>
                  {l.title}
                  {l.next_step_note ? <span className="text-muted-foreground"> — {l.next_step_note}</span> : null}
                </span>
                <span className={overdueCls(toDateInput(l.next_step_at ?? new Date()))}>{l.next_step_at ? formatDate(l.next_step_at) : ''}</span>
              </Link>
            </li>
          ))}
        </Section>
      ) : null}

      {d.tasks.length > 0 ? (
        <Section title={t('today.tasks')} count={d.tasks.length}>
          {d.tasks.map((task) => (
            <li key={task.id} className={rowCls}>
              <span>
                {task.title}
                {task.waiting_on_client ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t('today.waitingClient')}</span> : null}
              </span>
              <span className={overdueCls(task.due_date)}>{formatDate(task.due_date)}</span>
            </li>
          ))}
        </Section>
      ) : null}

      {d.reminders.length > 0 ? (
        <Section title={t('today.reminders')} count={d.reminders.length}>
          {d.reminders.map((r) => (
            <li key={r.id} className={rowCls}>
              <span>{r.title}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatDate(r.remind_at)}</span>
                <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => complete.mutate(r.id)} aria-label={t('today.done')}>
                  <Check className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </Section>
      ) : null}

      {d.expiries.length > 0 ? (
        <Section title={t('today.expiries')} count={d.expiries.length}>
          {d.expiries.map((e) => (
            <li key={e.id}>
              <Link to={`/clients/${e.clientId}`} className={`${rowCls} hover:bg-muted/50`}>
                <span>{e.name} · {t(`today.expiry.${e.kind}`)}</span>
                <span className={overdueCls(e.date)}>{formatDate(e.date)}</span>
              </Link>
            </li>
          ))}
        </Section>
      ) : null}
    </div>
  )
}
