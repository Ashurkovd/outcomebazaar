import React from 'react';
import { X, FileText } from 'lucide-react';

const LegalDocModal = ({ title, content, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-4xl w-full shadow-2xl border border-purple-500 border-opacity-30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-purple-500 border-opacity-20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              <X className="text-purple-300 hover:text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-purple max-w-none" style={{WebkitOverflowScrolling: 'touch'}}>
          <div className="text-purple-100 leading-relaxed">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-purple-500 border-opacity-20 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDocModal;
