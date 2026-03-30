import { Link, useLocation } from 'react-router-dom'

export default function NavBar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-teal-400 font-bold text-sm tracking-widest uppercase">OncoSmart</span>
        <span className="text-slate-400 text-sm font-medium">Network Dashboard</span>
      </Link>
      {!isHome && (
        <Link
          to="/"
          className="ml-auto text-slate-400 hover:text-teal-400 text-sm transition-colors"
        >
          {'\u2190'} All Clinics
        </Link>
      )}
    </nav>
  )
}
