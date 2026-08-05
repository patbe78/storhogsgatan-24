export function AppIcon({ size = 72 }: { size?: number }) {
  return (
    <img
      className="app-icon"
      src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  )
}
