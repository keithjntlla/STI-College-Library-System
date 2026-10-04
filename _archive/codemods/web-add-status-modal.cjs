const fs = require('fs');
let code = fs.readFileSync('src/components/ui.tsx', 'utf8');

const statusModal = `
export function StatusModal({ type = 'success', title, description, onClose }: { type?: 'error' | 'warning' | 'success' | 'info'; title?: string; description: ReactNode; onClose: () => void }) {
  const styles = {
    error: { iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', button: 'bg-red-600 hover:bg-red-700 text-white', icon: AlertTriangle, title: 'text-red-900 dark:text-red-100' },
    warning: { iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', button: 'bg-orange-600 hover:bg-orange-700 text-white', icon: AlertTriangle, title: 'text-orange-900 dark:text-orange-100' },
    success: { iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400', button: 'bg-green-600 hover:bg-green-700 text-white', icon: CheckCircle2, title: 'text-green-900 dark:text-green-100' },
    info: { iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', button: 'bg-blue-600 hover:bg-blue-700 text-white', icon: Info, title: 'text-blue-900 dark:text-blue-100' },
  }[type]
  const Icon = styles.icon;
  const defaultTitle = { error: 'Error', warning: 'Warning', success: 'Success', info: 'Notice' }[type]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#001133]/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] p-6 shadow-2xl dark:bg-[#001a4d] border border-white/10 flex flex-col items-center text-center">
        <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-full', styles.iconBg)}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
        <h3 className={cn('font-display text-xl font-bold', styles.title)}>{title || defaultTitle}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        <button onClick={onClose} className={cn('mt-6 w-full rounded-xl px-4 py-2.5 font-bold shadow-sm', styles.button)}>Close</button>
      </div>
    </div>
  )
}
`;

code = code.replace(/export function ConfirmModal/, statusModal + '\nexport function ConfirmModal');
fs.writeFileSync('src/components/ui.tsx', code);
