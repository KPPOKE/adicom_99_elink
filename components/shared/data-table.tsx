"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type ColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Cari data...",
  filters,
  serverPagination,
  tableClassName
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  filters?: ReactNode;
  serverPagination?: { page: number; pageSize: number; total: number; query: Record<string, string> };
  tableClassName?: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
    manualPagination: Boolean(serverPagination)
  });

  const pageCount = serverPagination ? Math.max(1, Math.ceil(serverPagination.total / serverPagination.pageSize)) : table.getPageCount() || 1;
  const page = serverPagination?.page ?? table.getState().pagination.pageIndex + 1;
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams(serverPagination?.query);
    query.set("page", String(nextPage));
    return `?${query.toString()}`;
  };
  const Toolbar = serverPagination ? "form" : "div";

  return (
    <div className="min-w-0 space-y-4">
      <Toolbar className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Input className={cn(serverPagination ? "pr-11" : undefined)} name={serverPagination ? "q" : undefined} placeholder={searchPlaceholder} defaultValue={serverPagination?.query.q} value={serverPagination ? undefined : globalFilter} onChange={serverPagination ? undefined : (event) => setGlobalFilter(event.target.value)} />
          {serverPagination ? <Button type="submit" variant="ghost" size="icon" aria-label="Cari" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-cyan-300 hover:bg-cyan-500/10"><Search className="h-4 w-4" /></Button> : null}
        </div>
        {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
      </Toolbar>
      <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-lg">
        <div className="min-w-0 overflow-x-auto">
          <table className={cn("w-full min-w-[760px] text-sm", tableClassName)}>
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as ColumnMeta | undefined;

                    return (
                      <th key={header.id} className={cn("px-4 py-3 font-semibold", meta?.headerClassName)}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-800/50 group">
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;

                      return (
                        <td key={cell.id} className={cn("px-4 py-3 align-middle text-slate-300", meta?.cellClassName)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6">
                    <EmptyState title="Data belum tersedia" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
        <span>
          {serverPagination?.total ?? table.getFilteredRowModel().rows.length} data, halaman {page} dari {pageCount}
        </span>
        <div className="flex gap-2">
          {serverPagination ? (
            <>
              <Button asChild variant="outline" size="sm" disabled={page <= 1}><Link href={pageHref(Math.max(1, page - 1))}>Sebelumnya</Link></Button>
              <Button asChild variant="outline" size="sm" disabled={page >= pageCount}><Link href={pageHref(Math.min(pageCount, page + 1))}>Berikutnya</Link></Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
