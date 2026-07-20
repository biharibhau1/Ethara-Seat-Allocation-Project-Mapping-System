import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

const FLOORS = [1, 2, 3, 4, 5];
const ZONES = "ABCDEFGHIJ".split("").map((c) => `Zone-${c}`);
const ROW_1 = ZONES.slice(0, 5); // Zone A-E
const ROW_2 = ZONES.slice(5, 10); // Zone F-J

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
];

const statusColor = {
  available: "bg-available-bg border-available/40 text-available",
  occupied: "bg-occupied-bg border-occupied/40 text-occupied",
  reserved: "bg-reserved-bg border-reserved/40 text-reserved",
  maintenance: "bg-maintenance-bg border-maintenance/40 text-maintenance",
};

const barColor = {
  available: "bg-available",
  occupied: "bg-occupied",
  reserved: "bg-reserved",
  maintenance: "bg-maintenance",
};

const PAGE_SIZE = 100;
const FLOOR_SEAT_LIMIT = 1200; // covers 1100 seats/floor with headroom

// Room labels for the leadership floor's special zones (informational only —
// actual room type comes from each seat's `bay` field, grouped below).
const FLOOR1_ZONE_LABEL = {
  "Zone-A": "R&D Area",
  "Zone-B": "Growth Area",
};

function groupByZoneThenBay(seats) {
  const byZone = {};
  for (const s of seats) {
    if (!byZone[s.zone]) byZone[s.zone] = {};
    if (!byZone[s.zone][s.bay]) byZone[s.zone][s.bay] = [];
    byZone[s.zone][s.bay].push(s);
  }
  return byZone;
}

function statusCounts(seatList) {
  const counts = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
  for (const s of seatList) counts[s.status] = (counts[s.status] || 0) + 1;
  return counts;
}

export default function Seats() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [floor, setFloor] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [floorSeats, setFloorSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [listSeats, setListSeats] = useState([]);
  const [selectedPod, setSelectedPod] = useState(null); // { zone, bay, seats }

  const crossFloorMode = status !== "";

  const loadFloor = () => {
    setLoading(true);
    setSelectedPod(null);
    api
      .listSeats({ floor, limit: FLOOR_SEAT_LIMIT })
      .then(setFloorSeats)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  };

  const loadFiltered = (offset = 0, append = false) => {
    setLoading(true);
    api
      .listSeats({ status, limit: PAGE_SIZE, offset })
      .then((data) => {
        setListSeats((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const urlStatus = searchParams.get("status") || "";
    setStatus(urlStatus);
    if (urlStatus) {
      loadFiltered(0, false);
    } else {
      loadFloor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, floor]);

  const applyStatus = (next) => {
    setStatus(next);
    setSearchParams(next ? { status: next } : {});
  };

  const byZone = useMemo(() => groupByZoneThenBay(floorSeats), [floorSeats]);

  const zoneSummary = (zoneName) => {
    const bays = byZone[zoneName] || {};
    const all = Object.values(bays).flat();
    return { total: all.length, counts: statusCounts(all) };
  };

  const renderZoneRoom = (zoneName) => {
    const bays = byZone[zoneName] || {};
    const bayNames = Object.keys(bays).sort();
    const { total, counts } = zoneSummary(zoneName);
    const label = FLOOR1_ZONE_LABEL[zoneName];

    return (
      <div
        key={zoneName}
        className="bg-canvas border border-line rounded-md p-2.5 flex flex-col"
      >
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="font-mono text-xs font-semibold text-ink">{zoneName}</span>
            {label && (
              <span className="ml-1.5 text-[10px] text-brand font-medium">{label}</span>
            )}
          </div>
          <span className="text-[10px] text-muted font-mono">
            {counts.occupied}/{total}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {bayNames.map((bayName) => {
            const bayShoots = bays[bayName];
            const c = statusCounts(bayShoots);
            const n = bayShoots.length;
            const isSelected =
              selectedPod && selectedPod.zone === zoneName && selectedPod.bay === bayName;
            return (
              <button
                key={bayName}
                onClick={() => setSelectedPod({ zone: zoneName, bay: bayName, seats: bayShoots })}
                title={`${bayName} · ${n} seats`}
                className={`h-6 rounded-[3px] overflow-hidden flex border ${isSelected ? "border-brand ring-2 ring-brand/30" : "border-line/60"
                  }`}
              >
                {["occupied", "available", "reserved", "maintenance"].map((st) =>
                  c[st] > 0 ? (
                    <span
                      key={st}
                      className={barColor[st]}
                      style={{ width: `${(c[st] / n) * 100}%` }}
                    />
                  ) : null
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-ink">Floor Map</h1>
        <p className="text-muted text-sm mt-1">
          {crossFloorMode
            ? "Seats matching your filter, across every floor."
            : "The whole floor at once. Each block is a bay — click one to see its seats."}
        </p>
      </header>

      <div className="flex flex-wrap gap-4 mb-5 items-center">
        {!crossFloorMode && (
          <div className="flex gap-1.5">
            {FLOORS.map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${floor === f
                    ? "bg-brand text-white border-brand"
                    : "border-line text-muted hover:bg-canvas"
                  }`}
              >
                Floor {f}
                {f === 1 && <span className="ml-1 text-[10px] opacity-70">★</span>}
              </button>
            ))}
          </div>
        )}
        <select
          value={status}
          onChange={(e) => applyStatus(e.target.value)}
          className="border border-line rounded-md px-3 py-1.5 text-sm bg-surface"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {!crossFloorMode && (
        <div className="flex gap-4 mb-4 text-xs">
          {Object.entries(barColor).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-2.5 rounded-sm inline-block ${cls}`} />
              <span className="text-muted capitalize">{s}</span>
            </div>
          ))}
        </div>
      )}

      {loading && floorSeats.length === 0 && listSeats.length === 0 ? (
        <div className="text-sm text-muted">Loading seats…</div>
      ) : crossFloorMode ? (
        <div className="bg-surface border border-line rounded-lg divide-y divide-line">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-muted">
            <span>Seat</span>
            <span>Floor</span>
            <span>Zone</span>
            <span>Bay</span>
            <span>Status</span>
          </div>
          {listSeats.map((s) => (
            <div key={s.id} className="grid grid-cols-5 gap-2 px-4 py-2 text-sm">
              <span className="font-mono">{s.seat_number}</span>
              <span>{s.floor}</span>
              <span>{s.zone}</span>
              <span>{s.bay}</span>
              <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-xs border ${statusColor[s.status]}`}>
                {s.status}
              </span>
            </div>
          ))}
          {listSeats.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No seats match this filter.</div>
          )}
          {hasMore && (
            <div className="px-4 py-3">
              <button
                onClick={() => loadFiltered(listSeats.length, true)}
                disabled={loading}
                className="text-sm px-3 py-1.5 rounded-md border border-line text-muted hover:bg-canvas"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Floor plan: blueprint shell, 5+5 zones with a corridor between */}
          <div className="relative bg-surface border-2 border-ink/15 rounded-lg p-5 overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 23px, #1F2421 23px, #1F2421 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, #1F2421 23px, #1F2421 24px)",
              }}
            />
            <div className="relative grid grid-cols-5 gap-3">
              {ROW_1.map(renderZoneRoom)}
            </div>

            <div className="relative flex items-center gap-3 my-3">
              <div className="flex-1 border-t border-dashed border-line" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                Corridor
              </span>
              <div className="flex-1 border-t border-dashed border-line" />
            </div>

            <div className="relative grid grid-cols-5 gap-3">
              {ROW_2.map(renderZoneRoom)}
            </div>
          </div>

          {/* Selected bay detail */}
          {selectedPod && (
            <div className="mt-4 bg-surface border border-line rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">
                  {selectedPod.zone} · {selectedPod.bay}{" "}
                  <span className="text-muted font-normal">({selectedPod.seats.length} seats)</span>
                </div>
                <button
                  onClick={() => setSelectedPod(null)}
                  className="text-xs text-muted hover:text-ink"
                >
                  Close ✕
                </button>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {selectedPod.seats.map((s) => (
                  <div
                    key={s.id}
                    title={`${s.seat_number} · ${s.status}`}
                    className={`aspect-square rounded-[4px] border flex items-center justify-center text-[9px] font-mono ${statusColor[s.status]}`}
                  >
                    {s.seat_number.split("-").pop()?.slice(-2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {message && <div className="text-sm text-maintenance mt-4">{message}</div>}
    </div>
  );
}