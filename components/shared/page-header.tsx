import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
      </div>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{action}</div> : null}
    </div>
  );
}
