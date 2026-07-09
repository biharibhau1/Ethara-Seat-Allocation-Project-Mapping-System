import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

const FLOORS = [1, 2, 3, 4, 5];
const ZONES = "ABCDEFGHIJ".split("").map((c) => `Zone-${c}`);

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

const PAGE_SIZE = 100;

export default function Seats() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [floor, setFloor] = useState(1);
  const [zone, setZone] = useState("Zone-A");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // A status filter (e.g. arriving from a dashboard stat card) searches
  // across every floor/zone instead of the single-zone grid, since counts
  // can run into the hundreds or thousands.
  const crossFloorMode = status !== "";

  const loadGrid = () => {
    setLoading(true);
    api
      .listSeats({ floor, zone, limit: 200 })
      .then(setSeats)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  };

  const loadFiltered = (offset = 0, append = false) => {
    setLoading(true);
    api
      .listSeats({ status, limit: PAGE_SIZE, offset })
      .then((data) => {
        setSeats((prev) => (append ? [...prev, ...data] : data));
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
      loadGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, floor, zone]);

  const applyStatus = (next) => {
    setStatus(next);
    setSearchParams(next ? { status: next } : {});
  };

  const counts = seats.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-ink">Floor Map</h1>
        <p className="text-muted text-sm mt-1">
          {crossFloorMode
            ? "Seats matching your filter, across every floor."
            : "Every seat, by floor and zone. Hover a seat for details."}
        </p>
      </header>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        {!crossFloorMode && (
          <>
            <div className="flex gap-1.5">
              {FLOORS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFloor(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                    floor === f
                      ? "bg-brand text-white border-brand"
                      : "border-line text-muted hover:bg-canvas"
                  }`}
                >
                  Floor {f}
                </button>
              ))}
            </div>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="border border-line rounded-md px-3 py-1.5 text-sm bg-surface"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </>
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
        <div className="flex gap-4 mb-5 text-xs">
          {Object.entries(statusColor).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border ${cls}`} />
              <span className="text-muted capitalize">
                {s} ({counts[s] || 0})
              </span>
            </div>
          ))}
        </div>
      )}

      {loading && seats.length === 0 ? (
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
          {seats.map((s) => (
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
          {seats.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No seats match this filter.</div>
          )}
          {hasMore && (
            <div className="px-4 py-3">
              <button
                onClick={() => loadFiltered(seats.length, true)}
                disabled={loading}
                className="text-sm px-3 py-1.5 rounded-md border border-line text-muted hover:bg-canvas"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-lg p-5">
          <div className="grid grid-cols-11 sm:grid-cols-[repeat(14,minmax(0,1fr))] md:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
            {seats.map((s) => (
              <div
                key={s.id}
                title={`${s.seat_number} · ${s.bay} · ${s.status}`}
                className={`aspect-square rounded-[4px] border flex items-center justify-center text-[9px] font-mono cursor-default ${
                  statusColor[s.status]
                }`}
              >
                {s.seat_number.split("-")[1]?.slice(-2) || ""}
              </div>
            ))}
          </div>
        </div>
      )}
      {message && <div className="text-sm text-maintenance mt-4">{message}</div>}
    </div>
  );
}