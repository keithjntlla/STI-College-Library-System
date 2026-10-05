import { useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Leaf, X } from 'lucide-react'
import { PageHeader, SectionCard } from '../../components/ui'
import { getAccessToken } from '../auth/auth-storage'

type Notice = { tone: 'success' | 'error'; text: string }

async function downloadReport(path: string, filename: string, accept: string) {
  const headers = new Headers({ Accept: accept })
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(path, { headers, credentials: 'include' })
  if (!response.ok) {
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
    const payload = isJson ? await response.json() as { message?: string } : null
    throw new Error(payload?.message ?? 'The report could not be generated.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function LibrarianReportsPage() {
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  async function run(key: string, path: string, filename: string, accept: string, success: string) {
    setBusy(key)
    setNotice(null)
    try {
      await downloadReport(path, filename, accept)
      setNotice({ tone: 'success', text: success })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The report could not be generated.' })
    } finally {
      setBusy(null)
    }
  }

  const button = 'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-50'
  const primary = `${button} bg-[#0b5ea2] text-white`
  const secondary = `${button} border border-[#0b5ea2]/20 bg-white text-[#0b5ea2]`

  return <>
    <PageHeader
      eyebrow="Collection reporting"
      title="Reports"
      description="Inventory and weeding exports live here. Catalog maintenance stays for data entry and import."
    />

    {notice ? (
      <div
        role="alert"
        className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
          notice.tone === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-[#0b5ea2]/20 bg-white text-[#0b5ea2]'
        }`}
      >
        <span className="inline-flex items-start gap-2">
          {notice.tone === 'error' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : null}
          <span><span className="sr-only">{notice.tone === 'error' ? 'Error: ' : ''}</span>{notice.text}</span>
        </span>
        <button type="button" aria-label="Dismiss alert" onClick={() => setNotice(null)}><X size={16} /></button>
      </div>
    ) : null}

    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard className="p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 text-[#0b5ea2]" size={22} />
          <div>
            <h2 className="font-bold text-[#0b5ea2]">Complete inventory</h2>
            <p className="mt-1 text-sm text-[#0b5ea2]/70">
              Every active book copy and research title. Includes copyright year and a weeding review column. Rows are never dropped for age.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            className={primary}
            onClick={() => void run('inv-pdf', '/api/reports/catalog/inventory.pdf', 'sti-library-inventory.pdf', 'application/pdf', 'PDF inventory report downloaded.')}
          >
            <Download size={15} /> {busy === 'inv-pdf' ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            className={secondary}
            onClick={() => void run('inv-csv', '/api/reports/catalog/inventory.csv', 'sti-library-inventory.csv', 'text/csv', 'CSV inventory report downloaded.')}
          >
            <FileSpreadsheet size={15} /> {busy === 'inv-csv' ? 'Preparing CSV…' : 'Export CSV'}
          </button>
        </div>
      </SectionCard>

      <SectionCard className="p-5">
        <div className="flex items-start gap-3">
          <Leaf className="mt-0.5 text-[#0b5ea2]" size={22} />
          <div>
            <h2 className="font-bold text-[#0b5ea2]">Weeding review list</h2>
            <p className="mt-1 text-sm text-[#0b5ea2]/70">
              Titles in categories marked for the five-year textbook rule whose copyright year is more than five years old. Opens librarian alerts. Does not auto-archive.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            className={primary}
            onClick={() => void run('weed-pdf', '/api/reports/catalog/weeding.pdf', 'sti-library-weeding-list.pdf', 'application/pdf', 'Weeding review PDF downloaded.')}
          >
            <Download size={15} /> {busy === 'weed-pdf' ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            className={secondary}
            onClick={() => void run('weed-csv', '/api/reports/catalog/weeding.csv', 'sti-library-weeding-list.csv', 'text/csv', 'Weeding review CSV downloaded.')}
          >
            <FileSpreadsheet size={15} /> {busy === 'weed-csv' ? 'Preparing CSV…' : 'Export CSV'}
          </button>
        </div>
      </SectionCard>
    </div>
  </>
}
