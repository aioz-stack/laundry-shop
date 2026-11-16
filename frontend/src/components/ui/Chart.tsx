import { useEffect, useRef } from 'react';
import ApexCharts, { type ApexOptions } from 'apexcharts';
import { useTheme } from '../../lib/theme';

/**
 * Ported from the Baseplate template's ApexChart wrapper, now typed and
 * theme-aware (re-renders with dark-mode colors).
 */
export function Chart({ options, className }: { options: ApexOptions; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const key = JSON.stringify(options);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const themed: ApexOptions = {
      ...options,
      chart: {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        foreColor: isDark ? '#98a1b2' : '#6b7487',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        ...options.chart,
      },
      grid: { borderColor: isDark ? '#262b36' : '#eceef2', strokeDashArray: 4, ...options.grid },
      tooltip: { theme: isDark ? 'dark' : 'light', ...options.tooltip },
    };

    const chart = new ApexCharts(containerRef.current, themed);
    chart.render();
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isDark]);

  return <div ref={containerRef} className={className} />;
}
