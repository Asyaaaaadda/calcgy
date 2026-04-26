const mobileMediaQuery = window.matchMedia("(max-width: 760px)");
let mobileCanCalculate = !mobileMediaQuery.matches;

function isMobileViewport() {
    return mobileMediaQuery.matches;
}

function calculate(options = {}) {
    const force = options.force === true;
    if (isMobileViewport() && !mobileCanCalculate && !force) return;

    const parseInput = (id, fallback = 0) => {
        const value = parseFloat(document.getElementById(id).value);
        return Number.isFinite(value) ? value : fallback;
    };

    const safeDivide = (numerator, denominator) => {
        if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
            return 0;
        }
        return numerator / denominator;
    };

    const formatNumber = (value, decimals = 2) => {
        if (!Number.isFinite(value)) return "0";
        return value.toFixed(decimals);
    };

    // 1) Input teori
    const batCapacity = Math.max(parseInput("batCapacity"), 0);
    const batVoltage = Math.max(parseInput("batVoltage"), 0);
    const opVoltage = 3.3;

    const standbyCurrent = Math.max(parseInput("standbyCurrent"), 0);
    const txCurrent = Math.max(parseInput("txCurrent"), 0);
    const airtimeMs = Math.max(parseInput("airtime"), 0);
    const intervalSec = Math.max(parseInput("interval", 1), 1);

    // 2) Input OLED
    let oledTotalJoule = Math.max(parseInput("oledTotal"), 0);

    // 3) Perhitungan teori
    const batJoule = (batCapacity * batVoltage * 3600) / 1000;

    const airtimeSec = airtimeMs / 1000;
    const txAmpere = txCurrent / 1000;
    const energyPerTxJoule = opVoltage * txAmpere * airtimeSec;
    const energyPerTxmJ = energyPerTxJoule * 1000;

    const standbyAmpere = standbyCurrent / 1000;
    const energyStandbyPerHour = opVoltage * standbyAmpere * 3600;
    const txPerHour = safeDivide(3600, intervalSec);
    const energyTxPerHour = txPerHour * energyPerTxJoule;
    const totalEnergyPerHour = energyStandbyPerHour + energyTxPerHour;

    const maxLifeHours = safeDivide(batJoule, totalEnergyPerHour);
    const maxLifeDays = maxLifeHours / 24;

    // 4) Perhitungan real-time
    if (oledTotalJoule > batJoule) oledTotalJoule = batJoule;

    const remainingJoule = Math.max(batJoule - oledTotalJoule, 0);
    const remainingPercent = safeDivide(remainingJoule * 100, batJoule);
    const remainingHours = safeDivide(remainingJoule, totalEnergyPerHour);
    const remainingDays = remainingHours / 24;

    const sfByAirtime = {
        62: "SF7",
        113: "SF8",
        205: "SF9",
        371: "SF10",
        741: "SF11",
        1319: "SF12",
    };
    const detectedSf = sfByAirtime[Math.round(airtimeMs)] || `Airtime ${Math.round(airtimeMs)} ms`;

    // 5) Tampilkan hasil
    document.getElementById("resBatJoule").innerText = Math.round(batJoule).toLocaleString("id-ID");
    document.getElementById("resTxJoule").innerText = formatNumber(energyPerTxmJ, 2);
    document.getElementById("resTotalHour").innerText = formatNumber(totalEnergyPerHour, 2);
    document.getElementById("resMaxDays").innerText = formatNumber(maxLifeDays, 1);
    document.getElementById("resMaxHours").innerText = Math.round(maxLifeHours).toLocaleString("id-ID");

    const percentText = `${formatNumber(remainingPercent, 2)}%`;
    const percentWidth = `${Math.min(Math.max(remainingPercent, 0), 100)}%`;
    const batteryBar = document.getElementById("batteryBar");
    const percentLabel = document.getElementById("resPercent");

    percentLabel.innerText = percentText;
    batteryBar.style.width = percentWidth;

    if (remainingPercent < 20) {
        batteryBar.style.backgroundColor = "#d56a6a";
        percentLabel.style.color = "#d56a6a";
    } else {
        batteryBar.style.backgroundColor = "#4bb089";
        percentLabel.style.color = "#4bb089";
    }

    document.getElementById("resRemainDays").innerText = formatNumber(remainingDays, 1);
    document.getElementById("resRemainHours").innerText = Math.round(remainingHours).toLocaleString("id-ID");

    const sumBattery = document.getElementById("sumBattery");
    const sumLora = document.getElementById("sumLora");
    const sumPerHour = document.getElementById("sumPerHour");
    const sumLifetime = document.getElementById("sumLifetime");

    if (sumBattery) sumBattery.textContent = `${Math.round(batCapacity)} mAh @ ${formatNumber(batVoltage, 1)} V`;
    if (sumLora) sumLora.textContent = `${detectedSf}, ${Math.round(airtimeMs)} ms, interval ${Math.round(intervalSec)} dtk`;
    if (sumPerHour) sumPerHour.textContent = `${formatNumber(totalEnergyPerHour, 2)} J/Jam`;
    if (sumLifetime) sumLifetime.textContent = `${formatNumber(maxLifeDays, 1)} hari (${Math.round(maxLifeHours)} jam)`;

    updateValidationWarnings({
        batCapacity,
        batVoltage,
        standbyCurrent,
        txCurrent,
        airtimeMs,
        intervalSec,
        oledTotalJoule,
        batJoule,
    });
}

function updateValidationWarnings(values) {
    const warnings = [];
    const {
        batCapacity,
        batVoltage,
        standbyCurrent,
        txCurrent,
        airtimeMs,
        intervalSec,
        oledTotalJoule,
        batJoule,
    } = values;

    if (batCapacity < 500 || batCapacity > 50000) {
        warnings.push("Kapasitas baterai di luar rentang umum (500-50000 mAh). Pastikan nilai sesuai spesifikasi perangkat.");
    }
    if (batVoltage < 3.0 || batVoltage > 4.2) {
        warnings.push("Tegangan baterai di luar rentang tipikal Lithium (3.0-4.2V). Rekomendasi awal: 3.7V.");
    }
    if (standbyCurrent < 20 || standbyCurrent > 200) {
        warnings.push("Arus standby tampak tidak umum. Nilai rujukan node ESP32 biasanya sekitar 40-90 mA.");
    }
    if (txCurrent < 60 || txCurrent > 250) {
        warnings.push("Arus transmisi tampak tidak umum. Untuk SX1276 sekitar 20 dBm, biasanya 105-130 mA.");
    }
    if (airtimeMs < 20 || airtimeMs > 3000) {
        warnings.push("Airtime di luar rentang praktik umum LoRa. Pastikan sesuai SF, bandwidth, dan payload Anda.");
    }
    if (intervalSec < 2) {
        warnings.push("Interval kirim sangat rapat (<2 detik) dan dapat mempercepat habisnya baterai secara signifikan.");
    }
    if (oledTotalJoule > batJoule && batJoule > 0) {
        warnings.push("Energi total OLED melebihi kapasitas baterai teoritis. Nilai akan dibatasi otomatis untuk mencegah hasil negatif.");
    }

    const box = document.getElementById("validationBox");
    const list = document.getElementById("validationList");
    if (!box || !list) return;

    list.innerHTML = "";
    warnings.forEach((warning) => {
        const li = document.createElement("li");
        li.textContent = warning;
        list.appendChild(li);
    });

    box.hidden = warnings.length === 0;
}

function syncSfDropdownWithAirtime() {
    const airtimeInput = document.getElementById("airtime");
    const sfPreset = document.getElementById("sfPreset");
    if (!airtimeInput || !sfPreset) return;

    const currentAirtime = Math.round(parseFloat(airtimeInput.value) || 0);
    const knownValues = [62, 113, 205, 371, 741, 1319];
    sfPreset.value = knownValues.includes(currentAirtime) ? String(currentAirtime) : "custom";
}

function setupSfDropdown() {
    const airtimeInput = document.getElementById("airtime");
    const sfPreset = document.getElementById("sfPreset");
    if (!airtimeInput || !sfPreset) return;

    sfPreset.addEventListener("change", () => {
        if (sfPreset.value !== "custom") {
            airtimeInput.value = sfPreset.value;
            calculate();
        }
    });

    airtimeInput.addEventListener("input", syncSfDropdownWithAirtime);
    syncSfDropdownWithAirtime();
}

function setupUtilityButtons() {
    const enterButton = document.getElementById("mobileEnter");
    const printButton = document.getElementById("printSummary");

    if (enterButton) {
        enterButton.addEventListener("click", () => {
            mobileCanCalculate = true;
            calculate({ force: true });

            const resultPanel = document.getElementById("hasil");
            if (resultPanel) resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    if (printButton) {
        printButton.addEventListener("click", () => {
            window.print();
        });
    }
}

function setupMobileEnterMode() {
    const fields = document.querySelectorAll("input, select");

    fields.forEach((field) => {
        const markDirty = () => {
            if (isMobileViewport()) {
                mobileCanCalculate = false;
            }
        };

        field.addEventListener("input", markDirty);
        field.addEventListener("change", markDirty);
    });

    mobileMediaQuery.addEventListener("change", (event) => {
        mobileCanCalculate = !event.matches;
        if (!event.matches) {
            calculate({ force: true });
        }
    });
}

function setupTheoryToggle() {
    const resultPanel = document.getElementById("hasil");
    const toggleButton = document.getElementById("theoryToggle");
    if (!resultPanel || !toggleButton) return;

    const applyState = (collapsed) => {
        resultPanel.classList.toggle("theory-collapsed", collapsed);
        toggleButton.setAttribute("aria-expanded", String(!collapsed));
        toggleButton.textContent = collapsed ? "Tampilkan Hasil Teori" : "Sembunyikan Hasil Teori";
    };

    const media = window.matchMedia("(max-width: 760px)");
    applyState(media.matches);

    toggleButton.addEventListener("click", () => {
        applyState(!resultPanel.classList.contains("theory-collapsed"));
    });

    media.addEventListener("change", (event) => {
        applyState(event.matches);
    });
}

function setupMobileTooltips() {
    const wraps = document.querySelectorAll(".help-wrap");
    if (wraps.length === 0) return;

    const closeAll = () => {
        wraps.forEach((wrap) => wrap.classList.remove("is-open"));
    };

    wraps.forEach((wrap) => {
        const icon = wrap.querySelector(".help-icon");
        if (!icon) return;

        icon.addEventListener("click", (event) => {
            if (!window.matchMedia("(max-width: 760px)").matches) return;
            event.preventDefault();
            const shouldOpen = !wrap.classList.contains("is-open");
            closeAll();
            if (shouldOpen) wrap.classList.add("is-open");
        });
    });

    document.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest(".help-wrap")) return;
        closeAll();
    });

    window.addEventListener("scroll", closeAll, { passive: true });
}

window.onload = () => {
    setupSfDropdown();
    setupUtilityButtons();
    setupMobileEnterMode();
    setupTheoryToggle();
    setupMobileTooltips();

    if (!isMobileViewport()) {
        calculate({ force: true });
    }
};
