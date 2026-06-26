export default function Spinner({ size = 32, color = '#009ee3' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="s-spin">
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.15" strokeWidth="2.5" />
      <circle
        className="s-arc"
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="1 63"
      />
    </svg>
  );
}
