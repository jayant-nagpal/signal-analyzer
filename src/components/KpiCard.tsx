interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'accent';
}

export function KpiCard({ label, value, subtitle, tone = 'neutral' }: Props) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value mono ${tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : tone === 'warning' ? 'warning' : tone === 'accent' ? 'accent' : ''}`}>
        {value}
      </div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
    </div>
  );
}
