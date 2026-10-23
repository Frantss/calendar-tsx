import type { Measurement } from './measure';

/** The measured contrast pairs, with the WCAG AA minimum each one needs. */
export function ContrastReadout({ measurement, loading }: { measurement: Measurement | null; loading: boolean }) {
  return (
    <section aria-labelledby='contrast-heading' className='flex flex-col gap-2'>
      <h2 id='contrast-heading' className='text-[13px] font-semibold'>
        Contrast{measurement ? `, ${measurement.mode} palette` : ''}
      </h2>
      {!measurement ? (
        <p className='text-[13px] text-fd-muted-foreground'>
          {loading ? 'Measuring once the preview loads…' : 'The preview has not reported its colors.'}
        </p>
      ) : measurement.contrast.every(pair => pair.ratio === null) ? (
        <p className='text-[13px] text-fd-muted-foreground'>
          This theme sets no colors, so there is nothing to measure.
        </p>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-fd-border'>
          <table className='w-full text-[12px]'>
            <thead className='bg-fd-muted text-left text-fd-muted-foreground'>
              <tr>
                <th scope='col' className='px-2 py-1 font-medium'>
                  Pair
                </th>
                <th scope='col' className='px-2 py-1 font-medium'>
                  Ratio
                </th>
                <th scope='col' className='px-2 py-1 font-medium'>
                  AA
                </th>
              </tr>
            </thead>
            <tbody>
              {measurement.contrast.map(pair => {
                const passes = pair.ratio !== null && pair.ratio >= pair.minimum;
                // text pairs always need their minimum; a border needs 3:1 only where it is what shows an edge
                const required = pair.minimum > 3;

                return (
                  <tr key={pair.label} className='border-t border-fd-border'>
                    <th scope='row' className='px-2 py-1 text-left font-normal'>
                      {pair.label}
                    </th>
                    <td className='px-2 py-1 font-mono'>
                      {pair.ratio === null ? 'n/a' : `${pair.ratio.toFixed(2)}:1`}
                    </td>
                    <td className={`px-2 py-1 ${passes || !required ? '' : 'font-semibold text-fd-error'}`}>
                      {pair.ratio === null
                        ? 'not set'
                        : passes
                          ? `Pass (${pair.minimum}:1)`
                          : `Below ${pair.minimum}:1`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className='text-[11px] text-fd-muted-foreground'>
        Measured from the rendered preview, with translucent colors composited over the surface. Text needs 4.5:1.
        Borders need 3:1 only where the border is what shows a control's edge (WCAG 1.4.11); grid lines that only
        decorate do not.
      </p>
    </section>
  );
}
