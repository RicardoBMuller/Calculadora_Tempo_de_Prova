(() => {
  "use strict";

  const HISTORY_KEY = "fcc_exam_time_history_v1";
  const MAX_HISTORY = 5;

  const el = {
    form: document.getElementById("examForm"),
    scheduledStart: document.getElementById("scheduledStart"),
    actualStart: document.getElementById("actualStart"),
    durationHours: document.getElementById("durationHours"),
    durationMinutes: document.getElementById("durationMinutes"),
    validation: document.getElementById("validationMessage"),
    quickButtons: [...document.querySelectorAll(".quick-times button")],
    reset: document.getElementById("resetBtn"),
    resultCard: document.getElementById("resultCard"),
    scheduledEnd: document.getElementById("scheduledEnd"),
    delayValue: document.getElementById("delayValue"),
    deltaLabel: document.getElementById("deltaLabel"),
    durationValue: document.getElementById("durationValue"),
    newEndTime: document.getElementById("newEndTime"),
    dayIndicator: document.getElementById("dayIndicator"),
    statusPill: document.getElementById("statusPill"),
    timelineCaption: document.getElementById("timelineCaption"),
    timelineProgress: document.getElementById("timelineProgress"),
    timelineScheduled: document.getElementById("timelineScheduled"),
    timelineActual: document.getElementById("timelineActual"),
    timelineEnd: document.getElementById("timelineEnd"),
    actualPoint: document.getElementById("actualPoint"),
    summary: document.getElementById("summaryText"),
    copy: document.getElementById("copyBtn"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    history: document.getElementById("historyList"),
    clearHistory: document.getElementById("clearHistoryBtn"),
    introScreen: document.getElementById("introScreen"),
    logos: [...document.querySelectorAll(".fcc-logo")],
    logoFallbacks: [...document.querySelectorAll(".logo-fallback")]
  };

  let lastResult = null;
  let toastTimer = null;
  let autoTimer = null;


  function enableLogoFallback(img) {
    if (!img) return;
    img.style.display = "none";
    const fallback = img.nextElementSibling;
    if (fallback) fallback.hidden = false;
  }

  function setupLogos() {
    el.logos.forEach((img) => {
      if (!img) return;
      img.addEventListener("error", () => enableLogoFallback(img), { once: true });
      if (img.complete && (!img.naturalWidth || img.naturalWidth === 0)) {
        enableLogoFallback(img);
      }
    });
  }

  function initIntro() {
    const introDuration = 4000;

    window.setTimeout(() => {
      document.body.classList.remove("intro-playing");
      document.body.classList.add("intro-finished");

      if (el.introScreen) {
        el.introScreen.setAttribute("aria-hidden", "true");
        window.setTimeout(() => {
          el.introScreen.style.display = "none";
        }, 500);
      }
    }, introDuration);
  }

  function parseTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function formatClock(totalMinutes) {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function signedDelta(actual, scheduled) {
    let diff = actual - scheduled;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
  }

  function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!rest) return hours === 1 ? "1 h" : `${hours} h`;
    return `${hours}h${String(rest).padStart(2, "0")}`;
  }

  function formatDurationClock(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function pluralMinutes(value) {
    const n = Math.abs(value);
    return `${n} ${n === 1 ? "minuto" : "minutos"}`;
  }

  function sanitizeDurationPart(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
  }

  function normalizeDurationFields() {
    const hoursRaw = el.durationHours.value.trim();
    const minutesRaw = el.durationMinutes.value.trim();

    if (hoursRaw !== "") {
      el.durationHours.value = String(Math.min(Number(hoursRaw) || 0, 99)).padStart(2, "0");
    }

    if (minutesRaw !== "") {
      el.durationMinutes.value = String(Math.min(Number(minutesRaw) || 0, 59)).padStart(2, "0");
    }
  }

  function getDurationMinutes() {
    const hoursText = el.durationHours.value.trim();
    const minutesText = el.durationMinutes.value.trim();

    if (!/^\d{1,2}$/.test(hoursText) || !/^\d{1,2}$/.test(minutesText)) {
      return null;
    }

    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) {
      return null;
    }

    const total = (hours * 60) + minutes;
    if (total < 1 || total > 720) return null;

    return total;
  }

  function setDurationFields(totalMinutes) {
    const total = Number(totalMinutes);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    el.durationHours.value = String(hours).padStart(2, "0");
    el.durationMinutes.value = String(minutes).padStart(2, "0");
  }

  function validate() {
    const scheduled = parseTime(el.scheduledStart.value);
    const actual = parseTime(el.actualStart.value);
    const duration = getDurationMinutes();

    if (scheduled === null || actual === null) {
      return { ok: false, message: "Preencha os dois horários para calcular." };
    }

    if (duration === null) {
      return { ok: false, message: "Informe uma duração válida entre 00:01 e 12:00." };
    }

    return { ok: true, scheduled, actual, duration };
  }

  function buildResult({ scheduled, actual, duration }) {
    const delta = signedDelta(actual, scheduled);
    const scheduledEndAbs = scheduled + duration;
    const actualAbs = scheduled + delta;
    const newEndAbs = actualAbs + duration;
    const scheduledEnd = formatClock(scheduledEndAbs);
    const newEnd = formatClock(newEndAbs);
    const crossesDay = newEndAbs >= 1440 || newEndAbs < 0;

    let status = "on-time";
    let statusText = "No horário";
    let deltaLabel = "Variação no início";
    let deltaDisplay = "0 min";
    let timelineCaption = "Sem alteração no horário";
    let movementText = "começou no horário previsto";

    if (delta > 0) {
      status = "delayed";
      statusText = `+${delta} min`;
      deltaLabel = "Atraso no início";
      deltaDisplay = `${delta} min`;
      timelineCaption = `+${delta} ${delta === 1 ? "minuto deslocado" : "minutos deslocados"}`;
      movementText = `começou às ${formatClock(actual)}, com ${pluralMinutes(delta)} de atraso`;
    } else if (delta < 0) {
      status = "early";
      statusText = `${delta} min`;
      deltaLabel = "Adiantamento";
      deltaDisplay = `${Math.abs(delta)} min`;
      timelineCaption = `${Math.abs(delta)} ${Math.abs(delta) === 1 ? "minuto adiantado" : "minutos adiantados"}`;
      movementText = `começou às ${formatClock(actual)}, com ${pluralMinutes(delta)} de adiantamento`;
    }

    const summary = delta === 0
      ? `A prova começou no horário previsto, às ${formatClock(scheduled)}. Mantendo ${formatDuration(duration)} de duração, o encerramento permanece às ${scheduledEnd}.`
      : `A prova prevista para ${formatClock(scheduled)} ${movementText}. Mantendo ${formatDuration(duration)} de duração, o encerramento passa de ${scheduledEnd} para ${newEnd}${crossesDay ? " (dia seguinte)" : ""}.`;

    return {
      scheduled: formatClock(scheduled),
      actual: formatClock(actual),
      duration,
      durationText: formatDuration(duration),
      durationClock: formatDurationClock(duration),
      delta,
      scheduledEnd,
      newEnd,
      crossesDay,
      status,
      statusText,
      deltaLabel,
      deltaDisplay,
      timelineCaption,
      summary
    };
  }

  function timelineActualPercent(result) {
    const duration = Math.max(result.duration, 1);
    const proportional = 36 + (result.delta / duration) * 28;
    return Math.min(78, Math.max(18, proportional));
  }

  function render(result, animate = true) {
    lastResult = result;
    el.validation.textContent = "";

    el.scheduledEnd.textContent = result.scheduledEnd;
    el.delayValue.textContent = result.deltaDisplay;
    el.deltaLabel.textContent = result.deltaLabel;
    el.durationValue.textContent = result.durationText;
    el.newEndTime.textContent = result.newEnd;
    el.dayIndicator.classList.toggle("hidden", !result.crossesDay);

    el.statusPill.className = `result-status ${result.status}`;
    el.statusPill.textContent = result.statusText;

    el.timelineScheduled.textContent = result.scheduled;
    el.timelineActual.textContent = result.actual;
    el.timelineEnd.textContent = result.newEnd;
    el.timelineCaption.textContent = result.timelineCaption;
    el.summary.textContent = result.summary;

    el.actualPoint.style.left = `${timelineActualPercent(result)}%`;
    el.timelineProgress.style.width = "0%";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.timelineProgress.style.width = "100%";
      });
    });

    if (animate) {
      el.resultCard.classList.remove("recalculated");
      void el.resultCard.offsetWidth;
      el.resultCard.classList.add("recalculated");
    }
  }

  function calculate({ animate = true, save = false } = {}) {
    const input = validate();

    if (!input.ok) {
      el.validation.textContent = input.message;
      return null;
    }

    const result = buildResult(input);
    render(result, animate);
    updateQuickButtons();

    if (save) saveHistory(result);
    return result;
  }

  function updateQuickButtons() {
    const current = getDurationMinutes();

    el.quickButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        current !== null && Number(button.dataset.minutes) === current
      );
    });
  }

  function scheduleAutoCalculate() {
    window.clearTimeout(autoTimer);
    autoTimer = window.setTimeout(() => {
      calculate({ animate: false, save: false });
    }, 120);
  }

  function showToast(message) {
    el.toastText.textContent = message;
    el.toast.classList.add("show");
    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      el.toast.classList.remove("show");
    }, 2200);
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeHistory(items) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // O armazenamento local pode estar bloqueado pelo navegador.
    }
  }

  function saveHistory(result) {
    const entry = {
      scheduled: result.scheduled,
      actual: result.actual,
      duration: result.duration,
      newEnd: result.newEnd,
      delta: result.delta,
      savedAt: Date.now()
    };

    const history = loadHistory();
    const duplicate = history.findIndex((item) =>
      item.scheduled === entry.scheduled &&
      item.actual === entry.actual &&
      Number(item.duration) === entry.duration &&
      item.newEnd === entry.newEnd
    );

    if (duplicate >= 0) history.splice(duplicate, 1);
    history.unshift(entry);
    writeHistory(history.slice(0, MAX_HISTORY));
    renderHistory();
  }

  function renderHistory() {
    const history = loadHistory();
    el.history.innerHTML = "";

    if (!history.length) {
      el.history.innerHTML = '<p class="history-empty">Os últimos cálculos aparecerão aqui.</p>';
      return;
    }

    history.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";

      const delta = Number(item.delta) || 0;
      const deltaText = delta > 0
        ? `+${delta} min`
        : delta < 0
          ? `${delta} min`
          : "no horário";

      button.innerHTML = `
        <span>${item.scheduled} → ${item.actual}</span>
        <strong>${item.newEnd}</strong>
        <small>${formatDuration(Number(item.duration))} • ${deltaText}</small>
      `;

      button.addEventListener("click", () => {
        el.scheduledStart.value = item.scheduled;
        el.actualStart.value = item.actual;
        setDurationFields(Number(item.duration));
        calculate({ animate: true, save: false });

        if (window.innerWidth < 781) {
          el.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      el.history.appendChild(button);
    });
  }

  async function copySummary() {
    if (!lastResult) return;

    const text = `Cálculo de duração da prova\nInício previsto: ${lastResult.scheduled}\nInício real: ${lastResult.actual}\nDuração: ${lastResult.durationClock} (${lastResult.durationText})\nTérmino previsto: ${lastResult.scheduledEnd}\nNovo término: ${lastResult.newEnd}\n${lastResult.deltaLabel}: ${lastResult.deltaDisplay}\n\n${lastResult.summary}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast("Resumo copiado!");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      showToast(ok ? "Resumo copiado!" : "Não foi possível copiar.");
    }
  }

  el.form.addEventListener("submit", (event) => {
    event.preventDefault();
    normalizeDurationFields();

    const result = calculate({ animate: true, save: true });

    if (result && window.innerWidth < 781) {
      window.setTimeout(() => {
        el.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  });

  [el.scheduledStart, el.actualStart].forEach((input) => {
    input.addEventListener("input", scheduleAutoCalculate);
    input.addEventListener("change", scheduleAutoCalculate);
  });

  [el.durationHours, el.durationMinutes].forEach((input) => {
    input.addEventListener("input", () => {
      sanitizeDurationPart(input);
      scheduleAutoCalculate();
    });

    input.addEventListener("blur", () => {
      if (input.value.trim() === "") input.value = "00";
      else input.value = String(Number(input.value) || 0).padStart(2, "0");
      scheduleAutoCalculate();
    });
  });

  el.durationHours.addEventListener("input", () => {
    if (el.durationHours.value.length === 2) el.durationMinutes.focus();
  });

  el.quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setDurationFields(Number(button.dataset.minutes));
      calculate({ animate: true, save: false });
    });
  });

  el.reset.addEventListener("click", () => {
    el.scheduledStart.value = "10:00";
    el.actualStart.value = "10:00";
    setDurationFields(50);
    calculate({ animate: true, save: false });
    el.scheduledStart.focus();
  });

  el.copy.addEventListener("click", copySummary);

  el.clearHistory.addEventListener("click", () => {
    writeHistory([]);
    renderHistory();
    showToast("Histórico limpo.");
  });

  setupLogos();
  initIntro();
  setDurationFields(50);
  renderHistory();
  calculate({ animate: false, save: false });
})();
