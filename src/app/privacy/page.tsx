export default function PrivacyPage() {
  return (
    <main className="flex flex-col min-h-screen px-4 pt-6 pb-10">
      <h1 className="text-2xl font-bold mb-1">Privacy policy</h1>
      <p className="text-xs text-gray-400 mb-6">Last updated: 30 June 2026</p>

      <div className="space-y-5 text-sm text-gray-700">
        <Section title="1. Data we collect">
          Bundl stores your recurring payment list (names, wallet addresses, amounts) and pot
          history locally on your device using browser storage. This data never leaves your device
          unless you explicitly share it.
        </Section>

        <Section title="2. On-chain data">
          Transactions you confirm are recorded on the Celo blockchain, which is public and
          permanent. This includes recipient addresses, amounts, and transaction timestamps.
          Bundl does not control this data.
        </Section>

        <Section title="3. Analytics">
          Bundl may collect anonymous usage analytics (page views, feature usage) to improve the
          product. No personally identifiable information is collected. No wallet addresses are
          sent to analytics services.
        </Section>

        <Section title="4. Third-party services">
          Bundl uses the Celo network (public blockchain) and MiniPay (Opera Mini embedded
          wallet). Their respective privacy policies apply to their services.
        </Section>

        <Section title="5. Data retention">
          Local data persists until you clear your browser storage or uninstall MiniPay. We do
          not retain data on our servers beyond anonymous analytics aggregates.
        </Section>

        <Section title="6. Your rights">
          You can delete your local data at any time by clearing browser storage. For any other
          privacy requests, contact us via the support link in the app.
        </Section>

        <Section title="7. Contact">
          Privacy questions: contact us via the support link in the app.
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
