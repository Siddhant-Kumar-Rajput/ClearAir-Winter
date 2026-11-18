import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyAirQualityPoint, HouseholdProfile } from '../types/airQuality.ts';
import {
  buildSevenDayMitigationTrend,
  WHO_24H_PM25_GUIDELINE,
  type ImpactActionInput,
  type SevenDayTrendPoint,
} from '../utils/impactCalculator.ts';

interface ImpactHistoryD3ChartProps {
  city: string;
  dailyHistory: DailyAirQualityPoint[];
  profile: HouseholdProfile;
  selectedActions: ImpactActionInput[];
}

export function ImpactHistoryD3Chart({
  city,
  dailyHistory,
  profile,
  selectedActions,
}: ImpactHistoryD3ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [chartWidth, setChartWidth] = useState(760);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const trendData: SevenDayTrendPoint[] = useMemo(
    () => buildSevenDayMitigationTrend(dailyHistory, profile, selectedActions),
    [dailyHistory, profile, selectedActions],
  );

  // Responsive ResizeObserver for fluid D3 SVG layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.max(320, Math.floor(el.clientWidth));
      setChartWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render D3 scales, axes, outdoor bars, reduction area, baseline & mitigated lines
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || trendData.length === 0) return;

    const height = 280;
    const margin = { top: 20, right: 20, bottom: 36, left: 48 };
    const innerWidth = Math.max(200, chartWidth - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${chartWidth} ${height}`)
      .attr('width', chartWidth)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(trendData.map((d) => d.dayLabel))
      .range([0, innerWidth])
      .padding(0.32);

    const maxVal = Math.max(
      WHO_24H_PM25_GUIDELINE * 2,
      d3.max(trendData, (d) =>
        Math.max(d.outdoorPm25, d.baselineIndoorPm25),
      ) ?? 60,
    );

    const y = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxVal * 1.12)])
      .nice()
      .range([innerHeight, 0]);

    // Subtle horizontal gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => ''),
      )
      .call((grid) => {
        grid.select('.domain').remove();
        grid
          .selectAll('line')
          .attr('stroke', '#E2E8F0')
          .attr('stroke-dasharray', '2,2');
      });

    // 1. Outdoor PM2.5 bars
    g.selectAll('.outdoor-bar')
      .data(trendData)
      .enter()
      .append('rect')
      .attr('class', 'outdoor-bar')
      .attr('x', (d) => x(d.dayLabel) ?? 0)
      .attr('y', (d) => y(d.outdoorPm25))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(0, innerHeight - y(d.outdoorPm25)))
      .attr('rx', 4)
      .attr('fill', '#CBD5E1')
      .attr('opacity', 0.72);

    const xCenter = (d: SevenDayTrendPoint) =>
      (x(d.dayLabel) ?? 0) + x.bandwidth() / 2;

    // 2. Shaded Exposure Avoided Area (between baseline indoor and mitigated indoor)
    const avoidedArea = d3
      .area<SevenDayTrendPoint>()
      .x(xCenter)
      .y0((d) => y(d.mitigatedIndoorPm25))
      .y1((d) => y(d.baselineIndoorPm25))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(trendData)
      .attr('fill', '#0369A1')
      .attr('opacity', 0.14)
      .attr('d', avoidedArea);

    // 3. WHO 24h Safe Target Reference Line (15 µg/m³)
    const whoY = y(WHO_24H_PM25_GUIDELINE);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', whoY)
      .attr('y2', whoY)
      .attr('stroke', '#15803D')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4');

    g.append('text')
      .attr('x', innerWidth - 4)
      .attr('y', Math.max(12, whoY - 6))
      .attr('text-anchor', 'end')
      .attr('fill', '#15803D')
      .attr('font-size', '11px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(`WHO 24h Target (${WHO_24H_PM25_GUIDELINE} µg/m³)`);

    // 4. Baseline Indoor Exposure Line (without chosen habits)
    const baselineLine = d3
      .line<SevenDayTrendPoint>()
      .x(xCenter)
      .y((d) => y(d.baselineIndoorPm25))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('d', baselineLine);

    // 5. Mitigated Indoor Exposure Line (with chosen habits)
    const mitigatedLine = d3
      .line<SevenDayTrendPoint>()
      .x(xCenter)
      .y((d) => y(d.mitigatedIndoorPm25))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#0369A1')
      .attr('stroke-width', 2.75)
      .attr('d', mitigatedLine);

    // Subtle active-day highlight column (behind data series)
    g.insert('rect', ':first-child')
      .attr('class', 'active-day-highlight')
      .attr('y', 0)
      .attr('height', innerHeight)
      .attr('rx', 6)
      .attr('fill', '#EFF6FF')
      .attr('opacity', 0);

    // Data point markers on Mitigated Line
    g.selectAll('.mitigated-dot')
      .data(trendData)
      .enter()
      .append('circle')
      .attr('class', 'mitigated-dot')
      .attr('cx', xCenter)
      .attr('cy', (d) => y(d.mitigatedIndoorPm25))
      .attr('r', 4)
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#0369A1')
      .attr('stroke-width', 2.5);

    // Baseline dots
    g.selectAll('.baseline-dot')
      .data(trendData)
      .enter()
      .append('circle')
      .attr('class', 'baseline-dot')
      .attr('cx', xCenter)
      .attr('cy', (d) => y(d.baselineIndoorPm25))
      .attr('r', 3)
      .attr('fill', '#475569');

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((axis) => {
        axis.select('.domain').attr('stroke', '#CBD5E1');
        axis.selectAll('line').remove();
        axis
          .selectAll('text')
          .attr('fill', '#475569')
          .attr('font-size', '11px')
          .attr('font-family', 'JetBrains Mono, monospace');
      });

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('line').remove();
        axis
          .selectAll('text')
          .attr('fill', '#475569')
          .attr('font-size', '11px')
          .attr('font-family', 'JetBrains Mono, monospace');
      });

    // Y-axis unit label
    g.append('text')
      .attr('x', -margin.left + 4)
      .attr('y', -6)
      .attr('fill', '#64748B')
      .attr('font-size', '11px')
      .attr('font-family', 'DM Sans, sans-serif')
      .text('µg/m³ PM2.5');

    // Interactive invisible hover / focus columns
    const colWidth = innerWidth / trendData.length;
    g.selectAll('.hover-col')
      .data(trendData)
      .enter()
      .append('rect')
      .attr('class', 'hover-col')
      .attr('x', (_d, idx) => idx * colWidth)
      .attr('y', 0)
      .attr('width', colWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr(
        'aria-label',
        (d) =>
          `${d.dayLabel}: Outdoor ${d.outdoorPm25} micrograms per cubic meter, Baseline indoor ${d.baselineIndoorPm25}, With chosen habits ${d.mitigatedIndoorPm25}`,
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        const idx = trendData.indexOf(d);
        setActiveIndex(idx);
      })
      .on('focus', (_event, d) => {
        const idx = trendData.indexOf(d);
        setActiveIndex(idx);
      })
      .on('blur', () => setActiveIndex(null))
      .on('mouseleave', () => setActiveIndex(null));
  }, [chartWidth, trendData]);

  // Update active point & column highlight without tearing down SVG DOM (preserves keyboard focus)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || trendData.length === 0) return;
    const svg = d3.select(svgEl);

    svg
      .selectAll<SVGCircleElement, SevenDayTrendPoint>('.mitigated-dot')
      .attr('r', (_d, idx) => (activeIndex === idx ? 6 : 4));

    svg
      .selectAll<SVGCircleElement, SevenDayTrendPoint>('.baseline-dot')
      .attr('r', (_d, idx) => (activeIndex === idx ? 4.5 : 3));

    const margin = { left: 48, right: 20 };
    const innerWidth = Math.max(200, chartWidth - margin.left - margin.right);
    const colWidth = innerWidth / trendData.length;
    const highlight = svg.select<SVGRectElement>('.active-day-highlight');
    if (activeIndex !== null && activeIndex >= 0 && activeIndex < trendData.length) {
      highlight
        .attr('x', activeIndex * colWidth)
        .attr('width', colWidth)
        .attr('opacity', 0.9);
    } else {
      highlight.attr('opacity', 0);
    }
  }, [activeIndex, chartWidth, trendData]);

  const focusedPoint =
    activeIndex !== null
      ? trendData[activeIndex]
      : trendData[trendData.length - 1] ?? null;

  return (
    <div className="pt-5 border-t border-[#E2E8F0] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#0F172A]">
            7-Day Air Quality vs. Chosen Mitigation Habits ({city})
          </h3>
          <p className="text-xs text-[#475569] mt-0.5">
            Compares real past-7-day outdoor PM2.5 against your baseline indoor air and projected exposure with {selectedActions.length} chosen habit(s)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          aria-expanded={showTable}
          className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors self-start whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0369A1]"
        >
          {showTable ? 'Hide Data Table' : 'View 7-Day Data Table'}
        </button>
      </div>

      {/* Legend (Clean typographic markers, zero pill boxes) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#334155]">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-3 h-3 rounded-xs bg-[#CBD5E1] inline-block"
          />
          <span>Outdoor PM2.5 (Actual)</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-4 border-t-2 border-dashed border-[#475569] inline-block"
          />
          <span>Baseline Indoor Exposure</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-4 border-t-[3px] border-[#0369A1] inline-block"
          />
          <span className="font-medium text-[#0369A1]">
            With Chosen Habits
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-4 border-t-2 border-dashed border-[#15803D] inline-block"
          />
          <span className="text-[#15803D]">WHO 24h Guideline</span>
        </span>
      </div>

      {trendData.length === 0 ? (
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#475569]">
          7-day historical air quality series is loading for {city}.
        </div>
      ) : (
        <>
          {/* Live Interactive Readout Bar */}
          {focusedPoint && (
            <div
              aria-live="polite"
              className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs"
            >
              <div>
                <div className="text-[#64748B]">
                  {activeIndex === null ? 'Latest Day' : 'Selected Day'}
                </div>
                <div className="font-semibold text-[#0F172A] mt-0.5 font-mono tabular-nums">
                  {focusedPoint.dayLabel} (AQI {focusedPoint.avgUsAqi})
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Outdoor PM2.5</div>
                <div className="font-semibold text-[#0F172A] mt-0.5 font-mono tabular-nums">
                  {focusedPoint.outdoorPm25} µg/m³
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Baseline Indoor</div>
                <div className="font-semibold text-[#475569] mt-0.5 font-mono tabular-nums">
                  {focusedPoint.baselineIndoorPm25} µg/m³
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">With Chosen Habits</div>
                <div className="font-semibold text-[#0369A1] mt-0.5 font-mono tabular-nums">
                  {focusedPoint.mitigatedIndoorPm25} µg/m³ (-{focusedPoint.reductionPct}%)
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Daily CO₂e Avoided</div>
                <div className="font-semibold text-[#15803D] mt-0.5 font-mono tabular-nums">
                  {focusedPoint.dailyCo2SavedKg} kg CO₂e
                </div>
              </div>
            </div>
          )}

          {/* D3 Responsive SVG Canvas */}
          <div ref={containerRef} className="w-full overflow-hidden">
            <svg
              ref={svgRef}
              role="img"
              aria-label={`D3 7-day trend chart comparing outdoor PM2.5 against baseline indoor air and mitigated indoor air with ${selectedActions.length} chosen habits in ${city}.`}
              className="w-full h-auto block"
            />
          </div>

          {/* Accessible Tabular Summary */}
          {showTable && (
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#334155]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Avg US AQI
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Outdoor PM2.5
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Baseline Indoor
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      With Habits
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Exposure Cut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {trendData.map((row) => (
                    <tr key={row.date} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-3 font-mono tabular-nums text-[#0F172A]">
                        {row.dayLabel} ({row.date})
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#334155]">
                        {row.avgUsAqi}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#334155]">
                        {row.outdoorPm25} µg/m³
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#475569]">
                        {row.baselineIndoorPm25} µg/m³
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right font-semibold text-[#0369A1]">
                        {row.mitigatedIndoorPm25} µg/m³
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-right text-[#15803D]">
                        -{row.reductionPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
