import type { ActiveTab } from '../lib/types';

interface Props {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

// TabNav is kept for reference but not rendered — app is throttle-only.
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
    </nav>
  );
}
