export function SynoraLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Hexagon */}
      <path
        d="M24 2L44 14V34L24 46L4 34V14L24 2Z"
        stroke="url(#hexGradient)"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Inner network nodes */}
      {/* Center node */}
      <circle cx="24" cy="24" r="3" fill="#7c3aed" />
      
      {/* Top node */}
      <circle cx="24" cy="12" r="2.5" fill="#06b6d4" />
      
      {/* Top right node */}
      <circle cx="34" cy="18" r="2.5" fill="#10b981" />
      
      {/* Bottom right node */}
      <circle cx="34" cy="30" r="2.5" fill="#7c3aed" />
      
      {/* Bottom node */}
      <circle cx="24" cy="36" r="2.5" fill="#06b6d4" />
      
      {/* Bottom left node */}
      <circle cx="14" cy="30" r="2.5" fill="#10b981" />
      
      {/* Top left node */}
      <circle cx="14" cy="18" r="2.5" fill="#7c3aed" />
      
      {/* Connection lines from center to outer nodes */}
      <line x1="24" y1="24" x2="24" y2="12" stroke="#7c3aed" strokeWidth="1" opacity="0.6" />
      <line x1="24" y1="24" x2="34" y2="18" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
      <line x1="24" y1="24" x2="34" y2="30" stroke="#10b981" strokeWidth="1" opacity="0.6" />
      <line x1="24" y1="24" x2="24" y2="36" stroke="#7c3aed" strokeWidth="1" opacity="0.6" />
      <line x1="24" y1="24" x2="14" y2="30" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
      <line x1="24" y1="24" x2="14" y2="18" stroke="#10b981" strokeWidth="1" opacity="0.6" />
      
      {/* Outer ring connections */}
      <line x1="24" y1="12" x2="34" y2="18" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
      <line x1="34" y1="18" x2="34" y2="30" stroke="#10b981" strokeWidth="1" opacity="0.4" />
      <line x1="34" y1="30" x2="24" y2="36" stroke="#7c3aed" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="36" x2="14" y2="30" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="30" x2="14" y2="18" stroke="#10b981" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="18" x2="24" y2="12" stroke="#7c3aed" strokeWidth="1" opacity="0.4" />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="hexGradient" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  )
}
