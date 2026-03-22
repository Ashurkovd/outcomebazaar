import React from 'react';

const PrivacyContent = () => {
  return (
    <div className="space-y-6 text-sm">
      <p className="text-purple-200 text-xs italic">Last Updated: January 19, 2025</p>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
        <p className="text-purple-100 mb-3">
          Welcome to OutcomeBazaar. This Privacy Policy explains how we handle information when you use our prediction market platform.
        </p>
        <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-4">
          <p className="text-blue-200 font-semibold">
            Key Point: OutcomeBazaar uses blockchain technology. We do not collect, store, or process personal information in the traditional sense. Your interactions are primarily with blockchain technology, not our servers.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">2. What We Collect</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">2.1 Information We DON'T Collect</h3>
        <p className="text-purple-100 mb-2">We do not collect:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Names, email addresses, or contact information</li>
          <li>Government-issued IDs or KYC documents</li>
          <li>Payment card information</li>
          <li>Social security numbers or tax IDs</li>
          <li>Personal addresses or phone numbers</li>
          <li>Login credentials or passwords</li>
        </ul>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-4">2.2 Information We DO Collect</h3>
        <p className="text-purple-100 mb-2">We collect minimal technical information to operate the Platform:</p>

        <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20 mb-3">
          <h4 className="text-purple-300 font-semibold mb-2">Blockchain Data (Public):</h4>
          <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
            <li>Your wallet address (public by nature of blockchain)</li>
            <li>Your transaction history on our smart contracts (public on blockchain)</li>
            <li>Market positions and trades (public on blockchain)</li>
            <li>Gas fees paid (public on blockchain)</li>
          </ul>
        </div>

        <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20 mb-3">
          <h4 className="text-purple-300 font-semibold mb-2">Website Analytics (Optional):</h4>
          <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
            <li>Browser type and version</li>
            <li>Device type (mobile/desktop)</li>
            <li>Pages visited and time spent</li>
            <li>Referral sources</li>
            <li>General geographic location (country/region only)</li>
            <li>IP address (anonymized)</li>
          </ul>
        </div>

        <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20">
          <h4 className="text-purple-300 font-semibold mb-2">Local Storage:</h4>
          <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
            <li>Wallet connection preferences</li>
            <li>UI preferences (dark mode, etc.)</li>
            <li>Cached market data for performance</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">3. How Blockchain Works</h2>

        <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Public Nature of Blockchain</h3>
          <p className="text-yellow-200 mb-2">All blockchain transactions are public and permanent:</p>
          <ul className="list-disc list-inside text-yellow-200 space-y-1 ml-4">
            <li>Anyone can view transactions associated with your wallet address</li>
            <li>Your trading history is publicly visible on block explorers</li>
            <li>Market positions can be traced to wallet addresses</li>
            <li>This is inherent to blockchain technology, not our choice</li>
          </ul>
        </div>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">What This Means for You</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>You are responsible for your own privacy</li>
          <li>Consider using a separate wallet for prediction markets</li>
          <li>Do not reuse wallets if you want privacy</li>
          <li>Your wallet address may be linked to your identity elsewhere</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">4. How We Use Information</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">4.1 Website Analytics</h3>
        <p className="text-purple-100 mb-2">We use analytics to:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Improve Platform performance and user experience</li>
          <li>Understand which features are most used</li>
          <li>Identify and fix technical issues</li>
          <li>Optimize for different devices and browsers</li>
        </ul>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">4.2 Local Storage</h3>
        <p className="text-purple-100 mb-2">We use local storage to:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Remember your wallet connection</li>
          <li>Save your UI preferences</li>
          <li>Cache market data for faster loading</li>
          <li>Improve your user experience</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">5. Data Security</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">Our Measures</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>HTTPS encryption for all website traffic</li>
          <li>No central database of user information</li>
          <li>No password storage (wallet-based authentication)</li>
          <li>Regular security reviews of smart contracts</li>
        </ul>

        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-4 mt-4">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Your Responsibilities</h3>
          <ul className="list-disc list-inside text-red-200 space-y-1 ml-4">
            <li>Secure your wallet and private keys</li>
            <li>Use strong passwords for your wallet</li>
            <li>Enable two-factor authentication where available</li>
            <li>Keep your recovery phrase offline and secure</li>
            <li>Use hardware wallets for large amounts</li>
          </ul>
          <p className="text-red-300 font-bold mt-3">
            We cannot recover lost private keys or reverse blockchain transactions. You are solely responsible for wallet security.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">Website Data</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Analytics data: Retained for 12-24 months</li>
          <li>Server logs: Retained for 30-90 days</li>
          <li>Local storage: Remains until you clear it</li>
        </ul>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">Blockchain Data</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Blockchain data is permanent and immutable</li>
          <li>Transactions cannot be deleted</li>
          <li>Smart contract state is permanent</li>
          <li>This is inherent to blockchain technology</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">7. Your Privacy Best Practices</h2>
        <p className="text-purple-100 mb-2">To maintain privacy while using OutcomeBazaar:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Use a dedicated wallet for prediction markets</li>
          <li>Don't reuse wallet addresses across platforms</li>
          <li>Consider using a VPN for additional privacy</li>
          <li>Don't share your trading activities publicly</li>
          <li>Be aware that on-chain analysis can link activities</li>
          <li>Assume all transactions are public and permanent</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">8. Third-Party Services</h2>
        <p className="text-purple-100 mb-2">We may use:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li><span className="font-semibold">Analytics providers</span> (e.g., Google Analytics) - See usage statistics</li>
          <li><span className="font-semibold">RPC providers</span> (e.g., Alchemy, Infura) - Your wallet address may pass through their servers</li>
          <li><span className="font-semibold">Hosting providers</span> - May log IP addresses</li>
          <li><span className="font-semibold">CDNs</span> - May cache content and log requests</li>
        </ul>
        <p className="text-purple-200 mt-2 text-xs">These providers have their own privacy policies.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">9. MetaMask and Wallets</h2>
        <p className="text-purple-100 mb-2">When you connect your wallet:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>MetaMask and other wallets have their own privacy policies</li>
          <li>Your wallet provider can see your activity</li>
          <li>Wallet providers may collect usage data</li>
          <li>Review your wallet provider's privacy policy</li>
        </ul>
        <p className="text-purple-200 mt-2">We do not control or access your wallet directly.</p>
      </section>

      <section className="bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg p-6">
        <h2 className="text-xl font-bold text-purple-200 mb-3">Summary - In Plain English</h2>
        <ul className="list-disc list-inside text-purple-200 space-y-2 ml-4">
          <li>We don't collect personal information like email or name</li>
          <li>Your wallet address and transactions are public on the blockchain</li>
          <li>We use basic analytics to improve the Platform</li>
          <li>You are responsible for your wallet security and privacy</li>
          <li>Blockchain data is permanent and public</li>
          <li>You control your participation and data</li>
        </ul>
        <p className="text-purple-300 font-semibold text-center text-base mt-4">
          Blockchain technology is transparent by design. All transactions are public and permanent.
        </p>
      </section>

      <section>
        <p className="text-purple-300 text-xs italic text-center">
          This Privacy Policy is effective as of January 19, 2025 and applies to all users of the Platform.
        </p>
      </section>
    </div>
  );
};

export default PrivacyContent;
