import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

const TermsAcceptanceModal = ({ onAccept, onViewTerms, onViewPrivacy }) => {
  const [hasRead, setHasRead] = useState(false);
  const [understandsRisks, setUnderstandsRisks] = useState(false);

  const canAccept = hasRead && understandsRisks;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-2xl w-full shadow-2xl border border-purple-500 border-opacity-30">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-purple-500 border-opacity-20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <AlertCircle className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to OutcomeBazaar</h2>
              <p className="text-purple-300 text-sm">Please read and accept our terms</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto" style={{WebkitOverflowScrolling: 'touch'}}>
          {/* Important Notice */}
          <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">Important Notice</h3>
                <ul className="text-red-200 text-sm space-y-1">
                  <li>• All transactions are irreversible and public on the blockchain</li>
                  <li>• You may lose all funds you commit to markets</li>
                  <li>• We do not provide financial, investment, or legal advice</li>
                  <li>• You are responsible for your own wallet security</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Points */}
          <div className="space-y-4 mb-6">
            <h3 className="text-white font-semibold text-lg mb-3">Key Points:</h3>

            <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20">
              <h4 className="text-purple-300 font-semibold mb-2">🔐 Wallet Security</h4>
              <p className="text-purple-200 text-sm">
                You are solely responsible for your wallet and private keys. We cannot recover lost keys or reverse transactions.
              </p>
            </div>

            <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20">
              <h4 className="text-purple-300 font-semibold mb-2">📊 Blockchain Transparency</h4>
              <p className="text-purple-200 text-sm">
                All your trades and positions are public on the Polygon blockchain. Anyone can view transactions associated with your wallet.
              </p>
            </div>

            <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20">
              <h4 className="text-purple-300 font-semibold mb-2">⚠️ Risk Warning</h4>
              <p className="text-purple-200 text-sm">
                Prediction markets are speculative and risky. Only participate with funds you can afford to lose. Market resolutions are final.
              </p>
            </div>

            <div className="bg-black bg-opacity-30 rounded-lg p-4 border border-purple-500 border-opacity-20">
              <h4 className="text-purple-300 font-semibold mb-2">⚖️ Legal Compliance</h4>
              <p className="text-purple-200 text-sm">
                You must be 18+ and comply with all applicable laws. Prediction markets may be regulated differently in various jurisdictions.
              </p>
            </div>
          </div>

          {/* Document Links */}
          <div className="bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg p-4 mb-6">
            <h4 className="text-purple-300 font-semibold mb-3">Please review our legal documents:</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={onViewTerms}
                className="flex items-center justify-between bg-black bg-opacity-30 hover:bg-opacity-50 rounded-lg p-3 transition-colors text-left"
              >
                <span className="text-purple-200 text-sm font-medium">Terms of Service</span>
                <ExternalLink className="text-purple-400" size={16} />
              </button>
              <button
                onClick={onViewPrivacy}
                className="flex items-center justify-between bg-black bg-opacity-30 hover:bg-opacity-50 rounded-lg p-3 transition-colors text-left"
              >
                <span className="text-purple-200 text-sm font-medium">Privacy Policy</span>
                <ExternalLink className="text-purple-400" size={16} />
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={hasRead}
                  onChange={(e) => setHasRead(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-purple-500 bg-black bg-opacity-30 checked:bg-purple-500 cursor-pointer appearance-none"
                />
                {hasRead && (
                  <CheckCircle className="absolute top-0 left-0 text-white pointer-events-none" size={20} />
                )}
              </div>
              <span className="text-purple-200 text-sm group-hover:text-purple-100 transition-colors">
                I have read and agree to the Terms of Service and Privacy Policy
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={understandsRisks}
                  onChange={(e) => setUnderstandsRisks(e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-purple-500 bg-black bg-opacity-30 checked:bg-purple-500 cursor-pointer appearance-none"
                />
                {understandsRisks && (
                  <CheckCircle className="absolute top-0 left-0 text-white pointer-events-none" size={20} />
                )}
              </div>
              <span className="text-purple-200 text-sm group-hover:text-purple-100 transition-colors">
                I understand the risks and that I may lose all funds. I am 18+ and using this platform legally in my jurisdiction.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-purple-500 border-opacity-20">
          <button
            onClick={onAccept}
            disabled={!canAccept}
            className={`w-full px-6 py-4 rounded-lg font-semibold text-white transition-all ${
              canAccept
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg'
                : 'bg-gray-700 cursor-not-allowed opacity-50'
            }`}
          >
            {canAccept ? 'Accept and Continue' : 'Please check both boxes to continue'}
          </button>
          <p className="text-purple-400 text-xs text-center mt-3">
            By accepting, you acknowledge that you have read and understood our terms and the risks involved
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;
