import { Download, Eye, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AlertMessage, Button, ConfirmModal, MobileList, MobileListItem, PageHeader, SectionCard, StatusBadge, TableShell } from '../../components/ui'
import { printingApi, type PrintRequest, type PrintingReceipt } from './printing-api'
import { PrintingReceiptModal } from './PrintingReceiptModal'

const field = 'h-10 rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-3 text-sm text-[#0b5ea2] outline-none focus:border-[#0b5ea2]'
const activeStatuses = ['Pending', 'Printing', 'Ready for Pickup']

function canRecordCash(row: PrintRequest) {
  if (row.payment_status !== 'Unpaid') return false
  if (row.job_status === 'Cancelled') return Boolean(row.started_at)
  return true
}

type ConfirmState =
  | { kind: 'cash'; row: PrintRequest }
  | { kind: 'cancel'; row: PrintRequest }
  | { kind: 'pickup'; row: PrintRequest }
  | null

export function StaffPrintingQueuePage() {
  const [rows, setRows] = useState<PrintRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<PrintingReceipt | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await printingApi.queue({
        q: '',
        status: statusFilter,
        payment: paymentFilter,
      })
      setRows(result.rows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [statusFilter, paymentFilter])
  useEffect(() => {
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [statusFilter, paymentFilter])

  const visibleRows = useMemo(() => {
    if (statusFilter || paymentFilter) return rows
    return rows.filter((row) => activeStatuses.includes(row.job_status) || canRecordCash(row))
  }, [rows, statusFilter, paymentFilter])

  const action = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError('')
    try {
      await fn()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the print request.')
    } finally {
      setBusy('')
    }
  }

  const recordCash = async (row: PrintRequest) => {
    setBusy(`pay-${row.request_id}`)
    setError('')
    try {
      const payment = await printingApi.cash(row)
      setSelectedReceipt(payment.receipt)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record the printing payment.')
    } finally {
      setBusy('')
      setConfirm(null)
    }
  }

  const viewReceipt = async (id: number) => {
    setBusy(`receipt-${id}`)
    setError('')
    try {
      setSelectedReceipt(await printingApi.receipt(id, true))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the printing receipt.')
    } finally {
      setBusy('')
    }
  }

  const downloadReceipt = async (receipt: PrintingReceipt) => {
    setDownloadingReceipt(true)
    setError('')
    try {
      await printingApi.downloadReceipt(receipt, true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download the printing receipt.')
    } finally {
      setDownloadingReceipt(false)
    }
  }

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.kind === 'cash') void recordCash(confirm.row)
    else if (confirm.kind === 'cancel') {
      void action(`cancel-${confirm.row.request_id}`, () => printingApi.status(confirm.row.request_id, 'Cancelled', 'Cancelled by printing staff')).finally(() => setConfirm(null))
    } else {
      void action(`done-${confirm.row.request_id}`, () => printingApi.status(confirm.row.request_id, 'Completed')).finally(() => setConfirm(null))
    }
  }

  const rowActions = (r: PrintRequest) => (
    <>
      <Button variant="secondary" disabled={busy !== ''} onClick={() => void action(`download-${r.request_id}`, () => printingApi.downloadDocument(r))}>
        <Download size={14} />{busy === `download-${r.request_id}` ? 'Downloading…' : 'Download'}
      </Button>
      {canRecordCash(r) ? (
        <Button variant="secondary" disabled={busy !== ''} onClick={() => setConfirm({ kind: 'cash', row: r })}>
          {busy === `pay-${r.request_id}` ? 'Saving…' : 'Mark cash paid'}
        </Button>
      ) : null}
      {r.print_receipt_id ? (
        <Button variant="secondary" disabled={busy !== ''} onClick={() => void viewReceipt(Number(r.print_receipt_id))}>
          <Eye size={14} />{busy === `receipt-${r.print_receipt_id}` ? 'Loading…' : 'View payment'}
        </Button>
      ) : null}
      {r.job_status === 'Pending' ? (
        <>
          <Button disabled={busy !== ''} onClick={() => void action(`start-${r.request_id}`, () => printingApi.status(r.request_id, 'Printing'))}>
            Start printing
          </Button>
          <Button variant="secondary" disabled={busy !== ''} onClick={() => setConfirm({ kind: 'cancel', row: r })}>Cancel</Button>
        </>
      ) : null}
      {r.job_status === 'Printing' ? (
        <>
          <Button disabled={busy !== ''} onClick={() => void action(`ready-${r.request_id}`, () => printingApi.status(r.request_id, 'Ready for Pickup'))}>
            Mark ready
          </Button>
          <Button variant="secondary" disabled={busy !== ''} onClick={() => setConfirm({ kind: 'cancel', row: r })}>Cancel</Button>
        </>
      ) : null}
      {r.job_status === 'Ready for Pickup' ? (
        <>
          <Button disabled={busy !== '' || r.payment_status !== 'Paid'} onClick={() => setConfirm({ kind: 'pickup', row: r })}>
            Confirm pickup
          </Button>
          <Button variant="secondary" disabled={busy !== ''} onClick={() => setConfirm({ kind: 'cancel', row: r })}>Cancel</Button>
        </>
      ) : null}
    </>
  )

  const confirmCopy = confirm?.kind === 'cash'
    ? { title: 'Record cash payment', description: `Record ₱${Number(confirm.row.calculated_cost).toFixed(2)} cash for request #${confirm.row.request_id} (${confirm.row.file_name})?`, confirmText: 'Mark paid' }
    : confirm?.kind === 'cancel'
      ? {
          title: 'Cancel print request',
          description: confirm.row.job_status === 'Pending'
            ? `Cancel pending request #${confirm.row.request_id}?`
            : `Cancel request #${confirm.row.request_id}? Paper already used stays as an unpaid charge until cash is recorded.`,
          confirmText: 'Cancel request',
        }
      : confirm?.kind === 'pickup'
        ? { title: 'Confirm pickup', description: `Mark request #${confirm.row.request_id} as picked up? Cash payment must already be recorded, and the student must be checked in at attendance.`, confirmText: 'Confirm pickup' }
        : null

  return <>
    <PageHeader
      eyebrow="Staff operations"
      title="Printing queue"
      description="Print unpaid jobs first, mark ready, collect cash on claim, then confirm pickup. The student must already be checked in at attendance before pickup can be completed."
      action={<Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>}
    />
    {error ? <AlertMessage type="error" description={error} onDismiss={() => setError('')} /> : null}
    <SectionCard className="mb-5 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select aria-label="Job status filter" className={field} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Active jobs (hide completed)</option>
          {['Pending', 'Printing', 'Ready for Pickup', 'Completed', 'Cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select aria-label="Payment filter" className={field} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          <option value="">All payment states</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
    </SectionCard>
    <TableShell
      title="Desk queue"
      mobileRows={
        <MobileList empty={loading ? <p className="px-5 py-12 text-center text-[#0b5ea2]">Loading queue…</p> : visibleRows.length === 0 ? <p className="px-5 py-12 text-center font-semibold text-[#0b5ea2]">No print requests match these filters.</p> : null}>
          {loading ? null : visibleRows.map((r) => (
            <MobileListItem
              key={r.request_id}
              title={`#${r.request_id} · ${r.full_name}`}
              meta={`${r.school_id} · ${r.user_role}`}
              status={<StatusBadge status={r.job_status} />}
              detail={
                <div className="space-y-2">
                  <p className="truncate font-semibold">{r.file_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>{r.page_count} pages × {r.number_of_copies}</span>
                    <span>{r.print_type} · {r.paper_size}</span>
                    <span className="font-bold">₱{Number(r.calculated_cost).toFixed(2)}</span>
                    <span><StatusBadge status={r.payment_status} /></span>
                  </div>
                  {r.payment_status === 'Unpaid' && r.job_status === 'Ready for Pickup' ? <p className="text-xs font-bold">Collect cash before confirming pickup</p> : null}
                  {canRecordCash(r) && r.job_status === 'Cancelled' ? <p className="text-xs font-bold">Unpaid after print start · settle cash</p> : null}
                  {r.number_of_copies >= 60 ? <p className="text-xs font-bold">Large job · check paper stock</p> : null}
                </div>
              }
              actions={rowActions(r)}
            />
          ))}
        </MobileList>
      }
    >
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-[#0b5ea2] text-[#FFFFFF]">
          <tr>{['Request / user', 'Document', 'Configuration', 'Cost / payment', 'Status', 'Actions'].map((header) => <th className="px-4 py-3 text-xs" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="p-10 text-center text-[#0b5ea2]">Loading queue…</td></tr>
          ) : visibleRows.length === 0 ? (
            <tr><td colSpan={6} className="p-10 text-center font-semibold text-[#0b5ea2]">No print requests match these filters.</td></tr>
          ) : visibleRows.map((r) => (
            <tr key={r.request_id} className="border-b border-[#0b5ea2]/10">
              <td className="px-4 py-4">
                <b className="text-[#0b5ea2]">#{r.request_id} · {r.full_name}</b>
                <p className="text-xs text-[#0b5ea2]/65">{r.school_id} · {r.user_role}</p>
              </td>
              <td className="max-w-[220px] px-4 py-4">
                <p className="truncate font-semibold text-[#0b5ea2]">{r.file_name}</p>
                <p className="text-xs text-[#0b5ea2]/65">{new Date(r.created_at).toLocaleString()}</p>
              </td>
              <td className="px-4 py-4 text-[#0b5ea2]">
                {r.page_count} pages × {r.number_of_copies}
                {r.number_of_copies >= 60 ? <p className="text-xs font-bold">Large job · check paper stock</p> : null}
                <p className="text-xs text-[#0b5ea2]/65">{r.print_type} · {r.paper_size}</p>
              </td>
              <td className="px-4 py-4">
                <b className="text-[#0b5ea2]">₱{Number(r.calculated_cost).toFixed(2)}</b>
                <div className="mt-1"><StatusBadge status={r.payment_status} /></div>
              </td>
              <td className="px-4 py-4"><StatusBadge status={r.job_status} /></td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2">{rowActions(r)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
    {confirm && confirmCopy ? (
      <ConfirmModal
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmText={confirmCopy.confirmText}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    ) : null}
    <PrintingReceiptModal
      receipt={selectedReceipt}
      onClose={() => setSelectedReceipt(null)}
      onDownload={() => selectedReceipt && void downloadReceipt(selectedReceipt)}
      downloading={downloadingReceipt}
    />
  </>
}
