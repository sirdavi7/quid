import Link from 'next/link'
import { Droplets, ExternalLink, Home, LayoutDashboard, LogIn, LogOut, Plus } from 'lucide-react'

export const navButtonClass =
  'quid-secondary-action text-xs'

export function HomeNavButton() {
  return (
    <Link href="/" className={navButtonClass}>
      <Home size={14} /> Home
    </Link>
  )
}

export function FaucetNavButton() {
  return (
    <Link href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className={navButtonClass}>
      <Droplets size={14} /> Faucet
    </Link>
  )
}

export function DashboardNavButton() {
  return (
    <Link href="/dashboard" className={navButtonClass}>
      <LayoutDashboard size={14} /> Dashboard
    </Link>
  )
}

export function OpenPaymentPageNavButton({ username }) {
  return (
    <Link href={`/pay/${username}`} className={navButtonClass}>
      <ExternalLink size={14} /> Open payment page
    </Link>
  )
}

export function CreateNavButton({ label = 'Create page' }) {
  return (
    <Link href="/create" className={navButtonClass}>
      <Plus size={14} /> {label}
    </Link>
  )
}

export function LoginNavButton() {
  return (
    <Link href="/login" className={navButtonClass}>
      <LogIn size={14} /> Login
    </Link>
  )
}

export function SignOutNavButton() {
  return (
    <form action="/auth/sign-out" method="post" className="contents">
      <button className={`${navButtonClass} w-full sm:w-auto`}>
        <LogOut size={14} /> Sign out
      </button>
    </form>
  )
}
