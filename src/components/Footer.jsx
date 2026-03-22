import React from 'react';
import { ExternalLink } from 'lucide-react';

const Footer = ({ onOpenTerms, onOpenPrivacy }) => {
  return (
    <footer className="bg-gradient-to-b from-transparent to-black bg-opacity-50 border-t border-purple-500 border-opacity-20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side - Branding */}
          <div className="text-center md:text-left">
            <p className="text-purple-300 text-sm">
              OutcomeBazaar - Prediction Markets
            </p>
            <p className="text-purple-400 text-xs mt-1">
              Built on Polygon • Powered by Smart Contracts
            </p>
          </div>

          {/* Center - Links */}
          <div className="flex gap-6 items-center">
            <button
              onClick={onOpenTerms}
              className="text-purple-300 hover:text-purple-100 text-sm transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={onOpenPrivacy}
              className="text-purple-300 hover:text-purple-100 text-sm transition-colors"
            >
              Privacy Policy
            </button>
            <a
              href="https://docs.polygon.technology/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:text-purple-100 text-sm transition-colors flex items-center gap-1"
            >
              Polygon Docs
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Right side - Disclaimer */}
          <div className="text-center md:text-right">
            <p className="text-purple-400 text-xs">
              Use at your own risk
            </p>
            <p className="text-purple-500 text-xs mt-1">
              &copy; 2025 OutcomeBazaar
            </p>
          </div>
        </div>

        {/* Bottom disclaimer */}
        <div className="mt-4 pt-4 border-t border-purple-500 border-opacity-10">
          <p className="text-purple-400 text-xs text-center">
            All transactions are irreversible. Only participate with funds you can afford to lose.
            Read our Terms of Service and Privacy Policy before using.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
