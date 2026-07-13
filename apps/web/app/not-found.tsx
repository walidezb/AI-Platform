import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white px-4">
      <div className="text-8xl font-bold text-slate-800 tracking-wider">404</div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Page not found
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/manage/dashboard"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-md text-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="border border-slate-800 hover:bg-slate-900 text-slate-300 font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
