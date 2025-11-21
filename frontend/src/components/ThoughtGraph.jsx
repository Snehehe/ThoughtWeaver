import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function colorFor(id) {
  const colors = ["#38bdf8", "#a855f7", "#22c55e", "#f97316", "#e11d48"];
  let h = 0;
  for (let c of id) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// IMPORTANT: this component expects to live at:
// frontend/src/components/ThoughtGraph.jsx
export default function ThoughtGraph() {
  const svgRef = useRef(null);

  const nodesRef = useRef([]);
  const linksRef = useRef([]);

  const simRef = useRef(null);
  const groupRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [modalNode, setModalNode] = useState(null);
  const [modalNeighbors, setModalNeighbors] = useState([]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState("dark");
  const [status, setStatus] = useState("");

  // keep latest theme available to renderGraph without stale closures
  const themeRef = useRef("dark");

  const showStatus = (txt) => {
    setStatus(txt);
    setTimeout(() => setStatus(""), 2200);
  };

  // ---------- INITIAL MOUNT ----------
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    groupRef.current = g;

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (e) => {
          g.attr("transform", e.transform);
        })
    );

    const sim = d3
      .forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    simRef.current = sim;

    nodesRef.current = [];
    linksRef.current = [];

    renderGraph();

    return () => sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep themeRef in sync + re-render graph on theme change
  useEffect(() => {
    themeRef.current = theme;
    renderGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ---------- CORE RENDER ----------
  const renderGraph = () => {
    const g = groupRef.current;
    const sim = simRef.current;
    if (!g || !sim) return;

    const nodes = nodesRef.current;
    const links = linksRef.current;

    g.selectAll("*").remove();

    // LINKS
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", (d) => d.weight || 1)
      .attr("stroke-opacity", 0.9);

    // NODES
    g.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => colorFor(d.id))
      .style("cursor", "pointer")
      .on("click", (_, d) => openSidebar(d))
      .on("dblclick", (_, d) => openModal(d))
      .transition()
      .duration(400)
      .ease(d3.easeElasticOut)
      .attr("r", 18);

    // LABELS (brighter + theme-aware via themeRef)
    const isDark = themeRef.current === "dark";
    const labelColor = isDark ? "#f9fafb" : "#0f172a";

    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.id)
      .attr("font-size", 12)
      .attr("dy", 32)
      .attr("text-anchor", "middle")
      .attr("fill", labelColor);

    // DRAG
    const drag = d3
      .drag()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    g.selectAll("circle").call(drag);

    // UPDATE FORCES
    sim.nodes(nodes);
    sim.force("link").links(links);
    sim.alpha(1).restart();

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      g.selectAll("circle")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);

      label
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y);
    });
  };

  // ---------- AI LINKING (Render backend) ----------
  const linkNewNodeWithAI = async (newNode) => {
    const existing = nodesRef.current;
    const links = linksRef.current;

    if (existing.length === 0) return;

    let scored = [];

    try {
      const res = await fetch(
        "https://thoughtweaver.onrender.com/api/embeddings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newNode: newNode.id,
            existing: existing.map((n) => n.id),
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Embedding API error");
      }

      const data = await res.json();
      if (Array.isArray(data.scores)) {
        scored = data.scores
          .map((s) => {
            const node = existing.find((n) => n.id === s.id);
            if (!node) return null;
            return {
              node,
              score: typeof s.similarity === "number" ? s.similarity : 0,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);
      }
    } catch (e) {
      console.error("Embedding API failed", e);
      showStatus("Embedding API failed");
      return;
    }

    const threshold = 0.35;
    const top = scored.filter((s) => s.score >= threshold).slice(0, 2);

    top.forEach((s) => {
      links.push({
        source: s.node,
        target: newNode,
        weight: 1 + s.score * 4,
      });
    });

    linksRef.current = links;
  };

  // ---------- ADD THOUGHT ----------
  const addThought = async () => {
    const text = input.trim();
    if (!text) return;

    const normalized = text.toLowerCase();
    const nodes = nodesRef.current;

    // better duplicate detection (case-insensitive, trimmed)
    if (nodes.some((n) => n.id.toLowerCase() === normalized)) {
      showStatus("Already exists");
      return;
    }

    const newNode = { id: text };
    nodes.push(newNode);
    nodesRef.current = nodes;

    if (nodes.length > 1) {
      await linkNewNodeWithAI(newNode);
    }

    setInput("");
    showStatus("Thought added");
    renderGraph();
  };

  // ---------- SIDEBAR (click) ----------
  const openSidebar = (node) => {
    const degree = linksRef.current.filter(
      (l) => l.source.id === node.id || l.target.id === node.id
    ).length;

    setSelectedNode({ ...node, degree });
  };

  // ---------- MODAL (double-click) ----------
  const openModal = (node) => {
    const neighbors = linksRef.current
      .filter((l) => l.source.id === node.id || l.target.id === node.id)
      .map((l) => (l.source.id === node.id ? l.target.id : l.source.id));

    const uniqueNeighbors = Array.from(new Set(neighbors));

    setModalNode(node);
    setModalNeighbors(uniqueNeighbors);
  };

  const closeModal = () => {
    setModalNode(null);
    setModalNeighbors([]);
  };

  // ---------- SAVE / LOAD ----------
  const saveGraph = () => {
    const nodes = nodesRef.current;
    const links = linksRef.current;

    const json = {
      nodes: nodes.map((n) => ({ id: n.id })),
      links: links.map((l) => ({
        sourceId: l.source.id,
        targetId: l.target.id,
        weight: l.weight,
      })),
    };

    localStorage.setItem("tw-graph-v2-ai", JSON.stringify(json));
    showStatus("Saved");
  };

  const loadGraph = () => {
    const raw = localStorage.getItem("tw-graph-v2-ai");
    if (!raw) {
      showStatus("No saved graph");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const idMap = {};
      (parsed.nodes || []).forEach((n) => {
        idMap[n.id] = { id: n.id };
      });

      nodesRef.current = Object.values(idMap);

      linksRef.current = (parsed.links || [])
        .map((l) => {
          const s = idMap[l.sourceId];
          const t = idMap[l.targetId];
          if (!s || !t) return null;
          return { source: s, target: t, weight: l.weight || 1 };
        })
        .filter(Boolean);

      setSelectedNode(null);
      setModalNode(null);
      showStatus("Loaded");
      renderGraph();
    } catch (e) {
      console.error(e);
      showStatus("Failed to load");
    }
  };

  // ---------- THEME ----------
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`w-full h-screen relative ${
        isDark ? "bg-slate-950" : "bg-slate-100"
      }`}
    >
      {isDark && <div className="tw-particles" />}

      {/* Controls */}
      <div
        className={`absolute top-4 left-4 z-20 p-4 rounded-xl backdrop-blur-md w-72 border space-y-3 ${
          isDark
            ? "bg-slate-900/80 border-slate-700 text-slate-50"
            : "bg-white/80 border-slate-300 text-slate-900"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="font-semibold text-sm">ThoughtWeaver</div>
          <button
            className={`text-xs px-2 py-1 rounded-full border ${
              isDark
                ? "border-slate-500 text-slate-100"
                : "border-slate-400 text-slate-800"
            }`}
            onClick={toggleTheme}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addThought()}
          placeholder="New thought..."
          className={`w-full px-3 py-2 rounded text-sm outline-none border ${
            isDark
              ? "bg-slate-900 border-slate-700 text-slate-100"
              : "bg-slate-50 border-slate-300 text-slate-900"
          }`}
        />

        <div className="flex gap-2 text-xs">
          <button
            onClick={addThought}
            className="px-3 py-1.5 rounded bg-sky-500 text-black font-semibold"
          >
            Add
          </button>
          <button
            onClick={saveGraph}
            className="px-3 py-1.5 rounded font-semibold bg-emerald-500 text-black"
          >
            Save
          </button>
          <button
            onClick={loadGraph}
            className={`px-3 py-1.5 rounded border font-semibold ${
              isDark
                ? "bg-slate-800 border-slate-600 text-slate-100"
                : "bg-slate-50 border-slate-300 text-slate-900"
            }`}
          >
            Load
          </button>
        </div>

        {status && (
          <div
            className={`text-xs font-semibold ${
              isDark ? "text-emerald-300" : "text-emerald-700"
            }`}
          >
            {status}
          </div>
        )}

        <div
          className={`text-[11px] mt-1 ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {"drag nodes -> explore"}
          <br />
          {"scroll -> zoom"}
          <br />
          click a node for details, double-click for popup info
        </div>
      </div>

      {/* Sidebar (click) */}
      {selectedNode && (
        <div
          className={`absolute top-4 right-4 z-20 w-64 p-4 rounded-xl backdrop-blur-md border space-y-3 ${
            isDark
              ? "bg-slate-900/80 border-slate-700 text-slate-50"
              : "bg-white/80 border-slate-300 text-slate-900"
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="font-semibold text-sm truncate">
              {selectedNode.id}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
          <div className="text-xs space-y-1">
            <div>
              <span className="font-semibold">Connections:</span>{" "}
              {selectedNode.degree}
            </div>
            <div>
              <span className="font-semibold">Type:</span> thought
            </div>
          </div>
        </div>
      )}

      {/* Modal (double-click) */}
      {modalNode && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <div
            className={`w-full max-w-md rounded-2xl p-5 border shadow-xl ${
              isDark
                ? "bg-slate-900 border-slate-700 text-slate-50"
                : "bg-white border-slate-300 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold text-sm">
                Thought details:{" "}
                <span className="font-bold">{modalNode.id}</span>
              </div>
              <button
                onClick={closeModal}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
            <div className="text-xs mb-3">
              <p>
                This thought is connected to{" "}
                <strong>{modalNeighbors.length}</strong> other node
                {modalNeighbors.length === 1 ? "" : "s"}.
              </p>
            </div>
            {modalNeighbors.length > 0 && (
              <div className="text-xs space-y-1 mb-3">
                <div className="font-semibold mb-1">Connected thoughts:</div>
                <ul className="list-disc list-inside space-y-1">
                  {modalNeighbors.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[11px] opacity-80">
              Double-clicking doesn&apos;t change the graph; it just lets you
              inspect how this thought fits into the network.
            </div>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}
