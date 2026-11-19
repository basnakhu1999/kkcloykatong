"use strict";

const byId = id => document.getElementById(id);
const prayer = byId("prayer");
const launched = byId("launched");
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
let hideBoat;
byId("wish").addEventListener("submit", event => {
  event.preventDefault();
  const message = prayer.value.trim();
  if (!message) {
    prayer.setCustomValidity("เขียนคำอธิษฐานก่อนปล่อยกระทงนะคะ");
    prayer.reportValidity();
    return;
  }
  const key = prefix + dayFormat.format(new Date()) + ":" + crypto.getRandomValues(new Uint32Array(4)).join("-");
  try {
    localStorage.setItem(key, "1");
  } catch {
    temporary.add(key);
    byId("scope").textContent = "กระทงที่บันทึกไม่ได้จะนับเฉพาะในหน้านี้";
  }
  refreshStats();
  launched.querySelector("img").src = event.currentTarget.elements.design.value;
  launched.querySelector("figcaption").textContent = message;
  sheet.close();
  launched.hidden = false;
  for (const animation of launched.getAnimations()) animation.currentTime = 0;
  clearTimeout(hideBoat);
  hideBoat = setTimeout(() => { launched.hidden = true; }, 15000);
  prayer.value = "";
  updateLength();
  byId("notice").textContent = "ลอยกระทงแล้ว ขอให้คำอธิษฐานของคุณเป็นจริง";
});
window.addEventListener("storage", refreshStats);
window.addEventListener("pageshow", refreshStats);
setInterval(refreshStats, 60000);
refreshStats();
