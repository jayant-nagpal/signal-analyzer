import type { ActiveTab } from '../lib/types';

interface Props {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="tab-nav" aria-label="Main navigation">
      <button
        className={`tab-btn${active === 'throttle' ? ' active' : ''}`}
        onClick={() => onChange('throttle')}
        aria-current={active === 'throttle' ? 'page' : undefined}
      >
        Signal Throttle
      </button>
      <button
        className={`tab-btn${active === 'portfolio' ? ' active' : ''}`}
        onClick={() => onChange('portfolio')}
        aria-current={active === 'portfolio' ? 'page' : undefined}
      >
        Portfolio Analyzer
      </button>
    </nav>
  );
}
