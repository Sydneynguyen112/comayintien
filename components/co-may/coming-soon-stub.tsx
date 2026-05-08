import { Construction } from "lucide-react";

export function ComingSoonStub({
  module,
  description,
}: {
  module: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30">
        <Construction className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-semibold text-foreground">{module}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-medium">
        Coming Soon
      </span>
    </div>
  );
}
