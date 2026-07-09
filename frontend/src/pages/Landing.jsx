import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./landing.css";

const TICKER_ITEMS = [
  "AUTO SEAT ALLOCATION",
  "FLOOR-WISE OCCUPANCY MAPS",
  "PROJECT-BASED SEATING",
  "SEARCH BY NAME, EMAIL, CODE",
  "AI QUERY ASSISTANT",
  "ADMIN ALLOCATE / RELEASE",
  "5 FLOORS · 10 ZONES",
];

// Animate a number counting up from 0 to target once data arrives.
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function Landing() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [floors, setFloors] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.summary(), api.floorUtilization()])
      .then(([s, f]) => {
        setStats(s);
        setFloors(f);
      })
      .catch((e) => setError(e.message));
  }, []);

  const employeeCount = useCountUp(stats?.total_employees);
  const seatCount = useCountUp(stats?.total_seats);
  const utilizationPct =
    stats && stats.total_seats
      ? Math.round((stats.occupied_seats / stats.total_seats) * 1000) / 10
      : null;
  const utilization = useCountUp(utilizationPct != null ? utilizationPct * 10 : null);

  // Ticker
  const tickerRef = useRef(null);
  useEffect(() => {
    if (!tickerRef.current) return;
    const full = [...TICKER_ITEMS, ...TICKER_ITEMS];
    tickerRef.current.innerHTML = full.map((t) => `<span>${t}</span>`).join("");
  }, []);

  // Blueprint connector SVG (draws lines from center to each HUD corner)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";

    function draw() {
      svg.innerHTML = "";
      const w = window.innerWidth,
        h = window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const cx = w / 2,
        cy = h / 2 + 40;

      const gridGroup = document.createElementNS(NS, "g");
      gridGroup.setAttribute("stroke", "#2E6DA4");
      gridGroup.setAttribute("stroke-opacity", "0.05");
      const step = 64;
      for (let x = 0; x < w; x += step) {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", x);
        l.setAttribute("y1", 0);
        l.setAttribute("x2", x);
        l.setAttribute("y2", h);
        gridGroup.appendChild(l);
      }
      for (let y = 0; y < h; y += step) {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", 0);
        l.setAttribute("y1", y);
        l.setAttribute("x2", w);
        l.setAttribute("y2", y);
        gridGroup.appendChild(l);
      }
      svg.appendChild(gridGroup);

      const targets = [
        [154, 190],
        [w - 154, 190],
        [154, h - 150],
        [w - 154, h - 150],
      ];
      targets.forEach(([tx, ty]) => {
        const path = document.createElementNS(NS, "path");
        const midX = (cx + tx) / 2,
          midY = (cy + ty) / 2 - 20;
        path.setAttribute("d", `M ${cx} ${cy} Q ${midX} ${midY} ${tx} ${ty}`);
        path.setAttribute("stroke", "#2E6DA4");
        path.setAttribute("stroke-opacity", "0.35");
        path.setAttribute("stroke-width", "1");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-dasharray", "4 5");
        svg.appendChild(path);

        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("cx", tx);
        dot.setAttribute("cy", ty);
        dot.setAttribute("r", "3");
        dot.setAttribute("fill", "#2E6DA4");
        dot.setAttribute("fill-opacity", "0.6");
        svg.appendChild(dot);
      });
    }
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  // Seat-grid canvas background. Cell mix reflects real occupied/available/
  // reserved ratio once stats load (falls back to a neutral mix before that).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, cols, rows;
    const cellSize = 22,
      gap = 6;
    let cells = [];
    let rafId, timeoutId;
    let cancelled = false;

    const occupiedRatio = stats ? stats.occupied_seats / stats.total_seats : 0.85;
    const reservedRatio = stats ? stats.reserved_seats / stats.total_seats : 0.02;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cols = Math.ceil(w / (cellSize + gap)) + 2;
      rows = Math.ceil(h / (cellSize + gap)) + 2;
      cells = new Array(cols * rows).fill(0).map(() => {
        const r = Math.random();
        if (r < reservedRatio) return 2; // amber = reserved
        if (r < reservedRatio + (1 - occupiedRatio)) return 1; // green = available
        return 0; // blueprint = occupied
      });
    }
    resize();
    window.addEventListener("resize", resize);

    function flicker() {
      for (let i = 0; i < 14; i++) {
        const idx = Math.floor(Math.random() * cells.length);
        const r = Math.random();
        cells[idx] = r < occupiedRatio ? 0 : r < occupiedRatio + 0.5 * (1 - occupiedRatio) ? 1 : 2;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      for (let ry = 0; ry < rows; ry++) {
        for (let cx2 = 0; cx2 < cols; cx2++) {
          const idx = ry * cols + cx2;
          const state = cells[idx];
          const x = cx2 * (cellSize + gap);
          const y = ry * (cellSize + gap);

          const dx = x - cx,
            dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const fade = Math.min(1, Math.max(0, (dist - 140) / 260));

          let color;
          if (state === 2) color = `rgba(255,169,77,${0.28 * fade})`;
          else if (state === 1) color = `rgba(74,222,128,${0.22 * fade})`;
          else color = `rgba(46,109,164,${0.07 * fade})`;

          ctx.fillStyle = color;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    function loop() {
      if (cancelled) return;
      flicker();
      draw();
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(loop, 140);
      });
    }
    loop();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [stats]);

  return (
    <div className="landing-page">
      <canvas className="seatgrid" ref={canvasRef}></canvas>
      <svg className="blueprint-svg" ref={svgRef}></svg>
      <div className="vignette"></div>

      <header>
        <div className="logo">
          <span className="dot"></span>SEATSYNC
        </div>
        <div className="nav-meta">
          FLOOR SYSTEM {error ? "OFFLINE" : "ONLINE"} · <span>{employeeCount.toLocaleString()}</span> EMPLOYEES TRACKED
          <br />
          ETHARA · SEAT &amp; PROJECT MAPPING
        </div>
      </header>

      <div className="hud hud-tl">
        <div className="label">TOTAL CAPACITY</div>
        <div className="value">
          {seatCount.toLocaleString()} <small>seats</small>
        </div>
        <div className="sub">
          <span className="swatch" style={{ background: "var(--blueprint)" }}></span> across 5 floors
        </div>
      </div>

      <div className="hud hud-tr">
        <div className="label">FLOORS MAPPED</div>
        <div className="value">{floors.length || "—"} / 5</div>
        <div className="sub">
          <span className="swatch" style={{ background: "var(--amber)" }}></span> live floor plans
        </div>
      </div>

      <div className="hud hud-bl">
        <div className="label">SEAT UTILIZATION</div>
        <div className="value">
          {utilizationPct != null ? (utilization / 10).toFixed(1) : "—"}
          <small>%</small>
        </div>
        <div className="sub">
          <span className="swatch" style={{ background: "var(--green)" }}></span> occupied of total
        </div>
      </div>

      <div className="hud hud-br">
        <div className="label">PENDING ALLOCATION</div>
        <div className="value">{stats?.new_joiners_pending_allocation ?? "—"}</div>
        <div className="sub">
          <span className="swatch" style={{ background: "var(--brass)" }}></span> new joiners waiting
        </div>
      </div>

      <main className="stage">
        <div className="eyebrow">ETHARA SEAT &amp; PROJECT MAPPING</div>
        <h1>
          See every seat, every floor,
          <br />
          across <span className="hl">{(stats?.total_employees ?? 5000).toLocaleString()} employees</span>.
        </h1>
        <p className="sub-text">
          Search where anyone sits, allocate new joiners automatically by project team,
          and track occupancy across every floor and zone — with a built-in assistant
          for quick seat and project questions.
        </p>

        <div className="badge-wrap">
          <div className="lanyard"></div>
          <div className="badge">
            <div className="badge-top">
              <div className="chip"></div>
              <div className="id">ID · ACCESS-01</div>
            </div>
            <div className="badge-title">ACCESS TERMINAL</div>
            <div className="badge-name">SeatSync Console</div>
            <button className="enter-btn" onClick={() => navigate("/dashboard")}>
              ENTER DASHBOARD
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <div className="badge-foot">
              <span className="status">{error ? "api unreachable" : "badge active"}</span>
              <span>tap to enter</span>
            </div>
          </div>
        </div>
      </main>

      <div className="ticker-wrap">
        <div className="ticker" ref={tickerRef}></div>
      </div>
    </div>
  );
}
