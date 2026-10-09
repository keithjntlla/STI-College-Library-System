import { Download, Eye, FileText, ReceiptText, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertMessage, Button, PageHeader, SectionCard, StatusBadge } from '../../components/ui'
import { printingApi, type PricingRule, type PrintQuote, type PrintRequest, type PrintingReceipt, type ServiceStatus } from './printing-api'
import { PrintingReceiptModal } from './PrintingReceiptModal'

const field = 'mt-1.5 h-12 w-full rounded-xl border border-[#0b5ea2]/20 bg-[#FFFFFF] px-4 text-sm font-normal text-[#0b5ea2] outline-none focus:border-[#0b5ea2]'
function validQuantity(value: string, max: number) {
  const count = Number(value)
  return Number.isInteger(count) && count >= 1 && count <= max ? count : 0
}

function hasStarted(request: PrintRequest) {
  return Boolean(request.started_at) || request.job_status === 'Printing' || request.job_status === 'Ready for Pickup' || request.job_status === 'Completed'
}

function balanceDue(request: PrintRequest) {
  return request.payment_status === 'Unpaid' && hasStarted(request)
}

function nextStepFor(request: PrintRequest) {
  if (request.job_status === 'Cancelled') {
    if (balanceDue(request)) return `Balance due ₱${Number(request.calculated_cost).toFixed(2)}. Pay cash at the printing counter.${request.cancelled_reason ? ` ${request.cancelled_reason}` : ''}`
    return request.cancelled_reason ? `Cancelled: ${request.cancelled_reason}` : 'This request was cancelled.'
  }
  if (request.job_status === 'Pending' && request.payment_status === 'Unpaid') return 'Staff will print your file. Pay cash when you pick it up.'
  if (request.job_status === 'Pending') return 'Payment recorded. Library staff will start printing soon.'
  if (request.job_status === 'Printing') {
    return request.payment_status === 'Unpaid'
      ? `Printing in progress. Balance due ₱${Number(request.calculated_cost).toFixed(2)} — pay cash when you claim it.`
      : 'Your document is printing. Wait for Ready for Pickup.'
  }
  if (request.job_status === 'Ready for Pickup') {
    return request.payment_status === 'Unpaid'
      ? `Ready at the counter. Check in at attendance, pay ₱${Number(request.calculated_cost).toFixed(2)} cash, then claim with your school ID.`
      : 'Ready at the library counter. Check in at attendance, then claim with your school ID.'
  }
  if (request.job_status === 'Completed') return 'Picked up. Keep your payment record if you need proof of payment.'
  return ''
}

function sortRequests(rows: PrintRequest[]) {
  const rank = (row: PrintRequest) => {
    if (row.job_status === 'Ready for Pickup') return 0
    if (balanceDue(row)) return 1
    if (row.job_status === 'Printing') return 2
    if (row.job_status === 'Pending') return 3
    if (row.job_status === 'Completed') return 4
    return 5
  }
  return [...rows].sort((a, b) => rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function StudentPrintingPage() {
  const [service, setService] = useState<ServiceStatus | null>(null)
  const [pricing, setPricing] = useState<PricingRule[]>([])
  const [requests, setRequests] = useState<PrintRequest[]>([])
  const [receipts, setReceipts] = useState<PrintingReceipt[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<PrintingReceipt | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [copies, setCopies] = useState('1')
  const [type, setType] = useState<'Monochrome' | 'Colored'>('Monochrome')
  const [paper, setPaper] = useState<'Short' | 'A4' | 'Long'>('A4')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [quoteState, setQuoteState] = useState<{ file: File; copies: string; type: string; paper: string; quote: PrintQuote } | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)

  const accepting = Boolean(service && Number(service.accepting_requests))
  const docxAvailable = Boolean(service?.docx_auto_count_available)
  const quote = quoteState?.file === file && quoteState.copies === copies && quoteState.type === type && quoteState.paper === paper ? quoteState.quote : null
  const unitPrice = useMemo(() => {
    const rule = pricing.find((row) => row.print_type === type && row.paper_size === paper)
    return rule ? Number(rule.price_per_page) : null
  }, [pricing, type, paper])
  const readyCount = requests.filter((row) => row.job_status === 'Ready for Pickup').length
  const sortedRequests = useMemo(() => sortRequests(requests), [requests])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, r, receiptRows, priceRows] = await Promise.all([
        printingApi.serviceStatus(),
        printingApi.mine(),
        printingApi.receipts(),
        printingApi.pricing(),
      ])
      setService(s)
      setRequests(r)
      setReceipts(receiptRows)
      setPricing(priceRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load printing service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    setQuoteState(null)
    setQuoteError('')
    setQuoting(false)
    if (!file || !accepting) return
    if (file.size > 4 * 1024 * 1024) {
      setQuoteError('The document must not exceed 4 MB.')
      return
    }
    const lower = file.name.toLowerCase()
    if (!docxAvailable && !lower.endsWith('.pdf')) {
      setQuoteError('DOCX conversion is unavailable right now. Export your document as a PDF and upload that instead.')
      return
    }
    const copyCount = validQuantity(copies, 100)
    if (!copyCount) return
    let active = true
    const timer = setTimeout(() => {
      setQuoting(true)
      const form = new FormData()
      form.set('document', file)
      form.set('number_of_copies', String(copyCount))
      form.set('print_type', type)
      form.set('paper_size', paper)
      void printingApi.quote(form)
        .then((result) => { if (active) setQuoteState({ file, copies, type, paper, quote: result }) })
        .catch((e) => { if (active) setQuoteError(e instanceof Error ? e.message : 'Unable to read the document.') })
        .finally(() => { if (active) setQuoting(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [file, copies, type, paper, accepting, docxAvailable])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setError(docxAvailable ? 'Select a PDF or DOCX document.' : 'Select a PDF document.')
      return
    }
    const copyCount = validQuantity(copies, 100)
    if (!copyCount) {
      setError('Enter a whole number from 1 to 100 copies.')
      return
    }
    if (!quote || quoting) {
      setError('Wait for the page count and price before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const form = new FormData()
      form.set('document', file)
      form.set('number_of_copies', String(copyCount))
      form.set('page_count', String(quote.page_count))
      form.set('document_sha256', quote.document_sha256)
      form.set('quoted_cost', String(quote.calculated_cost))
      form.set('print_type', type)
      form.set('paper_size', paper)
      form.set('optional_notes', notes)
      await printingApi.submit(form)
      setFile(null)
      setQuoteState(null)
      setNotes('')
      setSuccess('Request submitted. Staff will print your file. Pay cash when you pick it up.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit print request.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async (id: number) => {
    setError('')
    try {
      await printingApi.cancel(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to cancel request.')
    }
  }

  const downloadReceipt = async (receipt: PrintingReceipt) => {
    setDownloading(true)
    setError('')
    try {
      await printingApi.downloadReceipt(receipt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to download the printing payment record.')
    } finally {
      setDownloading(false)
    }
  }

  const acceptAttr = docxAvailable
    ? '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : '.pdf,application/pdf'

  return <>
    <PageHeader
      eyebrow="Online service"
      title="Printing service"
      description="Upload a document, review the automatic page count and price. Staff print first; pay cash when you claim your copies at the counter."
      action={<Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>}
    />
    {error ? <AlertMessage type="error" description={error} onDismiss={() => setError('')} /> : null}
    {success ? <AlertMessage type="success" description={success} onDismiss={() => setSuccess('')} /> : null}
    {readyCount > 0 ? (
      <AlertMessage
        type="info"
        title="Ready for pickup"
        description={`${readyCount} print ${readyCount === 1 ? 'request is' : 'requests are'} ready at the library counter. Pay cash when you claim ${readyCount === 1 ? 'it' : 'them'}, and bring your school ID.`}
      />
    ) : null}

    <SectionCard className="mb-5 p-4">
      <ol className="grid gap-3 text-sm text-[#0b5ea2] sm:grid-cols-4">
        <li><span className="font-bold">1. Upload</span><p className="mt-1 text-xs text-[#0b5ea2]/65">PDF{docxAvailable ? ' or DOCX' : ''} · auto page count</p></li>
        <li><span className="font-bold">2. Submit</span><p className="mt-1 text-xs text-[#0b5ea2]/65">Confirm copies, type, and price</p></li>
        <li><span className="font-bold">3. Staff prints</span><p className="mt-1 text-xs text-[#0b5ea2]/65">No need to wait at the desk</p></li>
        <li><span className="font-bold">4. Pay & pick up</span><p className="mt-1 text-xs text-[#0b5ea2]/65">Cash when status is Ready</p></li>
      </ol>
    </SectionCard>

    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <SectionCard className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#0b5ea2]">New print request</h2>
          <StatusBadge status={accepting ? 'Accepting' : 'Paused'} />
        </div>
        {!accepting && service?.unavailable_reason ? <AlertMessage type="warning" description={service.unavailable_reason} className="mb-4" /> : null}
        {!docxAvailable ? (
          <AlertMessage
            type="info"
            className="mb-4"
            description="Upload a PDF. DOCX conversion is unavailable on this server — export from Word as PDF first."
          />
        ) : (
          <AlertMessage
            type="info"
            className="mb-4"
            description="PDF or DOCX is accepted. Files are stored for library staff to print — this service does not virus-scan uploads. Prefer PDF when you can."
          />
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-[#0b5ea2]">
            Document
            <input
              aria-label="Print document"
              type="file"
              accept={acceptAttr}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full rounded-xl border border-dashed border-[#0b5ea2]/25 p-4 text-sm font-normal"
            />
            <span className="mt-1 block font-normal text-[#0b5ea2]/65">
              {docxAvailable ? 'PDF or DOCX' : 'PDF only'}, maximum 4 MB
            </span>
            {file ? <span className="mt-2 block truncate rounded-lg bg-[#0b5ea2]/5 px-3 py-2 text-xs font-semibold text-[#0b5ea2]">{file.name}</span> : null}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-xs font-bold text-[#0b5ea2]">
              Pages in document
              <div aria-label="Pages in document" className={`${field} flex items-center`}>{quote?.page_count ?? '—'}</div>
            </div>
            <label className="text-xs font-bold text-[#0b5ea2]">
              Copies
              <input aria-label="Copies" className={field} type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(e.target.value)} />
              {copies && !validQuantity(copies, 100) ? <span role="alert" className="mt-1 block text-xs font-normal text-[#b42318]">Enter a whole number from 1 to 100 copies.</span> : null}
              {Number(copies) >= 60 && validQuantity(copies, 100) ? <span className="mt-1 block text-xs font-normal text-[#0b5ea2]/70">Large print job. Library staff will check paper stock before starting.</span> : null}
            </label>
            <label className="text-xs font-bold text-[#0b5ea2]">
              Print type
              <select aria-label="Print type" className={field} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option>Monochrome</option>
                <option>Colored</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#0b5ea2]">
              Paper size
              <select aria-label="Paper size" className={field} value={paper} onChange={(e) => setPaper(e.target.value as typeof paper)}>
                <option>Short</option>
                <option>A4</option>
                <option>Long</option>
              </select>
            </label>
          </div>
          {unitPrice != null ? (
            <p className="text-xs text-[#0b5ea2]/65">
              {type} · {paper}: ₱{unitPrice.toFixed(2)} per page
              {quote ? ` · ${quote.page_count} pages × ${copies} copies = ${quote.total_sheets} sheets` : ''}
            </p>
          ) : null}
          {quoting ? <p role="status" className="text-sm text-[#0b5ea2]">Reading document and calculating price…</p> : null}
          {quoteError ? <AlertMessage type="error" description={quoteError} /> : null}
          {quote && quote.printable_file_name !== file?.name ? (
            <p className="text-xs text-[#0b5ea2]/70">The DOCX will be converted to {quote.printable_file_name} for printing.</p>
          ) : null}
          <label className="block text-xs font-bold text-[#0b5ea2]">
            Notes
            <textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-[#0b5ea2]/20 p-3 text-sm font-normal outline-none" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </label>
          <div className="rounded-xl bg-[#0b5ea2]/5 p-4">
            <p className="text-xs font-bold text-[#0b5ea2]/65">Calculated cost</p>
            <p className="mt-1 text-2xl font-bold text-[#0b5ea2]">{quote ? `₱${Number(quote.calculated_cost).toFixed(2)}` : '—'}</p>
            <p className="text-xs text-[#0b5ea2]/65">{quote ? `${quote.total_sheets} total printed sheets · ` : ''}Pay cash when you pick up</p>
          </div>
          <Button className="w-full" type="submit" disabled={submitting || !accepting || !quote || quoting}>
            <Upload size={16} />{submitting ? 'Submitting…' : 'Submit print request'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard className="overflow-hidden">
        <div className="border-b border-[#0b5ea2]/15 p-5">
          <h2 className="font-bold text-[#0b5ea2]">My print requests</h2>
          <p className="mt-1 text-xs text-[#0b5ea2]/65">Ready and unpaid-after-print jobs are listed first.</p>
        </div>
        <div className="divide-y divide-[#0b5ea2]/10">
          {loading ? <p className="p-10 text-center text-[#0b5ea2]">Loading requests…</p> : sortedRequests.length === 0 ? (
            <p className="p-10 text-center font-semibold text-[#0b5ea2]">No print requests yet.</p>
          ) : sortedRequests.map((r) => (
            <div key={r.request_id} className={`p-5 ${r.job_status === 'Ready for Pickup' || balanceDue(r) ? 'bg-[#0b5ea2]/5' : ''}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="rounded-xl bg-[#0b5ea2]/5 p-3 text-[#0b5ea2]"><FileText size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#0b5ea2]">#{r.request_id} · {r.file_name}</p>
                  <p className="mt-1 text-xs text-[#0b5ea2]/65">{r.page_count} pages · {r.number_of_copies} copies · {r.print_type} · {r.paper_size}</p>
                  <p className="mt-2 text-xs font-semibold text-[#0b5ea2]">{nextStepFor(r)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {balanceDue(r) ? <StatusBadge status="Balance due" /> : null}
                  <StatusBadge status={r.payment_status} />
                  <StatusBadge status={r.job_status} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-[#0b5ea2]">{balanceDue(r) ? `Balance due ₱${Number(r.calculated_cost).toFixed(2)}` : `₱${Number(r.calculated_cost).toFixed(2)}`}</p>
                <div className="flex gap-2">
                  {r.print_receipt_id ? (
                    <Button variant="secondary" onClick={() => {
                      const receipt = receipts.find((item) => item.print_receipt_id === Number(r.print_receipt_id))
                      if (receipt) setSelectedReceipt(receipt)
                    }}>
                      <Eye size={14} />View payment
                    </Button>
                  ) : null}
                  {r.job_status === 'Pending' && r.payment_status === 'Unpaid' ? (
                    <Button variant="secondary" onClick={() => void cancel(r.request_id)}>Cancel</Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>

    <SectionCard className="mt-5 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#0b5ea2]/15 p-5">
        <span className="rounded-xl bg-[#FFF200] p-2 text-[#0b5ea2]"><ReceiptText size={20} /></span>
        <div>
          <h2 className="font-bold text-[#0b5ea2]">Payment records</h2>
          <p className="text-xs text-[#0b5ea2]/65">Printing payment records only. Any approved tax invoice appears in Invoices.</p>
        </div>
      </div>
      <div className="divide-y divide-[#0b5ea2]/10">
        {loading ? <p className="p-8 text-center text-[#0b5ea2]">Loading receipts…</p> : receipts.length === 0 ? (
          <p className="p-8 text-center font-semibold text-[#0b5ea2]">No printing payment records yet. A record appears after the library records your cash payment.</p>
        ) : receipts.map((receipt) => (
          <div key={receipt.print_receipt_id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
            <span className="rounded-xl bg-[#0b5ea2]/5 p-3 text-[#0b5ea2]"><ReceiptText size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#0b5ea2]">{receipt.receipt_number}</p>
              <p className="truncate text-sm text-[#0b5ea2]/70">{receipt.file_name}</p>
              <p className="mt-1 text-xs text-[#0b5ea2]/55">Paid {new Date(receipt.received_at).toLocaleString()} · Verification {receipt.verification_code}</p>
            </div>
            <strong className="text-lg text-[#0b5ea2]">₱{Number(receipt.amount_received).toFixed(2)}</strong>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelectedReceipt(receipt)}><Eye size={14} />View payment</Button>
              <Button onClick={() => void downloadReceipt(receipt)} disabled={downloading}><Download size={14} />Download</Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
    <PrintingReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} onDownload={() => selectedReceipt && void downloadReceipt(selectedReceipt)} downloading={downloading} />
  </>
}
