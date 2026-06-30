import { avatarColor, initials } from '@/lib/avatar'

interface Props {
  seed: string // address — for stable color
  label: string // name or address — for initials
  size?: number
}

export function Avatar({ seed, label, size = 40 }: Props) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(seed),
        fontSize: size * 0.38,
      }}
    >
      {initials(label)}
    </div>
  )
}
