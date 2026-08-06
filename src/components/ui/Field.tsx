export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
