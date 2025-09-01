'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">重大なエラーが発生しました</h2>
            <p className="text-gray-600 mb-4">
              申し訳ございませんが、アプリケーションで重大なエラーが発生しました。
            </p>
            <button
              onClick={reset}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
