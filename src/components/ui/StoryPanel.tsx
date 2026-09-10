"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import { BODIES, type Body, type BodyId, moonsOf, swatchFor } from "@/data/bodies";

interface Props {
  body: Body;
  compact?: boolean;
  onExplore?: () => void;
  onClose?: () => void;
  /** Called when a moon (or a moon's planet) is picked from the row of chips. */
  onSelect?: (id: BodyId) => void;
}

const shortName = (name: string) => name.replace(/^The /, "");

/** Only worlds that could have moons get the row; the Sun, belt and comet do not. */
const HAS_MOON_ROW = new Set(["rocky", "venus", "earth", "gas", "ice", "moon", "io", "titan"]);

function MoonChip({ body, onSelect }: { body: Body; onSelect?: (id: BodyId) => void }) {
  return (
    <button type="button" className="moon-chip" onClick={() => onSelect?.(body.id)} disabled={!onSelect}>
      <span className="swatch swatch--small" style={{ background: swatchFor(body) }} aria-hidden="true" />
      {shortName(body.name)}
    </button>
  );
}

function MoonRow({ body, onSelect }: { body: Body; onSelect?: (id: BodyId) => void }) {
  if (!HAS_MOON_ROW.has(body.family)) return null;
  if (body.parent) {
    return (
      <div className="moon-row">
        <span className="moon-row-label">Orbits</span>
        <MoonChip body={BODIES[body.parent]} onSelect={onSelect} />
      </div>
    );
  }
  const moons = moonsOf(body.id);
  return (
    <div className="moon-row">
      <span className="moon-row-label">Moons</span>
      {moons.length === 0 ? (
        <span className="moon-row-none">None at all</span>
      ) : (
        moons.map((moon) => <MoonChip key={moon.id} body={moon} onSelect={onSelect} />)
      )}
    </div>
  );
}

export function StoryPanel({ body, compact = false, onExplore, onClose, onSelect }: Props) {
  return (
    <article className={compact ? "panel panel--compact" : "panel"} aria-label={body.name}>
      <div className="panel-head">
        <div>
          <p className="panel-epithet">{body.epithet}</p>
          <h2 className="panel-title">{body.name}</h2>
        </div>
        {onClose && (
          <button type="button" className="pill pill-round pill-ghost" onClick={onClose} aria-label="Return to the overview">
            <X size={18} weight="light" />
          </button>
        )}
      </div>
      <p className="panel-story">{body.story}</p>
      <dl className="stats">
        {body.stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="wonder">{body.wonder}</p>
      <MoonRow body={body} onSelect={onSelect} />
      {onExplore && (
        <button type="button" className="pill" onClick={onExplore}>
          Explore {body.name === "The Sun" ? "the Sun" : body.name === "The asteroid belt" ? "the belt" : body.name}
          <span className="pill-icon">
            <ArrowRight size={14} weight="light" />
          </span>
        </button>
      )}
    </article>
  );
}
