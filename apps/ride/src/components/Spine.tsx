export interface SpineStop {
  id: string;
  name: string;
  meta?: string;
  role: 'origin' | 'destination' | 'via';
  active?: boolean;
}

/**
 * The route, drawn as a line with named nodes.
 *
 * This is what stands in for a map, and on a campus it is the more honest
 * picture: riders board at a fixed list of stops that already have names
 * everybody uses, so "Main Gate -> Balme Library" tells them more than a pin
 * on a road would. It also degrades well - there is no tile to fail to load
 * and nothing to pay per view.
 */
export function Spine({ stops, seatsTaken, capacity = 4 }: {
  stops: SpineStop[];
  seatsTaken?: number;
  capacity?: number;
}) {
  const activeCount = stops.filter((s) => s.active).length;
  // The filled rail spans from the first node to the last active one.
  const progress = stops.length > 1 ? Math.max(0, activeCount - 1) / (stops.length - 1) : 0;

  return (
    <div className="spine">
      <div
        className="spine__progress"
        style={{ bottom: 10, transform: `scaleY(${progress})` }}
        aria-hidden="true"
      />
      {stops.map((stop) => (
        <div key={stop.id} className="spine__stop" data-role={stop.role} data-active={stop.active ? 'true' : 'false'}>
          <span className="spine__node" aria-hidden="true" />
          <div className="row row--between">
            <div className="grow">
              <div className="spine__name">{stop.name}</div>
              {stop.meta && <div className="spine__meta">{stop.meta}</div>}
            </div>
            {stop.role === 'origin' && seatsTaken != null && (
              <Pips taken={seatsTaken} capacity={capacity} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Seats as a picture of the car rather than a number to decode. */
export function Pips({ taken, capacity = 4 }: { taken: number; capacity?: number }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="pips" role="img" aria-label={`${taken} of ${capacity} seats taken`}>
        {Array.from({ length: capacity }, (_, i) => (
          <span key={i} className="pip" data-taken={i < taken ? 'true' : 'false'} />
        ))}
      </span>
      <span className="data spine__meta">{taken}/{capacity}</span>
    </span>
  );
}
