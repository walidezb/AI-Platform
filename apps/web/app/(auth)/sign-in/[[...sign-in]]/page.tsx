import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      {/* Platform Logo */}
      <div className="flex items-center gap-2.5 mb-8 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20 text-xl">
          E
        </div>
        <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          EZ LEARN
        </span>
      </div>

      {/* Clerk Sign In component */}
      <div className="relative z-10">
        <SignIn forceRedirectUrl="/manage/dashboard" />
      </div>
    </div>
  );
}
