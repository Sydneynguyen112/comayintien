import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left 50% — Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-tertiary dark:bg-[#141414]">
        {/* Decorative gradient orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />

        {/* Center content */}
        <div className="relative flex flex-col items-center justify-center w-full px-12">
          <Link href="/" className="text-5xl font-bold text-primary tracking-tight">
            ROVA
          </Link>
          <p className="mt-4 text-base text-muted-foreground text-center max-w-xs">
            Nền tảng học Trading chuyên nghiệp dành cho người Việt
          </p>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <span>500+ Học viên</span>
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span>2 Khoá học</span>
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span>2 Mentor</span>
          </div>
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-xs text-muted-foreground/60 tracking-widest uppercase">
            ROVA Trading Academy
          </p>
        </div>
      </div>

      {/* Right 50% — Form area */}
      <div className="flex-1 flex flex-col min-h-screen bg-background relative">
        {/* Top bar: Logo */}
        <div className="relative flex items-center justify-between px-6 py-5 lg:px-10 lg:py-6">
          <Link href="/" className="text-2xl font-bold text-primary">
            ROVA
          </Link>
        </div>

        {/* Centered form */}
        <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Bottom */}
        <div className="relative px-6 py-5 lg:px-10">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ROVA. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
