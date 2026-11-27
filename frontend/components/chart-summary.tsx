import { formatINR } from "@/lib/format";
import type { OverviewData } from "@/types/pulse";
export function ChartSummary({ data }: { data: OverviewData }) {
  return (
    <details className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Read chart values
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">
            Monthly income and spending in Indian rupees
          </caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Income</th>
              <th scope="col">Expenses</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly_trends.map((m) => (
              <tr key={m.month}>
                <th scope="row" className="font-normal">
                  {m.label}
                </th>
                <td className="tabular-nums">{formatINR(m.income_minor)}</td>
                <td className="tabular-nums">{formatINR(m.expense_minor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
