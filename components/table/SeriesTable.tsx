import { copyFor } from '@/lib/i18n/copy'
import { formatMonth, formatRadiance, formatRatio, type Locale } from '@/lib/i18n'
import { flagLabel } from '@/lib/lights/divergence'
import type { ContaminationFlag, MonthlyRecord } from '@/lib/lights/types'

/**
 * The chart's text equivalent.
 *
 * Always present rather than a fallback, and it is what someone would paste
 * into a message. DESIGN.md §9. Every row carries its observation count, and
 * a no-data row says so in words instead of showing a zero.
 */
export function SeriesTable({
  months,
  flags,
  locale,
  currentMonth,
}: {
  months: readonly MonthlyRecord[]
  flags: readonly ContaminationFlag[]
  locale: Locale
  currentMonth?: string
}) {
  const copy = copyFor(locale)
  const flagByMonth = new Map(flags.map((flag) => [flag.month, flag]))

  return (
    <div className="max-h-[28rem] overflow-auto rounded-sm border border-rule">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <caption className="sr-only">{copy.city.tableTitle}</caption>
        <thead className="sticky top-0 bg-panel">
          <tr className="border-b border-rule">
            <th scope="col" className="px-3 py-2 font-normal text-muted">{copy.city.currentMonth}</th>
            <th scope="col" className="px-3 py-2 text-right font-normal text-muted">
              {copy.city.meanRadiance}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal text-muted">
              {copy.city.litRatio}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal text-muted">
              {copy.city.observations}
            </th>
            <th scope="col" className="px-3 py-2 font-normal text-muted">{copy.legend.title}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((record) => {
            const flag = flagByMonth.get(record.month)
            const isCurrent = record.month === currentMonth
            return (
              <tr
                key={record.month}
                className={`border-b border-rule/60 ${isCurrent ? 'bg-panel' : ''}`}
              >
                <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-normal">
                  {formatMonth(record.month, locale)}
                </th>
                {record.type === 'no-data' ? (
                  <td colSpan={2} className="px-3 py-1.5 text-right text-nodata">
                    {copy.city.noDataMonth}
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-1.5 text-right">{formatRadiance(record.meanRadiance)}</td>
                    <td className="px-3 py-1.5 text-right">{formatRatio(record.litRatio)}</td>
                  </>
                )}
                <td className="px-3 py-1.5 text-right">{record.observations}</td>
                <td className="px-3 py-1.5">
                  {record.type === 'no-data'
                    ? copy.legend.noDataSwatch
                    : record.adequacy === 'sparse'
                      ? copy.city.adequacySparse
                      : copy.city.adequacyAdequate}
                  {flag === undefined ? '' : ` ${flagLabel(flag.reason).glyph}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
