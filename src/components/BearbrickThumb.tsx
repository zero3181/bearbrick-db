// Renders a bearbrick photo edge-to-edge (matching the surrounding card),
// or - when there's no photo yet - the dummy bearbrick silhouette (shrunk to
// 80% and centered, no border) with a bold white "?" over its chest, so it
// reads as "unknown/no photo" rather than a fake real photo.
export default function BearbrickThumb({
  src,
  alt,
  className = '',
}: {
  src: string | null | undefined
  alt: string
  className?: string
}) {
  if (!src) {
    return (
      <div className="relative w-full h-full flex items-center justify-center" role="img" aria-label={alt}>
        <img src="/bearbrick-placeholder.svg" alt="" className="w-4/5 h-4/5 object-contain" />
        {/* Sized identically to the bear image above (w-4/5 h-4/5) rather
            than a smaller percentage of the outer box - a percentage height
            nested another level down isn't guaranteed to resolve against a
            definite parent height, and silently falls back to a large
            default SVG size instead of shrinking. The actual glyph size is
            controlled by fontSize within this shared-size viewBox instead. */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-4/5 h-4/5 m-auto pointer-events-none">
          <text x="50" y="70" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="800" fill="white">
            ?
          </text>
        </svg>
      </div>
    )
  }
  return <img src={src} alt={alt} className={`w-full h-full object-cover object-top ${className}`} />
}
