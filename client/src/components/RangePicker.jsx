import { RANGES } from '../analytics.js';

export function RangePicker({ range, onRange }) {
  return (
    <div className="range">
      {RANGES.map((item) => (
        <button
          key={item.value}
          type="button"
          className={range === item.value ? 'active' : ''}
          onClick={() => onRange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
