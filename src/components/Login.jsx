import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await requestOtp(trimmed);
      setEmail(trimmed);
      setStep('code');
      setInfo(`We sent a 6-digit code to ${trimmed}. It expires in 10 minutes.`);
    } catch (err) {
      if (err.status === 429) {
        setError('Please wait a moment before requesting another code.');
      } else {
        setError(err.message || 'Could not send code. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(email, code);
      // On success, AuthProvider sets the user; App will swap to the main UI.
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await requestOtp(email);
      setInfo(`A new code is on its way to ${email}.`);
    } catch (err) {
      if (err.status === 429) {
        setError('Please wait a moment before requesting another code.');
      } else {
        setError(err.message || 'Could not send code. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setInfo('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">OutcomeBazaar</h1>
            <p className="text-purple-300 text-sm">Forecast Exchange</p>
          </div>
        </div>

        <div className="bg-black bg-opacity-40 backdrop-blur-md border border-purple-500 border-opacity-30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {step === 'email' ? (
            <form onSubmit={handleRequestOtp}>
              <h2 className="text-xl font-bold text-white mb-2">Sign in</h2>
              <p className="text-purple-300 text-sm mb-6">
                Enter your email and we'll send you a 6-digit code.
              </p>
              <label className="block text-purple-300 text-sm font-medium mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative mb-4">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-purple-900 bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-400 disabled:opacity-50"
                />
              </div>
              {error && (
                <p className="text-red-300 text-sm mb-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                {submitting ? 'Sending code…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <button
                type="button"
                onClick={handleBackToEmail}
                disabled={submitting}
                className="flex items-center gap-1 text-purple-300 hover:text-white text-sm mb-4 disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Use a different email
              </button>
              <h2 className="text-xl font-bold text-white mb-2">Enter your code</h2>
              <p className="text-purple-300 text-sm mb-6">
                Sent to <span className="text-white">{email}</span>
              </p>
              <label className="block text-purple-300 text-sm font-medium mb-2" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={submitting}
                placeholder="123456"
                className="w-full px-4 py-3 bg-purple-900 bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-400 text-center text-2xl tracking-widest font-mono disabled:opacity-50"
              />
              {info && !error && (
                <p className="text-purple-300 text-sm mt-3">{info}</p>
              )}
              {error && (
                <p className="text-red-300 text-sm mt-3 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                {submitting ? 'Verifying…' : 'Verify and sign in'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="w-full mt-3 text-purple-300 hover:text-white text-sm disabled:opacity-50"
              >
                Didn't get the code? Resend
              </button>
            </form>
          )}
        </div>

        <p className="text-purple-400 text-xs text-center mt-6">
          By signing in you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
