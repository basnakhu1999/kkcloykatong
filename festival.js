"use strict";

const byId = id => document.getElementById(id);
const prayer = byId("prayer");

const prefix = "kkc:float:v1:";
const temporary = new Set();
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
});
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
const panels = { picker: "เลือกกระทง", composer: "ฝากคำอธิษฐาน", stats: "กระทงของฉัน" };

function openPanel(id) {
  for (const panel of Object.keys(panels)) byId(panel).hidden = panel !== id;
  byId("panel-title").textContent = panels[id];
  if (!sheet.open) sheet.showModal();
  const firstControl = id === "composer" ? prayer :
    id === "picker" ? byId("choices").querySelector("input:checked") : byId("close");
  firstControl.focus();
}
document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => openPanel(button.dataset.panel));
});
byId("continue").addEventListener("click", () => openPanel("composer"));
byId("close").addEventListener("click", () => sheet.close());
if (location.hash === "#stats") openPanel("stats");

function refreshStats() {
  const events = new Set(temporary);
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) events.add(key);
    }
  } catch {
    byId("scope").textContent = "สถิติชั่วคราวในหน้านี้";
  }
  const todayPrefix = prefix + dayFormat.format(new Date()) + ":";
  let todayCount = 0;
  for (const key of events) {
    if (key.startsWith(todayPrefix)) todayCount++;
  }
  byId("today").textContent = numberFormat.format(todayCount);
  byId("total").textContent = numberFormat.format(events.size);
}

function updateLength() {
  prayer.setCustomValidity("");
  byId("length").textContent = prayer.value.length + " / 160";
}
prayer.addEventListener("input", updateLength);
const api = new URL("api/floats", document.baseURI);
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
  const key = prefix + dayFormat.format(new Date()) + ":" + crypto.getRandomValues(new Uint32Array(4)).join("-");
  try {
    localStorage.setItem(key, "1");
  } catch {
    temporary.add(key);
    byId("scope").textContent = "กระทงที่บันทึกไม่ได้จะนับเฉพาะในหน้านี้";
  }
  refreshStats();
  sheet.close();
  floatBoat(design, message, true);
  prayer.value = "";
  updateLength();
  if (!share) {
    notify("ลอยกระทงส่วนตัวแล้ว");
    return;
  }
  const token = crypto.randomUUID();
  mine.add(token);
  try {
    const response = await fetch(api, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, design, message }), signal: AbortSignal.timeout(10000)
    });
    if (response.status === 429) {
      mine.delete(token);
      notify("กระทงลอยบนจอนี้แล้ว กรุณาเว้น 5 วินาทีก่อนแชร์ใบถัดไป");
      return;
    }
    if (!response.ok || !(await response.json()).published) throw new Error();
    notify("ปล่อยกระทงลงสายน้ำร่วมแล้ว");
  } catch {
    notify("กระทงลอยบนจอนี้แล้ว แต่ยังยืนยันการแชร์ไม่ได้");
  }
  setTimeout(() => mine.delete(token), 3600000);

});
window.addEventListener("storage", refreshStats);
window.addEventListener("pageshow", refreshStats);
setInterval(refreshStats, 60000);
refreshStats();
