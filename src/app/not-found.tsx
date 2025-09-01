import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">ページが見つかりません</h2>
        <p className="text-gray-600 mb-4">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link
          href="/"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
