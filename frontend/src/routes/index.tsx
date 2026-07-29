import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ClipboardCheck,
  Cpu,
  FlaskConical,
  PlayCircle,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

const stages = [
  {
    step: 1,
    to: '/experiments',
    label: 'Experiments',
    description: 'Define the problem and create a new experiment.',
    icon: FlaskConical,
  },
  {
    step: 2,
    to: '/preprocessing',
    label: 'Preprocessing',
    description: 'Normalize features, select features, and split the dataset.',
    icon: SlidersHorizontal,
  },
  {
    step: 3,
    to: '/models',
    label: 'Model',
    description: 'Configure the model architecture and hyperparameters.',
    icon: Cpu,
  },
  {
    step: 4,
    to: '/training',
    label: 'Training',
    description: 'Train the model and monitor progress.',
    icon: PlayCircle,
  },
  {
    step: 5,
    to: '/evaluation',
    label: 'Evaluation',
    description: "Review performance metrics on the trained model.",
    icon: ClipboardCheck,
  },
  {
    step: 6,
    to: '/prediction',
    label: 'Prediction',
    description: 'Run inference on new data with the trained model.',
    icon: Target,
  },
] as const

function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Walk through each stage of the radiomics ML workflow.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map(({ step, to, label, description, icon: Icon }) => (
          <Card key={to}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Step {step}
                </span>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button size="sm" variant="outline" render={<Link to={to} />}>
                Open
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
