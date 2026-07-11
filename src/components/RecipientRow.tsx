import { Avatar } from './Avatar'
import { usd } from '@/lib/format'
import { shortenAddress } from '@/lib/socialconnect'

interface Props {
  name: string
  address: string
  amount: number
  cadence?: string
  onClick?: () => void
  trailing?: React.ReactNode
}

export function RecipientRow({ name, address, amount, cadence, onClick, trailing }: Props) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-2.5 text-left ${
        onClick ? 'active:opacity-60 transition-opacity' : ''
      }`}
    >
      <Avatar seed={address} label={name} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-content truncate">{name}</p>
        {/* Names over addresses (MiniPay UI rule) — the raw address only
            appears when there is nothing friendlier to show. */}
        <p className="text-caption text-content-subtle truncate">
          {cadence ?? shortenAddress(address)}
        </p>
      </div>
      {trailing ?? (
        <span className="text-body font-semibold text-content">${usd(amount)}</span>
      )}
    </Wrapper>
  )
}
