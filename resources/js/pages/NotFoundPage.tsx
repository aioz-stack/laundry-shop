import { Link } from 'react-router';
import { Compass, ShieldOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={<Compass className="size-6" />}
        title="Page not found"
        description="The page you are looking for doesn't exist or was moved."
        action={
          <Link to="/">
            <Button>Go to dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="card">
      <EmptyState
        icon={<ShieldOff className="size-6 text-rose-500" />}
        title="You don't have access to this page"
        description="Your role doesn't include this section. Ask the shop owner if you need access."
        action={
          <Link to="/">
            <Button variant="secondary">Back to home</Button>
          </Link>
        }
      />
    </div>
  );
}
