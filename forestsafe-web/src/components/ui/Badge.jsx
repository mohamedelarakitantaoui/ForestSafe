const variants = {
  pending: 'bg-warning-50 text-warning-700 border-warning-200',
  sent: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  resolved: 'bg-primary-50 text-primary-700 border-primary-200',
  failed: 'bg-danger-50 text-danger-700 border-danger-200',
};

export default function Badge({ variant = 'pending', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
