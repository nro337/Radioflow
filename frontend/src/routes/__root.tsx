import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import {
  ClipboardCheck,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  PlayCircle,
  Settings,
  SlidersHorizontal,
  Target,
} from 'lucide-react'

const workflowSteps = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/experiments', label: 'Experiments', icon: FlaskConical },
  { to: '/preprocessing', label: 'Preprocessing', icon: SlidersHorizontal },
  { to: '/models', label: 'Model', icon: Cpu },
  { to: '/training', label: 'Training', icon: PlayCircle },
  { to: '/evaluation', label: 'Evaluation', icon: ClipboardCheck },
  { to: '/prediction', label: 'Prediction', icon: Target },
] as const

const RootLayout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-heading text-base font-semibold">RadioFlow</h1>
          <p className="text-xs text-muted-foreground">Radiomics ML workflow</p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: 'text-foreground' }}
        >
          <Settings className="size-3.5" />
        </Link>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
        {workflowSteps.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: 'border-primary text-foreground' }}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Outlet />
    </main>
    <TanStackRouterDevtools />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })
