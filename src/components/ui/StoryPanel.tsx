"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import type { Body } from "@/data/bodies";

interface Props {
  body: Body;
  compact?: boolean;
  onExplore?: () => void;
  onClose?: () => void;
}

export function StoryPanel({ body, compact = false, onExplore, onClose }: Props) {
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
