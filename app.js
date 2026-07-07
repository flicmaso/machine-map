const assets = [
  { id: "N-BL-01", name: "North Blower 01", room: "north", x: 8, y: 28, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.12, baseTemp: 132 },
  { id: "N-BL-02", name: "North Blower 02", room: "north", x: 35, y: 28, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.16, baseTemp: 142 },
  { id: "N-BL-03", name: "North Blower 03", room: "north", x: 62, y: 28, protocol: "IO-Link", sensor: "Banner QM30VT3", baseVib: 0.11, baseTemp: 128 },
  { id: "N-BL-04", name: "North Blower 04", room: "north", x: 20, y: 62, protocol: "OPC UA", sensor: "IFM VSE", baseVib: 0.21, baseTemp: 150 },
  { id: "N-BL-05", name: "North Blower 05", room: "north", x: 50, y: 62, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.31, baseTemp: 172 },
  { id: "N-RA-01", name: "Rotary Airlock 01", room: "north", x: 76, y: 62, protocol: "4-20 mA", sensor: "CTC/Wilcoxon", baseVib: 0.13, baseTemp: 136 },
  { id: "N-RA-02", name: "Rotary Airlock 02", room: "north", x: 76, y: 28, protocol: "4-20 mA", sensor: "CTC/Wilcoxon", baseVib: 0.18, baseTemp: 146 },
  { id: "S-CUT-01", name: "Cutter Blower 01", room: "south", x: 6, y: 25, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.09, baseTemp: 126 },
  { id: "S-CUT-02", name: "Cutter Blower 02", room: "south", x: 25, y: 25, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.15, baseTemp: 139 },
  { id: "S-CUT-03", name: "Cutter Blower 03", room: "south", x: 44, y: 25, protocol: "OPC UA", sensor: "IFM VSE", baseVib: 0.22, baseTemp: 152 },
  { id: "S-CUT-04", name: "Cutter Blower 04", room: "south", x: 63, y: 25, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.17, baseTemp: 143 },
  { id: "S-CUT-05", name: "Cutter Blower 05", room: "south", x: 82, y: 25, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.28, baseTemp: 164 },
  { id: "S-FORM", name: "Forming Blower", room: "south", x: 18, y: 62, protocol: "EtherNet/IP", sensor: "DXMR90 Gateway", baseVib: 0.12, baseTemp: 131 },
  { id: "S-SHEET", name: "Sheeter Blower", room: "south", x: 45, y: 62, protocol: "OPC UA", sensor: "IFM VSE", baseVib: 0.19, baseTemp: 148 },
  { id: "S-SHRED", name: "Shredder Blower", room: "south", x: 72, y: 62, protocol: "Modbus TCP", sensor: "Banner VIBE-IQ", baseVib: 0.34, baseTemp: 188 },
  { id: "B-DC-01", name: "Bobst Main 01", room: "diecutter", x: 18, y: 22, protocol: "MQTT/REST", sensor: "ESA pilot", baseVib: 0.14, baseTemp: 144, electrical: true },
  { id: "B-DC-02", name: "Bobst Main 02", room: "diecutter", x: 18, y: 48, protocol: "OPC UA", sensor: "SIMOCODE/E300", baseVib: 0.11, baseTemp: 137, electrical: true },
  { id: "B-DC-03", name: "Bobst Main 03", room: "diecutter", x: 18, y: 74, protocol: "Route ESA", sensor: "ATPOL III/PdMA", baseVib: 0.18, baseTemp: 151, electrical: true }
];

const state = {
  paused: false,
  acknowledged: 0,
  selectedId: "N-BL-05",
  ticks: 0,
  series: new Map(),
  alerts: [],
  lastAlertStatus: new Map(),
  acked: new Set(),
  shelved: new Set(),
  tagFilter: "",
  config: {
    vibWarn: 0.18,
    vibAlarm: 0.3,
    tempWarn: 160,
    tempAlarm: 185,
    emailRecipients: "maintenance@plant.example, controls@plant.example",
    smsRecipients: "+19205550123",
    emailEnabled: true,
    smsEnabled: true
  }
};

const rooms = {
  north: { label: "Baler Room - North", className: "north" },
  south: { label: "Baler Room - South", className: "south" },
  diecutter: { label: "Bobst Die-Cutter Motors", className: "diecutter" }
};

const roomEls = {};
const assetEls = new Map();

function statusFor(asset) {
  if (asset.vib >= state.config.vibAlarm || asset.temp >= state.config.tempAlarm) return "alarm";
  if (asset.vib >= state.config.vibWarn || asset.temp >= state.config.tempWarn) return "warning";
  return "normal";
}

function initData() {
  assets.forEach((asset, index) => {
    const vib = asset.baseVib + Math.sin(index) * 0.012;
    const temp = asset.baseTemp + Math.cos(index) * 2.5;
    asset.vib = Number(vib.toFixed(3));
    asset.temp = Number(temp.toFixed(1));
    asset.status = statusFor(asset);
    const vibSeries = [];
    const tempSeries = [];
    for (let i = 0; i < 42; i += 1) {
      vibSeries.push(Math.max(0.04, asset.vib + Math.sin(i / 4 + index) * 0.018 + (Math.random() - 0.5) * 0.01));
      tempSeries.push(asset.temp + Math.sin(i / 5 + index) * 4 + (Math.random() - 0.5) * 1.6);
    }
    state.series.set(asset.id, { vib: vibSeries, temp: tempSeries });
  });
}

function buildMap() {
  const map = document.getElementById("plantMap");
  Object.entries(rooms).forEach(([key, room]) => {
    const el = document.createElement("section");
    el.className = `room ${room.className}`;
    el.innerHTML = `<h3>${room.label}</h3>`;
    map.appendChild(el);
    roomEls[key] = el;
  });

  ["d1", "d2", "d3"].forEach((duct) => {
    const el = document.createElement("div");
    el.className = `duct ${duct}`;
    map.appendChild(el);
  });

  assets.forEach((asset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-node";
    button.style.left = `${asset.x}%`;
    button.style.top = `${asset.y}%`;
    button.setAttribute("aria-label", `${asset.name} detail`);
    button.addEventListener("click", () => {
      state.selectedId = asset.id;
      render();
    });
    roomEls[asset.room].appendChild(button);
    assetEls.set(asset.id, button);
  });
}

function jitter(asset, amount, heatAmount) {
  const pressure = Math.sin((state.ticks + asset.id.length) / 7) * amount;
  const noise = (Math.random() - 0.5) * amount;
  const heatNoise = (Math.random() - 0.5) * heatAmount;
  asset.vib = Math.max(0.04, Number((asset.baseVib + pressure + noise).toFixed(3)));
  asset.temp = Math.max(90, Number((asset.baseTemp + pressure * 45 + heatNoise).toFixed(1)));
  asset.status = statusFor(asset);

  const s = state.series.get(asset.id);
  s.vib.push(asset.vib);
  s.temp.push(asset.temp);
  while (s.vib.length > 42) s.vib.shift();
  while (s.temp.length > 42) s.temp.shift();
}

function updateData() {
  if (state.paused) return;
  state.ticks += 1;
  assets.forEach((asset) => jitter(asset, asset.electrical ? 0.018 : 0.024, asset.electrical ? 5 : 7));
  queueAutomaticAlerts();
}

function fmtVib(value) {
  return value.toFixed(3);
}

function fmtTemp(value) {
  return value.toFixed(1);
}

function renderMapNodes() {
  assets.forEach((asset) => {
    const el = assetEls.get(asset.id);
    el.className = `asset-node ${asset.status}${asset.id === state.selectedId ? " is-selected" : ""}`;
    el.innerHTML = `
      <div class="asset-head">
        <span>${asset.id}</span>
        <i class="led ${asset.status}"></i>
      </div>
      <div class="asset-readouts">
        <div class="lcd">${fmtVib(asset.vib)}<br>in/s</div>
        <div class="lcd">${fmtTemp(asset.temp)}<br>deg F</div>
      </div>
    `;
  });
}

function renderCounts() {
  const counts = { normal: 0, warning: 0, alarm: 0 };
  assets.forEach((asset) => { counts[asset.status] += 1; });
  document.getElementById("assetCount").textContent = String(assets.length);
  document.getElementById("normalCount").textContent = String(counts.normal);
  document.getElementById("warningCount").textContent = String(counts.warning);
  document.getElementById("alarmCount").textContent = String(counts.alarm);
  document.getElementById("writeCount").textContent = `${assets.length * 4}/s`;
}

function renderDetail() {
  const asset = assets.find((item) => item.id === state.selectedId) || assets[0];
  const status = document.getElementById("detailStatus");
  document.getElementById("detail-title").textContent = asset.name;
  document.getElementById("detailPath").textContent = tagPath(asset);
  document.getElementById("detailVib").textContent = fmtVib(asset.vib);
  document.getElementById("detailTemp").textContent = fmtTemp(asset.temp);
  document.getElementById("detailProtocol").textContent = asset.protocol;
  status.textContent = asset.status;
  status.className = `status-pill ${asset.status}`;

  const series = state.series.get(asset.id);
  document.getElementById("vibThresholdLabel").textContent = `Warn ${state.config.vibWarn.toFixed(3)} / Alarm ${state.config.vibAlarm.toFixed(3)} in/s`;
  document.getElementById("tempThresholdLabel").textContent = `Warn ${state.config.tempWarn} / Alarm ${state.config.tempAlarm} deg F`;
  drawChart(document.getElementById("vibChart"), series.vib, 0, 0.42, [{ value: state.config.vibWarn, color: "#f3b63f" }, { value: state.config.vibAlarm, color: "#f04b3f" }]);
  drawChart(document.getElementById("tempChart"), series.temp, 90, 210, [{ value: state.config.tempWarn, color: "#f3b63f" }, { value: state.config.tempAlarm, color: "#f04b3f" }]);
}

function drawChart(canvas, values, min, max, bands) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#111816";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#25332e";
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  bands.forEach((band) => {
    const y = h - ((band.value - min) / (max - min)) * h;
    ctx.strokeStyle = band.color;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.strokeStyle = "#9dff9e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = (index / (values.length - 1)) * w;
    const y = h - ((value - min) / (max - min)) * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderEvents() {
  const list = document.getElementById("eventList");
  const active = assets
    .filter((asset) => asset.status !== "normal")
    .sort((a, b) => (a.status === "alarm" ? -1 : 1) - (b.status === "alarm" ? -1 : 1))
    .slice(0, 8);
  list.innerHTML = active.map((asset) => `
    <div class="event-row ${asset.status}">
      <strong>${asset.status.toUpperCase()}</strong>
      <span>${asset.name}: ${fmtVib(asset.vib)} in/s, ${fmtTemp(asset.temp)} deg F</span>
      <span>${asset.protocol}</span>
    </div>
  `).join("") || `<div class="event-row"><strong>OK</strong><span>No active alarms or warnings</span><span>SCADA</span></div>`;
  document.getElementById("ackState").textContent = `${state.acknowledged} acknowledged`;
}

function tagPath(asset, point = "DE-Bearing") {
  return `GBP/DePere/FoldingCarton/${rooms[asset.room].label.replaceAll(" ", "")}/${asset.id}/${point}`;
}

function tagMatchesFilter(asset) {
  const query = state.tagFilter;
  if (!query) return true;
  const haystack = [asset.id, asset.name, tagPath(asset), asset.protocol, asset.sensor, asset.status, rooms[asset.room].label].join(" ").toLowerCase();
  return query.split(/\s+/).every((term) => haystack.includes(term));
}

function renderTagTable() {
  const visible = assets.filter(tagMatchesFilter);
  const rows = visible.map((asset) => {
    const historian = asset.electrical ? "On Change" : "Periodic 1.2s";
    return `
      <div class="tag-row ${asset.status}" role="row">
        <span>${tagPath(asset)}</span>
        <span>${fmtVib(asset.vib)}</span>
        <span>${fmtTemp(asset.temp)}</span>
        <span class="status-cell">${asset.status.toUpperCase()}</span>
        <span>Good</span>
        <span>${historian}</span>
        <span>${asset.protocol}</span>
      </div>
    `;
  }).join("");
  document.getElementById("tagTable").innerHTML = `
    <div class="tag-row header" role="row">
      <span>Tag path</span><span>Vib</span><span>Temp</span><span>Alarm</span><span>Quality</span><span>Historian</span><span>Driver</span>
    </div>
    ${rows || `<div class="tag-row normal" role="row"><span>No tags match "${state.tagFilter}"</span><span>--</span><span>--</span><span>--</span><span>--</span><span>--</span><span>--</span></div>`}
  `;
  const counter = document.getElementById("tagFilterCount");
  if (counter) counter.textContent = state.tagFilter ? `${visible.length} of ${assets.length} tags` : `${assets.length} tags`;
}

function renderAlarmJournal() {
  const alarmAssets = assets
    .filter((asset) => asset.status !== "normal")
    .sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === "alarm" ? -1 : 1;
    });
  const rows = alarmAssets.map((asset) => {
    const shelved = state.shelved.has(asset.id);
    const acked = state.acked.has(asset.id);
    const reason = asset.vib >= state.config.vibAlarm || asset.vib >= state.config.vibWarn ? "Vibration RMS" : "Bearing Temp";
    return `
      <div class="journal-row ${asset.status}${shelved ? " shelved" : ""}" role="row">
        <span>${asset.status.toUpperCase()}</span>
        <span>${acked ? "Acked" : "Unacked"}${shelved ? " / Shelved" : ""}</span>
        <span>${tagPath(asset)}</span>
        <span>${reason}</span>
        <span>${fmtVib(asset.vib)} / ${fmtTemp(asset.temp)}</span>
        <span>${asset.protocol}</span>
      </div>
    `;
  }).join("");
  document.getElementById("alarmJournal").innerHTML = `
    <div class="journal-row header" role="row">
      <span>Priority</span><span>State</span><span>Source</span><span>Condition</span><span>Values</span><span>Pipeline</span>
    </div>
    ${rows || `<div class="journal-row normal" role="row"><span>OK</span><span>Clear</span><span>[default]</span><span>No active alarms</span><span>--</span><span>Idle</span></div>`}
  `;
  document.getElementById("journalRows").textContent = String(alarmAssets.length);
}

function alertChannels() {
  const channels = [];
  if (state.config.emailEnabled) channels.push("EMAIL");
  if (state.config.smsEnabled) channels.push("SMS");
  return channels;
}

function addAlert(asset, reason, test = false) {
  const channels = alertChannels();
  const route = channels.length ? channels.join("+") : "DISABLED";
  const message = `${asset.name}: ${fmtVib(asset.vib)} in/s, ${fmtTemp(asset.temp)} deg F - ${reason}`;
  state.alerts.unshift({
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    route,
    message: test ? `TEST - ${message}` : message
  });
  state.alerts = state.alerts.slice(0, 12);
}

function queueAutomaticAlerts() {
  assets.forEach((asset) => {
    const previous = state.lastAlertStatus.get(asset.id) || "normal";
    if (asset.status === "alarm" && previous !== "alarm") {
      addAlert(asset, `crossed alarm threshold via ${asset.protocol}`);
    }
    state.lastAlertStatus.set(asset.id, asset.status);
  });
}

function renderAlertSettings() {
  document.getElementById("vibWarn").value = state.config.vibWarn;
  document.getElementById("vibAlarm").value = state.config.vibAlarm;
  document.getElementById("tempWarn").value = state.config.tempWarn;
  document.getElementById("tempAlarm").value = state.config.tempAlarm;
  document.getElementById("emailRecipients").value = state.config.emailRecipients;
  document.getElementById("smsRecipients").value = state.config.smsRecipients;
  document.getElementById("emailEnabled").checked = state.config.emailEnabled;
  document.getElementById("smsEnabled").checked = state.config.smsEnabled;
}

function renderAlertLog() {
  const channels = alertChannels();
  document.getElementById("alertRouteState").textContent = channels.length ? `${channels.join(" + ")} enabled` : "Notifications disabled";
  document.getElementById("alertLog").innerHTML = state.alerts.map((alert) => `
    <div class="alert-log-row">
      <strong>${alert.route}</strong>
      <span>${alert.message}</span>
      <span>${alert.time}</span>
    </div>
  `).join("") || `<div class="alert-log-row"><strong>IDLE</strong><span>No outbound alerts queued yet</span><span>--</span></div>`;
}

function renderClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function render() {
  renderMapNodes();
  renderCounts();
  renderDetail();
  renderEvents();
  renderTagTable();
  renderAlarmJournal();
  renderAlertLog();
  renderClock();
}

function bindControls() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!tab.dataset.view) return;
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
      document.querySelectorAll(".view").forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.getElementById(tab.dataset.view).classList.add("is-active");
    });
  });

  document.getElementById("pauseBtn").addEventListener("click", () => {
    state.paused = !state.paused;
    document.getElementById("pauseBtn").textContent = state.paused ? "RUN" : "II";
  });

  document.getElementById("ackBtn").addEventListener("click", () => {
    const active = assets.filter((asset) => asset.status !== "normal");
    active.forEach((asset) => state.acked.add(asset.id));
    state.acknowledged += active.length;
    render();
  });

  document.getElementById("ackAllAlarms").addEventListener("click", () => {
    const active = assets.filter((asset) => asset.status !== "normal");
    active.forEach((asset) => state.acked.add(asset.id));
    state.acknowledged += active.length;
    addAlert(assets.find((asset) => asset.id === state.selectedId), "operator acknowledged active alarm table", true);
    render();
  });

  document.getElementById("shelveWarnings").addEventListener("click", () => {
    assets.filter((asset) => asset.status === "warning").forEach((asset) => state.shelved.add(asset.id));
    addAlert(assets.find((asset) => asset.id === state.selectedId), "warning alarms shelved for maintenance review", true);
    render();
  });

  document.getElementById("clearShelves").addEventListener("click", () => {
    state.shelved.clear();
    addAlert(assets.find((asset) => asset.id === state.selectedId), "alarm shelves cleared", true);
    render();
  });

  document.getElementById("thresholdForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const next = {
      vibWarn: Number(document.getElementById("vibWarn").value),
      vibAlarm: Number(document.getElementById("vibAlarm").value),
      tempWarn: Number(document.getElementById("tempWarn").value),
      tempAlarm: Number(document.getElementById("tempAlarm").value)
    };
    if (next.vibWarn >= next.vibAlarm || next.tempWarn >= next.tempAlarm) {
      addAlert(assets.find((asset) => asset.id === state.selectedId), "threshold save rejected: warning must be below alarm", true);
      render();
      return;
    }
    Object.assign(state.config, next);
    assets.forEach((asset) => { asset.status = statusFor(asset); });
    addAlert(assets.find((asset) => asset.id === state.selectedId), "threshold set updated", true);
    render();
  });

  document.getElementById("resetThresholds").addEventListener("click", () => {
    Object.assign(state.config, { vibWarn: 0.18, vibAlarm: 0.3, tempWarn: 160, tempAlarm: 185 });
    assets.forEach((asset) => { asset.status = statusFor(asset); });
    renderAlertSettings();
    render();
  });

  document.getElementById("alertForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.config.emailRecipients = document.getElementById("emailRecipients").value.trim();
    state.config.smsRecipients = document.getElementById("smsRecipients").value.trim();
    state.config.emailEnabled = document.getElementById("emailEnabled").checked;
    state.config.smsEnabled = document.getElementById("smsEnabled").checked;
    addAlert(assets.find((asset) => asset.id === state.selectedId), "alert routing saved", true);
    render();
  });

  document.getElementById("sendTestAlert").addEventListener("click", () => {
    addAlert(assets.find((asset) => asset.id === state.selectedId), "manual operator test alert", true);
    render();
  });

  const tagSearch = document.getElementById("tagSearch");
  if (tagSearch) {
    tagSearch.addEventListener("input", () => {
      state.tagFilter = tagSearch.value.trim().toLowerCase();
      renderTagTable();
    });
  }
}

initData();
buildMap();
bindControls();
renderAlertSettings();
render();
setInterval(() => {
  updateData();
  render();
}, 1200);
