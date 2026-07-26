(() => {
  "use strict";

  const HISTORY_KEY = "fcc_exam_time_history_single_v1";
  const MAX_HISTORY = 5;
  const INTRO_DURATION = 4000;
  const VISITOR_SESSION_KEY = "fcc_calculadora_visit_number_v1";

  const el = {
    form: document.getElementById("examForm"),
    startTime: document.getElementById("startTime"),
    durationHours: document.getElementById("durationHours"),
    durationMinutes: document.getElementById("durationMinutes"),
    validation: document.getElementById("validationMessage"),
    quickButtons: [...document.querySelectorAll(".quick-times button")],
    reset: document.getElementById("resetBtn"),
    resultCard: document.getElementById("resultCard"),
    endTime: document.getElementById("endTime"),
    resultStart: document.getElementById("resultStart"),
    resultEnd: document.getElementById("resultEnd"),
    durationValue: document.getElementById("durationValue"),
    dayIndicator: document.getElementById("dayIndicator"),
    statusPill: document.getElementById("statusPill"),
    timelineCaption: document.getElementById("timelineCaption"),
    timelineProgress: document.getElementById("timelineProgress"),
    timelineStart: document.getElementById("timelineStart"),
    timelineEnd: document.getElementById("timelineEnd"),
    summary: document.getElementById("summaryText"),
    copy: document.getElementById("copyBtn"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    history: document.getElementById("historyList"),
    clearHistory: document.getElementById("clearHistoryBtn"),
    introScreen: document.getElementById("introScreen"),
    introVisitor: document.getElementById("introVisitor"),
    introVisitorNumber: document.getElementById("introVisitorNumber"),
    accessCounter: document.getElementById("accessCounter"),
    footerVisitCount: document.getElementById("footerVisitCount"),
    logos: [...document.querySelectorAll(".fcc-logo")]
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
      img.addEventListener("error", () => enableLogoFallback(img), { once: true });
      if (img.complete && (!img.naturalWidth || img.naturalWidth === 0)) {
        enableLogoFallback(img);
      }
    });
  }

  function initIntro() {
    window.setTimeout(() => {
      document.body.classList.remove("intro-playing");
      document.body.classList.add("intro-finished");

      if (el.introScreen) {
        el.introScreen.setAttribute("aria-hidden", "true");
        window.setTimeout(() => {
          el.introScreen.style.display = "none";
        }, 550);
      }
    }, INTRO_DURATION);
  }

  function formatVisitCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return "—";
    return new Intl.NumberFormat("pt-BR").format(number);
  }

  function getSupabaseConfig() {
    const config = window.FCC_CONFIG || {};
    const url = String(config.SUPABASE_URL || "").trim().replace(/\/$/, "");
    const key = String(config.SUPABASE_PUBLISHABLE_KEY || "").trim();

    const invalid =
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) ||
      !key ||
      key.includes("COLE_AQUI");

    if (invalid) return null;
    return { url, key };
  }

  async function callCounterRpc(functionName) {
    const config = getSupabaseConfig();
    if (!config) throw new Error("Supabase não configurado no arquivo config.js.");

    const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        "apikey": config.key,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: "{}",
      cache: "no-store"
    });

    if (!response.ok) {
      let detail = "";
      try { detail = await response.text(); } catch { /* sem corpo */ }
      throw new Error(`Falha no contador (${response.status}) ${detail}`.trim());
    }

    const data = await response.json();
    const value = Number(data);
    if (!Number.isFinite(value)) throw new Error("Resposta inválida do contador.");
    return value;
  }

  function setVisitorNumber(visitorNumber, totalNumber = visitorNumber) {
    if (el.introVisitorNumber) {
      el.introVisitorNumber.textContent = formatVisitCount(visitorNumber);
    }
    if (el.footerVisitCount) {
      el.footerVisitCount.textContent = formatVisitCount(totalNumber);
    }
    el.introVisitor?.classList.remove("is-error");
    el.accessCounter?.classList.remove("is-error");
  }

  function setCounterUnavailable(message = "indisponível") {
    if (el.introVisitorNumber) el.introVisitorNumber.textContent = message;
    if (el.footerVisitCount) el.footerVisitCount.textContent = "—";
    el.introVisitor?.classList.add("is-error");
    el.accessCounter?.classList.add("is-error");
  }

  function readSessionVisitNumber() {
    try {
      const stored = sessionStorage.getItem(VISITOR_SESSION_KEY);
      if (stored && /^\d+$/.test(stored)) return Number(stored);
    } catch {
      // Alguns navegadores podem bloquear sessionStorage.
    }
    return null;
  }

  function storeSessionVisitNumber(value) {
    try {
      sessionStorage.setItem(VISITOR_SESSION_KEY, String(value));
    } catch {
      // Se o navegador bloquear o armazenamento, o contador ainda funciona.
    }
  }

  async function initVisitorCounter() {
    const config = getSupabaseConfig();
    if (!config) {
      setCounterUnavailable("configure o Supabase");
      console.warn("[FCC] Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em config.js.");
      return;
    }

    const sessionVisit = readSessionVisitNumber();

    try {
      if (sessionVisit !== null) {
        // F5 na mesma aba mantém o mesmo número de visitante.
        // O rodapé consulta o total mais atual sem incrementar novamente.
        const currentTotal = await callCounterRpc("get_site_visit_count");
        setVisitorNumber(sessionVisit, currentTotal);
        return;
      }

      // Nova sessão: incrementa de forma atômica e recebe o número atribuído.
      const assignedNumber = await callCounterRpc("register_site_visit");
      storeSessionVisitNumber(assignedNumber);
      setVisitorNumber(assignedNumber, assignedNumber);
    } catch (error) {
      console.error("[FCC] Não foi possível atualizar o contador de acessos:", error);
      setCounterUnavailable();
    }
  }

  function parseTime(value) {
    if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return (hours * 60) + minutes;
  }

  function formatClock(totalMinutes) {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatDurationClock(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatDurationText(totalMinutes) {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return hours === 1 ? "1 hora" : `${hours} horas`;
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }

  function sanitizeDurationPart(input) {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
  }

  function normalizeDurationFields() {
    const hoursRaw = el.durationHours.value.trim();
    const minutesRaw = el.durationMinutes.value.trim();

    el.durationHours.value = String(Math.min(Number(hoursRaw) || 0, 12)).padStart(2, "0");
    el.durationMinutes.value = String(Math.min(Number(minutesRaw) || 0, 59)).padStart(2, "0");
  }

  function getDurationMinutes() {
    const hoursText = el.durationHours.value.trim();
    const minutesText = el.durationMinutes.value.trim();

    if (!/^\d{1,2}$/.test(hoursText) || !/^\d{1,2}$/.test(minutesText)) return null;

    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) return null;

    const total = (hours * 60) + minutes;
    if (total < 1 || total > 720) return null;
    return total;
  }

  function setDurationFields(totalMinutes) {
    const total = Number(totalMinutes);
    el.durationHours.value = String(Math.floor(total / 60)).padStart(2, "0");
    el.durationMinutes.value = String(total % 60).padStart(2, "0");
  }

  function validate() {
    const start = parseTime(el.startTime.value);
    const duration = getDurationMinutes();

    if (start === null) {
      return { ok: false, message: "Informe um horário de início válido." };
    }

    if (duration === null) {
      return { ok: false, message: "Informe uma duração válida entre 00:01 e 12:00." };
    }

    return { ok: true, start, duration };
  }

  function buildResult({ start, duration }) {
    const endAbsolute = start + duration;
    const startClock = formatClock(start);
    const endClock = formatClock(endAbsolute);
    const durationClock = formatDurationClock(duration);
    const crossesDay = endAbsolute >= 1440;

    return {
      start: startClock,
      end: endClock,
      duration,
      durationClock,
      durationText: formatDurationText(duration),
      crossesDay,
      summary: `A prova começa às ${startClock} e possui duração de ${durationClock}. O horário de encerramento é ${endClock}${crossesDay ? " do dia seguinte" : ""}.`
    };
  }

  function render(result, animate = true) {
    lastResult = result;
    el.validation.textContent = "";

    el.endTime.textContent = result.end;
    el.resultStart.textContent = result.start;
    el.resultEnd.textContent = result.end;
    el.durationValue.textContent = result.durationClock;
    el.statusPill.textContent = result.durationClock;
    el.timelineStart.textContent = result.start;
    el.timelineEnd.textContent = result.end;
    el.timelineCaption.textContent = `${result.durationClock} de duração`;
    el.summary.textContent = result.summary;
    el.dayIndicator.classList.toggle("hidden", !result.crossesDay);

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
      button.classList.toggle("active", current !== null && Number(button.dataset.minutes) === current);
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
    toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 2200);
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
      start: result.start,
      duration: result.duration,
      end: result.end,
      savedAt: Date.now()
    };

    const history = loadHistory();
    const duplicate = history.findIndex((item) =>
      item.start === entry.start &&
      Number(item.duration) === entry.duration &&
      item.end === entry.end
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
      const durationClock = formatDurationClock(Number(item.duration));

      button.innerHTML = `
        <span>${item.start} → ${item.end}</span>
        <strong>${item.end}</strong>
        <small>${durationClock} de duração</small>
      `;

      button.addEventListener("click", () => {
        el.startTime.value = item.start;
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

    const text = `Cálculo de duração da prova\nHorário de início: ${lastResult.start}\nDuração: ${lastResult.durationClock} (${lastResult.durationText})\nHorário de encerramento: ${lastResult.end}${lastResult.crossesDay ? " — dia seguinte" : ""}\n\n${lastResult.summary}`;

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

  el.startTime.addEventListener("input", scheduleAutoCalculate);
  el.startTime.addEventListener("change", scheduleAutoCalculate);

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
    el.startTime.value = "10:08";
    setDurationFields(50);
    calculate({ animate: true, save: false });
    el.startTime.focus();
  });

  el.copy.addEventListener("click", copySummary);

  el.clearHistory.addEventListener("click", () => {
    writeHistory([]);
    renderHistory();
    showToast("Histórico limpo.");
  });

  setupLogos();
  initVisitorCounter();
  initIntro();
  setDurationFields(50);
  renderHistory();
  calculate({ animate: false, save: false });
})();
