import { Suspense } from 'react';
import CoursesContent from './courses-content';

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CoursesContent />
    </Suspense>
  );
}
