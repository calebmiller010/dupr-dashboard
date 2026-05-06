export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-8 text-text-muted text-sm">
      {message}
    </div>
  );
}
