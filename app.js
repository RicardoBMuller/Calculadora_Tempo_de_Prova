(() => {
  "use strict";

  const HISTORY_KEY = "fcc_exam_time_history_single_v1";
  const MAX_HISTORY = 5;
  const INTRO_DURATION = 4000;
  const OCR_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
  const OCR_MAX_UPLOAD_BYTES = 900 * 1024;
  const OCR_DIMENSION_STEPS = [1800, 1600, 1400, 1200, 1000];
  const OCR_QUALITY_STEPS = [0.88, 0.80, 0.72, 0.64, 0.56];

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
    logos: [...document.querySelectorAll(".fcc-logo")],

    photoInput: document.getElementById("examPhotoInput"),
    takePhoto: document.getElementById("takePhotoBtn"),
    aiModal: document.getElementById("aiModal"),
    aiModalBackdrop: document.getElementById("aiModalBackdrop"),
    aiModalClose: document.getElementById("aiModalClose"),
    aiLoadingState: document.getElementById("aiLoadingState"),
    aiConfirmState: document.getElementById("aiConfirmState"),
    aiErrorState: document.getElementById("aiErrorState"),
    aiPhotoPreview: document.getElementById("aiPhotoPreview"),
    aiStartTime: document.getElementById("aiStartTime"),
    aiDuration: document.getElementById("aiDuration"),
    aiCardEnd: document.getElementById("aiCardEnd"),
    aiMinimumStay: document.getElementById("aiMinimumStay"),
    aiConfidence: document.getElementById("aiConfidence"),
    aiObservation: document.getElementById("aiObservation"),
    aiValidation: document.getElementById("aiValidation"),
    aiRetry: document.getElementById("aiRetryBtn"),
    aiConfirm: document.getElementById("aiConfirmBtn"),
    aiErrorRetry: document.getElementById("aiErrorRetryBtn"),
    aiErrorMessage: document.getElementById("aiErrorMessage"),
    ocrRawText: document.getElementById("ocrRawText"),
    ocrRawDetails: document.getElementById("ocrRawDetails")
  };

  let lastResult = null;
  let toastTimer = null;
  let autoTimer = null;
  let lastAiImageDataUrl = "";

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
    toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 2400);
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

  // =========================================================
  // IA / CÂMERA
  // =========================================================

  function getOcrConfig() {
    const cfg = window.FCC_CONFIG || {};
    const key = String(cfg.OCRSPACE_API_KEY || "").trim();
    const endpoint = String(cfg.OCRSPACE_ENDPOINT || "https://api.ocr.space/parse/image").trim();
    const engine = String(cfg.OCRSPACE_ENGINE || "3").trim();

    return {
      key,
      endpoint,
      engine,
      configured: Boolean(key && !key.includes("COLE_AQUI"))
    };
  }

  function openAiModal(state = "loading") {
    el.aiModal.classList.add("open");
    el.aiModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    setAiState(state);
  }

  function closeAiModal() {
    el.aiModal.classList.remove("open");
    el.aiModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    el.aiValidation.textContent = "";
  }

  function setAiState(state) {
    el.aiLoadingState.classList.toggle("hidden", state !== "loading");
    el.aiConfirmState.classList.toggle("hidden", state !== "confirm");
    el.aiErrorState.classList.toggle("hidden", state !== "error");
  }

  function requestPhoto() {
    el.photoInput.value = "";
    el.photoInput.setAttribute("capture", "environment");
    el.photoInput.click();
  }

  async function loadImageSource(file) {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Selecione uma imagem válida.");
    }

    if (file.size > OCR_MAX_SOURCE_BYTES) {
      throw new Error("A foto original é muito grande. Tire uma nova foto com resolução menor.");
    }

    if ("createImageBitmap" in window) {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.()
        };
      } catch {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.()
        };
      }
    }

    const objectUrl = URL.createObjectURL(file);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível abrir esta imagem."));
      img.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl)
    };
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Não foi possível preparar a prévia da foto."));
      reader.readAsDataURL(blob);
    });
  }

  async function imageFileToOcrJpeg(file) {
    const loaded = await loadImageSource(file);
    const { source, width, height, cleanup } = loaded;

    try {
      if (!width || !height) {
        throw new Error("A imagem não possui dimensões válidas.");
      }

      let bestBlob = null;

      for (let step = 0; step < OCR_DIMENSION_STEPS.length; step += 1) {
        const maxDimension = OCR_DIMENSION_STEPS[step];
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Seu navegador não conseguiu preparar a foto.");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

        const quality = OCR_QUALITY_STEPS[Math.min(step, OCR_QUALITY_STEPS.length - 1)];
        const blob = await canvasToJpegBlob(canvas, quality);
        if (!blob) continue;

        bestBlob = blob;
        if (blob.size <= OCR_MAX_UPLOAD_BYTES) break;
      }

      if (!bestBlob) {
        throw new Error("Não foi possível compactar a foto.");
      }

      if (bestBlob.size > OCR_MAX_UPLOAD_BYTES) {
        throw new Error("A foto ainda ficou acima do limite do OCR.Space. Aproxime o cartão e tente novamente.");
      }

      return {
        blob: bestBlob,
        previewDataUrl: await blobToDataUrl(bestBlob),
        sizeBytes: bestBlob.size
      };
    } finally {
      cleanup();
    }
  }

  function normalizeAiClock(value) {
    if (value === null || value === undefined) return "";
    let text = String(value).trim().toLowerCase();
    if (!text) return "";

    text = text.replace(/\s/g, "").replace(/[h\.]/g, ":");
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return "";
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function durationStringToMinutes(value) {
    if (value === null || value === undefined) return null;
    let text = String(value).trim().toLowerCase();
    if (!text) return null;

    text = text.replace(/\s/g, "");

    if (/^\d{1,3}min$/.test(text)) {
      const total = Number(text.replace("min", ""));
      return total >= 1 && total <= 720 ? total : null;
    }

    text = text.replace("horas", "h").replace("hora", "h");
    const hPattern = text.match(/^(\d{1,2})h(?:(\d{1,2}))?$/);
    if (hPattern) {
      const hours = Number(hPattern[1]);
      const minutes = Number(hPattern[2] || 0);
      const total = (hours * 60) + minutes;
      return minutes <= 59 && total >= 1 && total <= 720 ? total : null;
    }

    const colonPattern = text.match(/^(\d{1,2}):(\d{2})$/);
    if (colonPattern) {
      const hours = Number(colonPattern[1]);
      const minutes = Number(colonPattern[2]);
      const total = (hours * 60) + minutes;
      return minutes <= 59 && total >= 1 && total <= 720 ? total : null;
    }

    return null;
  }

  function confidenceLabel(value) {
    const key = String(value || "").toLowerCase();
    if (key === "alta") return "Alta";
    if (key === "media" || key === "média") return "Média";
    if (key === "baixa") return "Baixa — confira com atenção";
    return "Não informada";
  }

  function flattenOcrError(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(" • ");
    if (value === null || value === undefined) return "";
    return String(value);
  }

  async function callOcrSpace(imageBlob) {
    const cfg = getOcrConfig();

    if (!cfg.configured) {
      throw new Error("OCR.Space ainda não foi configurado. Abra config.js e cole sua OCRSPACE_API_KEY.");
    }

    const formData = new FormData();
    formData.append("file", imageBlob, "cartao-fcc.jpg");
    formData.append("apikey", cfg.key);
    formData.append("OCREngine", cfg.engine || "3");
    formData.append("language", "auto");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("isTable", "true");

    const response = await fetch(cfg.endpoint, {
      method: "POST",
      body: formData
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(`OCR.Space respondeu com erro HTTP ${response.status}.`);
    }

    if (!payload) {
      throw new Error("OCR.Space não retornou uma resposta JSON válida.");
    }

    if (payload.IsErroredOnProcessing) {
      const message = flattenOcrError(payload.ErrorMessage) || flattenOcrError(payload.ErrorDetails);
      throw new Error(message || "OCR.Space não conseguiu processar a imagem.");
    }

    const parsedResults = Array.isArray(payload.ParsedResults) ? payload.ParsedResults : [];
    const parsedText = parsedResults
      .map((result) => String(result?.ParsedText || "").trim())
      .filter(Boolean)
      .join("\n");

    if (!parsedText) {
      const details = parsedResults
        .map((result) => flattenOcrError(result?.ErrorMessage) || flattenOcrError(result?.ErrorDetails))
        .filter(Boolean)
        .join(" • ");
      throw new Error(details || "O OCR não encontrou texto legível na foto.");
    }

    console.debug("[FCC OCR] Texto reconhecido:", parsedText);
    return parsedText;
  }

  function stripDiacritics(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function cleanOcrLine(value) {
    return String(value || "")
      .replace(/[|_*#`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeOcrDigits(value) {
    return String(value || "")
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1");
  }

  function findTimeToken(text, { duration = false } = {}) {
    const source = String(text || "");

    // IMPORTANTE: não converte a linha inteira (ex.: "Início" -> "1níci0").
    // Só aceitamos O/I/l como possíveis dígitos DENTRO do token do horário.
    // Isso evita o erro que transformava "Início: 09 : 12" em "00:09".
    const pattern = /(?:^|[^A-Za-zÀ-ÿ0-9])([0-9OoIl|]{1,2})\s*(?:h|H|:|\.|;)\s*([0-9OoIl|]{1,2})(?![A-Za-zÀ-ÿ0-9])/g;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const hourToken = normalizeOcrDigits(match[1]);
      const minuteToken = normalizeOcrDigits(match[2]);
      if (!/^\d{1,2}$/.test(hourToken) || !/^\d{1,2}$/.test(minuteToken)) continue;

      const hours = Number(hourToken);
      const minutes = Number(minuteToken);
      if (minutes > 59) continue;

      if (duration) {
        const total = (hours * 60) + minutes;
        if (total >= 1 && total <= 720) return formatDurationClock(total);
      } else if (hours <= 23) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }
    }

    if (duration) {
      const hourOnlyPattern = /(?:^|[^A-Za-zÀ-ÿ0-9])([0-9OoIl|]{1,2})\s*h(?:[^A-Za-zÀ-ÿ0-9]|$)/i;
      const hourOnly = source.match(hourOnlyPattern);
      if (hourOnly) {
        const hours = Number(normalizeOcrDigits(hourOnly[1]));
        const total = hours * 60;
        if (Number.isFinite(total) && total >= 1 && total <= 720) {
          return formatDurationClock(total);
        }
      }
    }

    return "";
  }

  function findValueNearLabel(lines, labelRegex, { duration = false, lookAhead = 3 } = {}) {
    for (let i = 0; i < lines.length; i += 1) {
      const searchable = stripDiacritics(lines[i]).toLowerCase();
      if (!labelRegex.test(searchable)) continue;

      const candidates = [lines[i]];
      for (let offset = 1; offset <= lookAhead && i + offset < lines.length; offset += 1) {
        candidates.push(lines[i + offset]);
      }

      for (const candidate of candidates) {
        const value = findTimeToken(candidate, { duration });
        if (value) return { value, anchored: true, lineIndex: i };
      }
    }

    return { value: "", anchored: false, lineIndex: -1 };
  }

  function findStartFallback(lines) {
    const startIndex = lines.findIndex((line) => /\binicio\b/i.test(stripDiacritics(line)));
    const endIndex = lines.findIndex((line, index) => index > startIndex && /\btermino\b/i.test(stripDiacritics(line)));

    if (startIndex >= 0) {
      const limit = endIndex > startIndex ? Math.min(endIndex + 1, startIndex + 5) : Math.min(lines.length, startIndex + 5);
      for (let i = startIndex; i < limit; i += 1) {
        const value = findTimeToken(lines[i], { duration: false });
        if (value) return value;
      }
    }

    return "";
  }

  function minutesBetweenClockValues(a, b) {
    const aMin = parseTime(a);
    const bMin = parseTime(b);
    if (aMin === null || bMin === null) return null;
    let diff = Math.abs(aMin - bMin);
    if (diff > 720) diff = 1440 - diff;
    return diff;
  }

  function subtractDurationFromClock(clock, durationMinutes) {
    const end = parseTime(clock);
    if (end === null || !Number.isFinite(durationMinutes)) return "";
    return formatClock(end - durationMinutes);
  }

  function parseOcrFields(rawText) {
    const lines = String(rawText || "")
      .split(/\r?\n/)
      .map(cleanOcrLine)
      .filter(Boolean);

    const durationResult = findValueNearLabel(
      lines,
      /duracao(?:\s+da)?\s+prova|duracao/,
      { duration: true, lookAhead: 1 }
    );

    const startResult = findValueNearLabel(
      lines,
      /\binicio\b/,
      { duration: false, lookAhead: 1 }
    );

    const endResult = findValueNearLabel(
      lines,
      /\btermino\b|\bfim\b|encerramento/,
      { duration: false, lookAhead: 1 }
    );

    const minimumResult = findValueNearLabel(
      lines,
      /permanencia(?:\s+minima)?|minima/,
      { duration: true, lookAhead: 1 }
    );

    let inicio = startResult.value || findStartFallback(lines);
    let duracao = durationResult.value;
    const terminoCartao = normalizeAiClock(endResult.value);
    const permanenciaMinima = minimumResult.value;

    if (!duracao) {
      for (const line of lines) {
        const searchable = stripDiacritics(line).toLowerCase();
        if (!searchable.includes("duracao") && !searchable.includes("prova")) continue;
        const value = findTimeToken(line, { duration: true });
        if (value) {
          duracao = value;
          break;
        }
      }
    }

    inicio = normalizeAiClock(inicio);
    const durationMinutes = durationStringToMinutes(duracao);

    // Validação cruzada muito útil para este cartão da FCC:
    // quando OCR reconhece "Término" e "Duração", calculamos qual DEVERIA ser o início.
    // Ex.: Término 10:02 - Duração 00:50 = Início 09:12.
    let inicioDerivado = "";
    let inicioFoiCorrigido = false;
    if (terminoCartao && durationMinutes !== null) {
      inicioDerivado = subtractDurationFromClock(terminoCartao, durationMinutes);
      if (!inicio) {
        inicio = inicioDerivado;
        inicioFoiCorrigido = true;
      } else {
        const difference = minutesBetweenClockValues(inicio, inicioDerivado);
        if (difference !== null && difference > 1 && endResult.anchored && durationResult.anchored) {
          inicio = inicioDerivado;
          inicioFoiCorrigido = true;
        }
      }
    }

    const foundCount = [inicio, duracao].filter(Boolean).length;
    let confianca = "baixa";
    if (foundCount === 2 && startResult.anchored && durationResult.anchored) confianca = "alta";
    else if (foundCount === 2) confianca = "media";

    // Se início + duração fecham exatamente com o término do cartão, aumentamos a confiança.
    let validacaoTermino = false;
    if (inicio && durationMinutes !== null && terminoCartao) {
      const calcEnd = formatClock(parseTime(inicio) + durationMinutes);
      validacaoTermino = calcEnd === terminoCartao;
      if (validacaoTermino) confianca = "alta";
    }

    let observacao = "Confira os valores reconhecidos antes de calcular.";
    if (inicioFoiCorrigido && terminoCartao && duracao) {
      observacao = `O horário de início foi validado pelo término do cartão: ${terminoCartao} − ${duracao} = ${inicio}.`;
    } else if (validacaoTermino) {
      observacao = `Leitura validada: ${inicio} + ${duracao} = ${terminoCartao}, igual ao término preenchido no cartão.`;
    } else if (!inicio && duracao) {
      observacao = "A duração foi encontrada, mas o horário de início manuscrito não ficou legível. Preencha-o manualmente.";
    } else if (inicio && !duracao) {
      observacao = "O horário de início foi encontrado, mas a duração não ficou legível. Preencha-a manualmente.";
    } else if (!inicio && !duracao) {
      observacao = "Os campos principais não foram identificados. Tente aproximar a câmera e evitar reflexos.";
    }

    return {
      inicio,
      duracao,
      termino_cartao: terminoCartao || "Não identificado",
      permanencia_minima: permanenciaMinima || "Não identificada",
      confianca,
      observacao,
      texto_extraido: rawText
    };
  }

  function renderAiConfirmation(data) {
    const start = normalizeAiClock(data.inicio);
    const durationMinutes = durationStringToMinutes(data.duracao);

    el.aiStartTime.value = start;
    el.aiDuration.value = durationMinutes ? formatDurationClock(durationMinutes) : "";
    if (el.aiCardEnd) el.aiCardEnd.textContent = data.termino_cartao || "Não identificado";
    el.aiMinimumStay.textContent = data.permanencia_minima || "Não identificada";
    el.aiConfidence.textContent = confidenceLabel(data.confianca);
    el.aiObservation.textContent = data.observacao || "Confira os dados reconhecidos antes de calcular.";
    if (el.ocrRawText) el.ocrRawText.textContent = data.texto_extraido || "";
    if (el.ocrRawDetails) el.ocrRawDetails.open = false;
    el.aiValidation.textContent = "";
    setAiState("confirm");
  }

  function showAiError(error) {
    const message = error instanceof Error ? error.message : "Não foi possível analisar a foto.";
    el.aiErrorMessage.textContent = message;
    setAiState("error");
  }

  async function analyzeSelectedPhoto(file) {
    openAiModal("loading");

    try {
      const prepared = await imageFileToOcrJpeg(file);
      lastAiImageDataUrl = prepared.previewDataUrl;
      el.aiPhotoPreview.src = lastAiImageDataUrl;

      const rawText = await callOcrSpace(prepared.blob);
      const data = parseOcrFields(rawText);

      const hasAnyUsefulData = Boolean(normalizeAiClock(data.inicio)) || durationStringToMinutes(data.duracao) !== null;
      if (!hasAnyUsefulData) {
        throw new Error(data.observacao || "O OCR não conseguiu identificar o horário de início nem a duração.");
      }

      renderAiConfirmation(data);
    } catch (error) {
      showAiError(error);
    }
  }

  function confirmAiData() {
    const start = normalizeAiClock(el.aiStartTime.value);
    const durationMinutes = durationStringToMinutes(el.aiDuration.value);

    if (!start) {
      el.aiValidation.textContent = "Confira e informe um horário de início válido.";
      el.aiStartTime.focus();
      return;
    }

    if (durationMinutes === null) {
      el.aiValidation.textContent = "Confira e informe uma duração válida, por exemplo 01:00.";
      el.aiDuration.focus();
      return;
    }

    el.aiValidation.textContent = "";
    el.startTime.value = start;
    setDurationFields(durationMinutes);
    const result = calculate({ animate: true, save: true });
    closeAiModal();

    if (result) {
      showToast("Dados da foto aplicados com sucesso.");
      window.setTimeout(() => {
        el.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  function setupAiPhotoReader() {
    el.takePhoto.addEventListener("click", requestPhoto);

    el.photoInput.addEventListener("change", () => {
      const file = el.photoInput.files?.[0];
      if (file) analyzeSelectedPhoto(file);
    });

    el.aiModalClose.addEventListener("click", closeAiModal);
    el.aiModalBackdrop.addEventListener("click", closeAiModal);
    el.aiConfirm.addEventListener("click", confirmAiData);

    el.aiRetry.addEventListener("click", () => {
      closeAiModal();
      window.setTimeout(requestPhoto, 120);
    });

    el.aiErrorRetry.addEventListener("click", () => {
      closeAiModal();
      window.setTimeout(requestPhoto, 120);
    });

    el.aiDuration.addEventListener("input", () => {
      let value = el.aiDuration.value.replace(/[^0-9:]/g, "").slice(0, 5);
      if (/^\d{2}$/.test(value) && !value.includes(":")) value += ":";
      el.aiDuration.value = value;
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && el.aiModal.classList.contains("open")) {
        closeAiModal();
      }
    });
  }

  // =========================================================
  // EVENTOS PRINCIPAIS
  // =========================================================

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
  initIntro();
  setupAiPhotoReader();
  setDurationFields(50);
  renderHistory();
  calculate({ animate: false, save: false });
})();
