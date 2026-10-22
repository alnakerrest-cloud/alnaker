'use client';

export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn solid" onClick={() => window.print()}>
      {label}
    </button>
  );
}
