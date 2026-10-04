export type ClearanceAlertType = 'error' | 'warning' | 'success' | 'info'

export type ClearanceMessage = {
  type: ClearanceAlertType
  title: string
  description: string
  pillLabel: string
  cta: { label: string; to: string }
}

const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export function buildClearanceMessage(input: {
  clearanceStatus: string
  clearanceReason?: string
  activeLoans: number
  outstandingFines: number
  prefix: string
}): ClearanceMessage | null {
  const { clearanceStatus, clearanceReason, activeLoans, outstandingFines, prefix } = input
  const reason = (clearanceReason ?? '').trim()
  const isOverride = /authorized override/i.test(reason) || (clearanceStatus !== 'Cleared' && clearanceStatus !== 'Not Cleared')

  if (clearanceStatus === 'Cleared' && !isOverride) return null

  if (isOverride) {
    return {
      type: 'warning',
      title: 'Clearance override active',
      description: reason || 'An authorized staff override is currently applied to your clearance standing.',
      pillLabel: `Clearance: ${clearanceStatus}`,
      cta: { label: 'View clearance', to: `${prefix}/clearance` },
    }
  }

  const hasLoans = activeLoans > 0
  const hasFines = outstandingFines > 0
  const loanPhrase = `${activeLoans} active ${activeLoans === 1 ? 'loan' : 'loans'}`
  const finePhrase = `${peso(outstandingFines)} in unpaid obligations`

  if (hasLoans && hasFines) {
    return {
      type: 'error',
      title: 'Account not cleared',
      description: `You have ${loanPhrase} that must be returned, and ${finePhrase}. Resolve both before clearance is restored.`,
      pillLabel: `Clearance: ${loanPhrase}`,
      cta: { label: 'View clearance', to: `${prefix}/clearance` },
    }
  }

  if (hasLoans) {
    return {
      type: 'error',
      title: 'Account not cleared',
      description: `You have ${loanPhrase} that must be returned before clearance is restored.`,
      pillLabel: `Clearance: ${loanPhrase}`,
      cta: { label: 'View clearance', to: `${prefix}/clearance` },
    }
  }

  if (hasFines) {
    return {
      type: 'error',
      title: 'Account not cleared',
      description: `You have ${finePhrase} that must be settled before clearance is restored.`,
      pillLabel: 'Clearance: unpaid obligations',
      cta: { label: 'View fines', to: `${prefix}/fines` },
    }
  }

  return {
    type: 'error',
    title: 'Account not cleared',
    description: reason || 'Please resolve your outstanding library obligations before clearance is restored.',
    pillLabel: 'Clearance: action required',
    cta: { label: 'View clearance', to: `${prefix}/clearance` },
  }
}
