import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAdmin } = useAuth()

  function isActive(path: string) {
    return location.pathname.startsWith(path)
  }

  const moreActive = isActive('/more') || isActive('/admin') || isActive('/profile')

  return (
    <div className="app-shell min-h-[100dvh] print:min-h-0 bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="px-4 h-12 flex items-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <img src="/logo.png" alt="Prime Pneumatics & Consultants" className="h-7 w-auto" />
        </div>
      </header>

      <main className="px-4 py-4 print:p-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          <BottomTab to="/dashboard" label="Home" active={isActive('/dashboard')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </BottomTab>

          {isAdmin && (
            <BottomTab to="/customers" label="Customers" active={isActive('/customers')}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </BottomTab>
          )}

          <BottomTab to="/search" label="Search" active={isActive('/search')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </BottomTab>

          <BottomTab to="/more" label="More" active={moreActive}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </BottomTab>
        </div>
      </nav>
    </div>
  )
}

function BottomTab({
  to,
  label,
  active,
  children,
}: {
  to: string
  label: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
        active ? 'text-blue-600' : 'text-gray-400'
      }`}
    >
      {children}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
