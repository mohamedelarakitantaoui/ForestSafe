import { Link } from 'react-router-dom';
import { TreePine } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-14 h-14 rounded-lg bg-primary-100 grid place-items-center mb-5">
        <TreePine className="w-7 h-7 text-primary-600" />
      </div>
      <h1 className="text-3xl font-bold text-neutral-900">404</h1>
      <p className="mt-2 text-neutral-600">Page not found</p>
      <p className="mt-1 text-sm text-neutral-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button as={Link} to="/" variant="primary" size="md" className="mt-6">
        Back to Home
      </Button>
    </div>
  );
}
