import React from 'react';

export const HowItWorks = () => {
  const steps = [
    {
      icon: '🦊',
      number: '1',
      title: 'Connect Your Wallet',
      description: 'Connect MetaMask in seconds. No signup, no email, no personal data needed.',
    },
    {
      icon: '📊',
      number: '2',
      title: 'Pick Your Prediction',
      description: 'Browse markets and click Yes or No on outcomes you believe will happen.',
    },
    {
      icon: '💰',
      number: '3',
      title: 'Trade & Win',
      description: 'Buy shares with USDT. If you\'re right, claim 1 USDT per share. Sell anytime.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          How It Works
        </h2>
        <p className="text-purple-300 text-lg">
          Start trading in 3 simple steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30 hover:border-opacity-60 transition-all"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <span className="text-6xl">{step.icon}</span>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {step.number}
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-3">
              {step.title}
            </h3>

            <p className="text-purple-300 text-center text-sm leading-relaxed">
              {step.description}
            </p>

            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-purple-500 text-2xl">
                →
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <a
          href="#markets"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/50"
        >
          Browse Markets
          <span>↓</span>
        </a>
      </div>
    </div>
  );
};
