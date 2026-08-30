import { useState } from "react";
import type { VoteProjection } from "../lib/types";
import { formatVotes, seriesColors } from "../lib/format";

const SIZE = 240;
const CENTER = SIZE / 2;
const R_OUTER = 108;
const R_INNER = 66;
/** Regra do skill: pizza é leitura de relance, no máximo 6 fatias. */
const MAX_SLICES = 6;

type Slice = { label: string; votes: number; color: string; share: number };

function polar(radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function donutPath(start: number, end: number) {
  // Um anel completo degenera num arco de comprimento zero; sobra um fio de
  // superfície, invisível na prática.
  const sweep = Math.min(end - start, 359.99);
  const stop = start + sweep;
  const large = sweep > 180 ? 1 : 0;
  const a = polar(R_OUTER, start);
  const b = polar(R_OUTER, stop);
  const c = polar(R_INNER, stop);
  const d = polar(R_INNER, start);
  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function buildSlices(projections: VoteProjection[]): { slices: Slice[]; total: number } {
  const sorted = [...projections].sort((a, b) => b.projected_votes - a.projected_votes);
  const total = sorted.reduce((sum, p) => sum + p.projected_votes, 0);
  if (!total) return { slices: [], total: 0 };

  // Além do teto de fatias, o excedente vira "Outras regiões" em vez de gerar
  // cores novas — hue inventada não sobrevive a daltonismo.
  const head = sorted.slice(0, MAX_SLICES - 1);
  const tail = sorted.slice(MAX_SLICES - 1);
  const entries =
    tail.length > 1
      ? [
          ...head.map((p) => ({ label: p.region, votes: p.projected_votes })),
          { label: "Outras regiões", votes: tail.reduce((s, p) => s + p.projected_votes, 0) },
        ]
      : sorted.map((p) => ({ label: p.region, votes: p.projected_votes }));

  return {
    total,
    slices: entries.map((entry, i) => ({
      ...entry,
      color: seriesColors[i % seriesColors.length],
      share: entry.votes / total,
    })),
  };
}

export function VotePieChart({ projections }: { projections: VoteProjection[] }) {
  const [active, setActive] = useState<number | null>(null);
  const { slices, total } = buildSlices(projections);

  if (!slices.length) {
    return (
      <div className="chart-empty">
        <p>Nenhuma projeção de votos cadastrada.</p>
        <p className="chart-empty-hint">
          Some as regiões do estado com a expectativa de votos em cada uma para ver a distribuição
          aqui.
        </p>
      </div>
    );
  }

  let cursor = 0;
  const arcs = slices.map((slice) => {
    const start = cursor;
    const sweep = slice.share * 360;
    cursor += sweep;
    return { ...slice, start, end: start + sweep };
  });

  return (
    <div className="chart-block">
      <div className="chart-figure">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut" role="img"
          aria-label={`Projeção de ${formatVotes(total)} votos distribuídos por região`}>
          {arcs.map((arc, i) => (
            <path
              key={arc.label}
              d={donutPath(arc.start, arc.end)}
              fill={arc.color}
              /* O anel de superfície é o separador — nada de borda escura. */
              stroke="#fff"
              strokeWidth={2}
              opacity={active === null || active === i ? 1 : 0.35}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${arc.label}: ${formatVotes(arc.votes)} votos (${Math.round(arc.share * 100)}%)`}</title>
            </path>
          ))}
          <text className="donut-total" x={CENTER} y={CENTER - 4} textAnchor="middle">
            {formatVotes(active === null ? total : arcs[active].votes)}
          </text>
          <text className="donut-caption" x={CENTER} y={CENTER + 14} textAnchor="middle">
            {active === null ? "votos projetados" : arcs[active].label}
          </text>
        </svg>

        <ul className="chart-legend">
          {arcs.map((arc, i) => (
            <li
              key={arc.label}
              className={active === null || active === i ? "" : "dim"}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <i style={{ background: arc.color }} />
              <span className="legend-label">{arc.label}</span>
              <b>{formatVotes(arc.votes)}</b>
              <span className="legend-share">{Math.round(arc.share * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Três tons da paleta ficam abaixo de 3:1 na superfície branca, então a
          tabela não é opcional: é o caminho sem depender de cor. */}
      <details className="chart-table">
        <summary>Ver como tabela</summary>
        <table>
          <thead>
            <tr>
              <th>Região</th>
              <th>Votos projetados</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            {arcs.map((arc) => (
              <tr key={arc.label}>
                <td>{arc.label}</td>
                <td>{formatVotes(arc.votes)}</td>
                <td>{Math.round(arc.share * 100)}%</td>
              </tr>
            ))}
            <tr className="table-total">
              <td>Total</td>
              <td>{formatVotes(total)}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  );
}
