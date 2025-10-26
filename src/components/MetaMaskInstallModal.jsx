import React from 'react';
import { ExternalLink } from 'lucide-react';

export const MetaMaskInstallModal = ({ browserType, onClose }) => {
  const getModalContent = () => {
    switch (browserType) {
      case 'safari-desktop':
        return {
          icon: '⚠️',
          title: 'Safari Not Supported',
          message: 'MetaMask extension is not available for Safari browser.',
          subMessage: 'Please use one of these browsers:',
          browsers: ['Chrome', 'Firefox', 'Brave'],
          primaryButton: {
            text: 'Download Chrome',
            url: 'https://www.google.com/chrome/',
          },
          secondaryButton: {
            text: 'Download Firefox',
            url: 'https://www.mozilla.org/firefox/',
          },
        };

      case 'iphone':
        return {
          icon: '📱',
          title: 'Open in MetaMask App',
          message: 'To trade on mobile, use the MetaMask mobile app',
          primaryButton: {
            text: 'Open in MetaMask',
            url: `https://metamask.app.link/dapp/${window.location.host}`,
          },
          secondaryButton: {
            text: 'Install from App Store',
            url: 'https://apps.apple.com/app/metamask/id1438144202',
          },
        };

      case 'mobile':
        return {
          icon: '📱',
          title: 'Open in MetaMask App',
          message: 'To trade on mobile, use the MetaMask mobile app',
          primaryButton: {
            text: 'Open in MetaMask',
            url: `https://metamask.app.link/dapp/${window.location.host}`,
          },
          secondaryButton: {
            text: 'Learn More',
            url: 'https://metamask.io/download/',
          },
        };

      default: // desktop
        return {
          icon: '🦊',
          title: 'MetaMask Required',
          message: 'Install MetaMask wallet to connect and start trading',
          primaryButton: {
            text: 'Install MetaMask',
            url: 'https://metamask.io/download/',
          },
          secondaryButton: {
            text: 'Learn More',
            url: 'https://metamask.io/',
          },
        };
    }
  };

  const content = getModalContent();

  const handleButtonClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full shadow-2xl border border-purple-500 border-opacity-30 p-6">
        <div className="flex items-center justify-center mb-4">
          <span className="text-6xl">{content.icon}</span>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-3">
          {content.title}
        </h2>

        <p className="text-purple-200 text-center mb-4">
          {content.message}
        </p>

        {content.subMessage && (
          <div className="mb-4">
            <p className="text-purple-300 text-sm text-center mb-2">
              {content.subMessage}
            </p>
            <ul className="text-purple-200 text-sm text-center space-y-1">
              {content.browsers.map((browser) => (
                <li key={browser}>• {browser}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleButtonClick(content.primaryButton.url)}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {content.primaryButton.text}
            <ExternalLink size={16} />
          </button>

          {content.secondaryButton && (
            <button
              onClick={() => handleButtonClick(content.secondaryButton.url)}
              className="w-full px-6 py-3 bg-purple-500 bg-opacity-20 hover:bg-opacity-30 text-purple-300 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {content.secondaryButton.text}
              <ExternalLink size={16} />
            </button>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
