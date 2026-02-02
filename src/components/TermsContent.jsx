import React from 'react';

const TermsContent = () => {
  return (
    <div className="space-y-6 text-sm">
      <p className="text-purple-200 text-xs italic">Last Updated: January 19, 2025</p>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
        <p className="text-purple-100">
          By accessing and using OutcomeBazaar ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">2. What is OutcomeBazaar?</h2>
        <p className="text-purple-100 mb-2">
          OutcomeBazaar is a prediction market platform built on the Polygon blockchain. Users can:
        </p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Create prediction markets on future events</li>
          <li>Trade shares based on their predictions (YES or NO)</li>
          <li>Resolve markets based on real-world outcomes</li>
          <li>Claim winnings from correct predictions</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">3. Eligibility</h2>
        <p className="text-purple-100 mb-2">You must:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Be at least 18 years old</li>
          <li>Have the legal capacity to enter into binding contracts</li>
          <li>Comply with all local laws and regulations regarding prediction markets</li>
          <li>Not be located in a jurisdiction where prediction markets are prohibited</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">4. User Responsibilities</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">4.1 Your Wallet</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>You are solely responsible for your cryptocurrency wallet and private keys</li>
          <li>We do not have access to your wallet or funds</li>
          <li>Lost private keys cannot be recovered</li>
          <li>All transactions are irreversible</li>
        </ul>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">4.2 Your Actions</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>You are responsible for all activities under your wallet address</li>
          <li>You must conduct your own research before participating in any market</li>
          <li>You must verify market details, end times, and resolution criteria</li>
          <li>You must not manipulate markets or engage in fraudulent activity</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">5. Smart Contract Risks</h2>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">5.1 Blockchain Technology</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>The Platform operates on smart contracts deployed on the Polygon blockchain</li>
          <li>Smart contracts are immutable and cannot be modified after deployment</li>
          <li>Transactions are irreversible once confirmed on the blockchain</li>
          <li>Network congestion may cause delays or failed transactions</li>
        </ul>

        <h3 className="text-lg font-semibold text-purple-200 mb-2 mt-3">5.2 Technical Risks</h3>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Smart contracts may contain bugs or vulnerabilities</li>
          <li>The Platform may experience downtime or technical issues</li>
          <li>Gas fees and transaction costs may vary</li>
          <li>We do not guarantee uninterrupted access to the Platform</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">6. Financial Disclaimers</h2>

        <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Not Financial Advice</h3>
          <ul className="list-disc list-inside text-yellow-200 space-y-1 ml-4">
            <li>Nothing on the Platform constitutes financial, investment, or legal advice</li>
            <li>You should consult appropriate professionals before making financial decisions</li>
            <li>Past performance does not indicate future results</li>
          </ul>
        </div>

        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Risk of Loss</h3>
          <ul className="list-disc list-inside text-red-200 space-y-1 ml-4">
            <li>You may lose all funds you commit to markets</li>
            <li>Prediction markets are speculative and risky</li>
            <li>Only participate with funds you can afford to lose</li>
            <li>There is no guarantee of profit or return</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">7. Prohibited Activities</h2>
        <p className="text-purple-100 mb-2">You must not:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>Manipulate markets or engage in wash trading</li>
          <li>Create markets on illegal activities</li>
          <li>Use the Platform for money laundering</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Attempt to exploit bugs or vulnerabilities</li>
          <li>Impersonate others or provide false information</li>
          <li>Interfere with other users' access to the Platform</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">8. Limitation of Liability</h2>
        <p className="text-purple-100 mb-2">To the maximum extent permitted by law:</p>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>We are not liable for any losses, damages, or costs arising from your use of the Platform</li>
          <li>We are not liable for smart contract bugs, exploits, or failures</li>
          <li>We are not liable for incorrect market resolutions</li>
          <li>We are not liable for lost funds, missed opportunities, or trading losses</li>
          <li>Our total liability shall not exceed $100 USD</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">9. Changes to Terms</h2>
        <ul className="list-disc list-inside text-purple-100 space-y-1 ml-4">
          <li>We may update these Terms at any time</li>
          <li>Continued use of the Platform constitutes acceptance of updated Terms</li>
          <li>Material changes will be posted on the Platform</li>
          <li>You should review Terms periodically</li>
        </ul>
      </section>

      <section className="bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg p-6">
        <h2 className="text-xl font-bold text-purple-200 mb-3">IMPORTANT DISCLAIMER</h2>
        <p className="text-purple-200 mb-3">
          Use at your own risk. We provide the Platform "as is" without any warranties. You are solely responsible for your participation and any consequences thereof.
        </p>
        <p className="text-purple-200 mb-3">
          Prediction markets may be regulated differently in various jurisdictions. It is your responsibility to ensure compliance with local laws.
        </p>
        <p className="text-purple-300 font-semibold text-center text-base">
          DO NOT participate with funds you cannot afford to lose.
        </p>
      </section>

      <section>
        <p className="text-purple-300 text-xs italic text-center">
          These Terms of Service are effective as of January 19, 2025 and apply to all users of the Platform.
        </p>
      </section>
    </div>
  );
};

export default TermsContent;
