import { Suspense } from 'react';
import AdventureContent from './adventure-content';

export default function AdventurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    }>
      <AdventureContent />
    </Suspense>
  );
}
