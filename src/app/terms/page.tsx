export default function TermsPage() {
  return (
    <main className="flex flex-col min-h-screen px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold mb-1">Terms of service</h1>
      <p className="text-xs text-gray-400 mb-6">Last updated: 30 June 2026</p>

      <div className="space-y-5 text-sm text-gray-700">
        <Section title="1. What Bundl does">
          Bundl is a non-custodial payment-bundling tool that groups your recurring payments into a
          single on-chain transaction. Bundl does not hold, store, or control your funds at any
          time. All transfers go directly from your wallet to the recipients you specify.
        </Section>

        <Section title="2. Your wallet">
          You are solely responsible for your wallet and private keys. Bundl cannot reverse
          transactions, recover lost keys, or refund payments sent to incorrect addresses.
        </Section>

        <Section title="3. Service fee">
          Bundl charges a flat service fee of $0.15 per settled bundle. This fee is included in
          the single on-chain transaction and is non-refundable.
        </Section>

        <Section title="4. Network fees">
          Celo network fees (gas) apply to every transaction and are paid from your wallet. These
          fees go to the Celo network, not to Bundl.
        </Section>

        <Section title="5. No financial advice">
          Bundl is a tool, not a financial service. Nothing in the app constitutes financial,
          investment, or legal advice.
        </Section>

        <Section title="6. Availability">
          Bundl is provided as-is. We make no guarantees of uptime or error-free operation. The
          smart contracts used are unaudited MVP code — do not use with amounts you cannot afford
          to lose.
        </Section>

        <Section title="7. Governing law">
          These terms are governed by the laws of the jurisdiction of the operator. Disputes will
          be resolved by mutual agreement where possible.
        </Section>

        <Section title="8. Contact">
          For questions or concerns, contact us via the support link in the app.
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="leading-relaxed text-gray-600">{children}</p>
    </div>
  )
}
