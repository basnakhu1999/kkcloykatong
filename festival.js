"use strict";

const byId = id => document.getElementById(id);
const prayer = byId("prayer");

const numberFormat = new Intl.NumberFormat("th-TH");
const designs = ["กระทงใบตอง", "กระทงดอกไม้ชมพู", "กระทงดาวเรือง", "กระทงกลีบใบตอง", "กระทงบัวชมพู", "กระทงดอกไม้ขาว", "กระทงบัวฟ้า"];

designs.forEach((name, index) => {
  const label = document.createElement("label");
  const radio = document.createElement("input");
  const thumbnail = document.createElement("img");
  radio.type = "radio";
  radio.name = "design";
  radio.setAttribute("form", "wish");
  radio.value = index ? "img/krathong-" + index + ".png" : "img/krathong.png";
  radio.checked = index === 0;
  radio.setAttribute("aria-label", name);
  thumbnail.src = radio.value;
  thumbnail.alt = "";
  label.title = name;
  label.append(radio, thumbnail);
  byId("choices").append(label);
});

const sheet = byId("sheet");
const panels = { picker: "เลือกกระทง", composer: "ฝากคำอธิษฐาน", stats: "สถิติกระทงรวม" };

function openPanel(id) {
  for (const panel of Object.keys(panels)) byId(panel).hidden = panel !== id;
  byId("panel-title").textContent = panels[id];
  if (!sheet.open) sheet.showModal();
  const firstControl = id === "composer" ? prayer :
    id === "picker" ? byId("choices").querySelector("input:checked") : byId("close");
  firstControl.focus();
  if (id === "stats") refreshStats();
}
document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => openPanel(button.dataset.panel));
});
byId("continue").addEventListener("click", () => openPanel("composer"));
byId("close").addEventListener("click", () => sheet.close());
const api = new URL("api/floats", document.baseURI);
let loadingStats = false;
async function refreshStats() {
  if (loadingStats || document.hidden || !sheet.open || byId("stats").hidden) return;
  loadingStats = true;
  try {
    const url = new URL(api);
    url.searchParams.set("stats", "1");
    const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error();
    const {today, total} = await response.json();
    if (!Number.isSafeInteger(today) || !Number.isSafeInteger(total)) throw new Error();
    byId("today").textContent = numberFormat.format(today);
    byId("total").textContent = numberFormat.format(total);
    byId("scope").textContent = "จำนวนกระทงจากผู้ร่วมลอยทุกคน";
  } catch {
    byId("scope").textContent = "ยังอัปเดตยอดรวมไม่ได้";
  } finally {
    loadingStats = false;
  }
}
if (location.hash === "#stats") openPanel("stats");

function updateLength() {
  prayer.setCustomValidity("");
  byId("length").textContent = prayer.value.length + " / 160";
}
prayer.addEventListener("input", updateLength);
const mine = new Set();
const queue = [];
const recentHistory = [];
let cursor = null;
let lane = 0;
let toastTimer;

function notify(message) {
  byId("notice").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { byId("notice").textContent = ""; }, 5000);
}

function floatBoat(design, message, personal) {
  const boat = document.createElement("figure");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const width = document.documentElement.clientWidth;
  const beam = Math.round(Math.min(personal ? 108 : 78, Math.max(personal ? 66 : 48, width * .07)));
  const seconds = (width + beam) / (personal ? 15 : 13);
  lane = (lane + 1) % 3;
  boat.className = personal ? "float" : "float shared";
  boat.style.setProperty("--beam", beam + "px");
  boat.style.setProperty("--lane", (personal ? 18 : 24 + lane * 6) + "%");
  boat.style.setProperty("--still", (personal ? 50 : 20 + lane * 28) + "%");
  boat.style.setProperty("--swell", (2.3 + lane * .4) + "s");
  boat.style.setProperty("--travel", seconds + "s");
  image.src = design ? "img/krathong-" + design + ".png" : "img/krathong.png";
  image.alt = designs[design];
  caption.textContent = message;
  boat.append(caption, image);
  byId("flotilla").append(boat);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => boat.remove(), reduced ? 12000 : (seconds + 1) * 1000);
}

const pollInterval = 3000;
let retryDelay = pollInterval;
let pollTimer;
let launchTimer;
let polling = false;
let nextLaunch = 0;

function showNextBoat() {
  clearTimeout(launchTimer);
  if (document.hidden || !(queue.length || recentHistory.length)) return;
  const wait = nextLaunch - Date.now();
  if (wait > 0) {
    launchTimer = setTimeout(showNextBoat, wait);
    return;
  }
  // New arrivals get the next lane before boats from the opening snapshot.
  const item = queue.shift() ?? recentHistory.shift();
  const visible = byId("flotilla").querySelectorAll(".shared");
  if (visible.length >= 12) visible[0].remove();
  floatBoat(item.design, item.message, false);
  nextLaunch = Date.now() + 900;
  if (queue.length || recentHistory.length) launchTimer = setTimeout(showNextBoat, 900);
}

async function poll() {
  if (document.hidden || polling) return;
  polling = true;
  clearTimeout(pollTimer);
  try {
    const url = new URL(api);
    const firstVisit = cursor === null;
    if (!firstVisit) url.searchParams.set("after", cursor);
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
    const { floats } = await response.json();
    const arrivals = firstVisit ? recentHistory : queue;
    for (const item of floats) {
      cursor = item.id;
      if (!mine.delete(item.token)) arrivals.push(item);
    }
    cursor ??= 0;
    showNextBoat();
    retryDelay = pollInterval;
  } catch {
    retryDelay = Math.min(retryDelay * 2, 60000);
  } finally {
    polling = false;
    if (!document.hidden) pollTimer = setTimeout(poll, Math.max(retryDelay, queue.length * 900));
  }
}
document.addEventListener("visibilitychange", () => {
  clearTimeout(pollTimer);
  clearTimeout(launchTimer);
  if (!document.hidden) {
    showNextBoat();
    poll();
  }
});
poll();

byId("wish").addEventListener("submit", async event => {
  event.preventDefault();
  const message = prayer.value.trim();
  if (!message) {
    prayer.setCustomValidity("เขียนคำอธิษฐานก่อนปล่อยกระทงนะคะ");
    prayer.reportValidity();
    return;
  }
  const design = Array.from(byId("choices").querySelectorAll("input")).findIndex(input => input.checked);
  const share = byId("share").checked;
  sheet.close();
  floatBoat(design, message, true);
  prayer.value = "";
  updateLength();
  const token = crypto.randomUUID();
  if (share) mine.add(token);
  try {
    const response = await fetch(api, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(share ? { token, design, message } : { token, design: 0, private: true }), signal: AbortSignal.timeout(10000)
    });
    if (response.status === 429) {
      mine.delete(token);
      notify("กระทงลอยบนจอนี้แล้ว กรุณาเว้น 5 วินาทีก่อนส่งใบถัดไป");
      return;
    }
    if (!response.ok || !(await response.json()).published) throw new Error();
    notify(share ? "ปล่อยกระทงลงสายน้ำร่วมแล้ว" : "ลอยส่วนตัวแล้ว นับในยอดรวมแล้ว");
  } catch {
    notify(share ? "กระทงลอยบนจอนี้แล้ว แต่ยังยืนยันการแชร์ไม่ได้" : "ลอยส่วนตัวแล้ว แต่ยังยืนยันการนับยอดไม่ได้");
  }
  setTimeout(() => mine.delete(token), 3600000);

});
setInterval(refreshStats, 5000);
