export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-neutral-200 ${className}`}
      aria-hidden="true"
    />
  );
}
