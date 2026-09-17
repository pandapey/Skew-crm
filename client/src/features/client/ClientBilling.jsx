import { useQuery } from '@tanstack/react-query'
import { FiDownload, FiFileText, FiCreditCard, FiCheckCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/utils'
import { useAuth } from '@/hooks/useAuth'
import { clientService } from './clientService'
import { PageHeader, Card, CardHeader, StatCard, Badge, Loader, EmptyState, Button } from '@/components/ui'
import { fmtDate, PAYMENT_STATUS_TONE, downloadTextFile, summarizeBilling } from './constants'

export default function ClientBilling() {
  const { user } = useAuth()
  const { data: billing, isLoading, isError } = useQuery({ queryKey: ['client-payments'], queryFn: () => clientService.getPayments(user) })

  if (isLoading) return <Loader label="Loading billing…" />

  if (isError) {
    return (
      <div>
        <PageHeader title="Billing & Payments" subtitle="Invoices, receipts and balances for your projects." />
        <EmptyState icon={FiFileText} title="Couldn't load billing" description="Something went wrong fetching your billing data. Please refresh, or contact support if this keeps happening." />
      </div>
    )
  }

  const summary = billing.summary ?? summarizeBilling(billing)
  const {
    rows: payments, advancePayment, monthlyDue, totalAmount,
    billed, paid, pending, balance, next, nextDueDate, overdue,
  } = summary

  const downloadInvoice = (inv) => {
    downloadTextFile(
      `${inv.invoice || 'invoice'}.txt`,
      `INVOICE ${inv.invoice}\nProject: ${inv.projectName || '—'}\nAmount: ₹${inv.amount || 0}\nPaid: ₹${inv.paid || 0}\nStatus: ${inv.status}\nDate: ${fmtDate(inv.date)}`,
    )
    toast.success(`Downloading ${inv.invoice}`)
  }

  return (
    <div>
      <PageHeader title="Billing & Payments" subtitle="Invoices, receipts and balances for your projects." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Budget" value={totalAmount} format={formatCurrency} icon={FiFileText} tone="primary" />
        <StatCard label="Total Billed" value={billed} format={formatCurrency} icon={FiFileText} tone="accent" />
        <StatCard label="Paid Amount" value={paid} format={formatCurrency} icon={FiCheckCircle} tone="success" />
        <StatCard label="Pending Amount" value={pending} format={formatCurrency} icon={FiFileText} tone={pending > 0 ? 'warning' : 'success'} />
        <StatCard label="Outstanding Balance" value={balance} format={formatCurrency} icon={FiCreditCard} tone={overdue ? 'danger' : balance > 0 ? 'warning' : 'success'} />
        <StatCard label="Advance Payment" value={advancePayment} format={formatCurrency} icon={FiCheckCircle} tone="accent" />
        <StatCard label="Monthly Due" value={monthlyDue} format={formatCurrency} icon={FiCreditCard} tone="primary" />
        <StatCard label="Next Due" value={next ? fmtDate(nextDueDate) : '—'} icon={FiDownload} tone="accent" />
      </div>

      {overdue && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <FiCreditCard /> You have an overdue invoice. Please clear the balance to avoid delays.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {}
        <Card className="lg:col-span-2">
          <CardHeader title="Invoices & Payment History" />
          {payments.length === 0 ? (
            <EmptyState title="No invoices yet" />
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-app p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.invoice} · {p.projectName}</p>
                    <p className="text-xs text-muted">{formatCurrency(p.amount || 0)} · {fmtDate(p.date)}{p.method ? ` · ${p.method}` : ''}</p>
                  </div>
                  <Badge tone={PAYMENT_STATUS_TONE[p.status]}>{p.status}</Badge>
                  <div className="flex items-center gap-1">
                    <button onClick={() => downloadInvoice(p)} className="rounded-lg p-2 text-muted transition hover:text-primary" title="Download invoice"><FiDownload /></button>
                    <Button variant="ghost" size="sm" onClick={() => downloadInvoice(p)}>View</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {}
        <Card>
          <CardHeader title="Receipts" subtitle="Paid amounts" />
          {payments.filter((p) => p.status === 'Paid').length === 0 ? (
            <EmptyState title="No receipts yet" />
          ) : (
            <div className="space-y-2">
              {payments.filter((p) => p.status === 'Paid').map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-app p-3">
                  <div>
                    <p className="text-sm font-medium">{p.invoice}</p>
                    <p className="text-xs text-muted">{formatCurrency(p.paid || 0)}</p>
                  </div>
                  <button onClick={() => { downloadTextFile(`${p.invoice || 'receipt'}-receipt.txt`, `RECEIPT ${p.invoice}\nPaid: ₹${p.paid || 0}\nDate: ${fmtDate(p.date)}`); toast.success('Receipt downloaded') }}
                    className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-sm font-medium text-success transition hover:bg-success/20"><FiDownload /> Receipt</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
