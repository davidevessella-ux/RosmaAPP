// MODELLO DATI
let produzioniPeriodo = [];
let storicoFatture = [];
let archivioProduzioni = [];
let prezzoKgCorrente = 5.50;
const IVA_FISSA = 4;

// DOM elementi
const datePicker = document.getElementById('datePicker');
const kgInput = document.getElementById('kgInput');
const addBtn = document.getElementById('addRecordBtn');
const tableBody = document.getElementById('tableBody');
const totalKgDaFatturareSpan = document.getElementById('totalKgDaFatturare');
const imponibileDisplay = document.getElementById('imponibileDisplay');
const ivaAmountDisplay = document.getElementById('ivaAmountDisplay');
const totalInvoiceDisplay = document.getElementById('totalInvoiceDisplay');
const pricePerKgInput = document.getElementById('pricePerKg');
const aggiornaCalcoliBtn = document.getElementById('aggiornaCalcoliBtn');
const apriSimulazioneBtn = document.getElementById('apriSimulazioneBtn');
const fattureListContainer = document.getElementById('fattureListContainer');
const cancellaTutteFattureBtn = document.getElementById('cancellaTutteFattureBtn');

// Modale fattura
const modal = document.getElementById('fatturaModal');
const modalInvoiceNumber = document.getElementById('modalInvoiceNumber');
const modalInvoiceDate = document.getElementById('modalInvoiceDate');
const modalKgTotali = document.getElementById('modalKgTotali');
const modalPrezzoKg = document.getElementById('modalPrezzoKg');
const modalTotaleCalcolato = document.getElementById('modalTotaleCalcolato');
const confermaFatturaModaleBtn = document.getElementById('confermaFatturaModaleBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const annullaModaleBtn = document.getElementById('annullaModaleBtn');

// Messaggi
const messageOverlay = document.getElementById('messageOverlay');
const msgIcon = document.getElementById('msgIcon');
const msgText = document.getElementById('msgText');
const msgSub = document.getElementById('msgSub');

// Charts
let currentYearKgChart, currentYearEurosChart, fullHistoryChart;

// Funzioni messaggi
function showMessage(type) {
    if (type === 'harvest') {
        msgIcon.innerHTML = '🌿💪';
        msgText.innerHTML = 'Ottimo lavoro Stefano!<br>Sei un mostro';
        msgSub.innerHTML = 'Continua così con il rosmarino';
    } else if (type === 'invoice') {
        msgIcon.innerHTML = '📄💰';
        msgText.innerHTML = 'Rita ti tornano i conti?';
        msgSub.innerHTML = 'Fattura salvata correttamente';
    }
    messageOverlay.classList.add('active');
}

function hideMessage() {
    messageOverlay.classList.remove('active');
}
messageOverlay.addEventListener('click', hideMessage);

function setDefaultDate() {
    if (!datePicker.value) datePicker.value = new Date().toISOString().slice(0, 10);
}

// Salvataggi
function salvaPeriodo() { localStorage.setItem('rosmarino_produzioni_periodo', JSON.stringify(produzioniPeriodo)); }
function salvaArchivio() { localStorage.setItem('rosmarino_archivio_produzioni_totali', JSON.stringify(archivioProduzioni)); }
function salvaFatture() { localStorage.setItem('rosmarino_storico_fatture', JSON.stringify(storicoFatture)); }
function salvaPrezzo() { localStorage.setItem('rosmarino_prezzoKg', prezzoKgCorrente); }

function loadAllData() {
    produzioniPeriodo = JSON.parse(localStorage.getItem('rosmarino_produzioni_periodo') || '[]');
    archivioProduzioni = JSON.parse(localStorage.getItem('rosmarino_archivio_produzioni_totali') || '[]');
    storicoFatture = JSON.parse(localStorage.getItem('rosmarino_storico_fatture') || '[]');
    prezzoKgCorrente = parseFloat(localStorage.getItem('rosmarino_prezzoKg') || '5.50');
    pricePerKgInput.value = prezzoKgCorrente;
    if (archivioProduzioni.length === 0 && produzioniPeriodo.length > 0) {
        archivioProduzioni = [...produzioniPeriodo];
        salvaArchivio();
    }
    refreshAll();
}

// Aggiungi raccolto
function addRecord() {
    let data = datePicker.value;
    if (!data) { alert("Seleziona data"); return; }
    let kg = parseFloat(kgInput.value);
    if (isNaN(kg) || kg <= 0) { alert("Inserisci kg validi"); return; }
    kg = Math.round(kg * 100) / 100;

    const idx = produzioniPeriodo.findIndex(p => p.date === data);
    if (idx !== -1) {
        if (confirm(`Data ${data} già presente, sovrascrivere?`)) {
            const old = produzioniPeriodo[idx].kg;
            archivioProduzioni = archivioProduzioni.filter(p => !(p.date === data && Math.abs(p.kg - old) < 0.001));
            produzioniPeriodo[idx].kg = kg;
            archivioProduzioni.push({ date: data, kg });
            salvaArchivio(); salvaPeriodo();
            showMessage('harvest');
        }
    } else {
        produzioniPeriodo.push({ date: data, kg });
        archivioProduzioni.push({ date: data, kg });
        salvaArchivio(); salvaPeriodo();
        showMessage('harvest');
    }

    produzioniPeriodo.sort((a, b) => a.date.localeCompare(b.date));
    archivioProduzioni.sort((a, b) => a.date.localeCompare(b.date));
    kgInput.value = ''; setDefaultDate();
    refreshAll();
}

// Elimina record
function deleteRecord(idx) {
    if (confirm("Elimina produzione?")) {
        const rem = produzioniPeriodo[idx];
        archivioProduzioni = archivioProduzioni.filter(p => !(p.date === rem.date && Math.abs(p.kg - rem.kg) < 0.001));
        produzioniPeriodo.splice(idx, 1);
        salvaPeriodo(); salvaArchivio();
        refreshAll();
    }
}

// Modifica record
function editRecord(idx, newKg) {
    if (isNaN(newKg) || newKg <= 0) { alert("Kg non valido"); return false; }
    newKg = Math.round(newKg * 100) / 100;
    const oldRec = produzioniPeriodo[idx];
    archivioProduzioni = archivioProduzioni.filter(p => !(p.date === oldRec.date && Math.abs(p.kg - oldRec.kg) < 0.001));
    produzioniPeriodo[idx].kg = newKg;
    archivioProduzioni.push({ date: oldRec.date, kg: newKg });
    archivioProduzioni.sort((a, b) => a.date.localeCompare(b.date));
    salvaPeriodo(); salvaArchivio();
    refreshAll();
    return true;
}

function getTotalKgPeriodo() {
    return produzioniPeriodo.reduce((s, p) => s + p.kg, 0);
}

function aggiornaRiepilogo() {
    const tot = getTotalKgPeriodo();
    const imp = tot * prezzoKgCorrente;
    const iva = imp * IVA_FISSA / 100;
    totalKgDaFatturareSpan.innerText = tot.toFixed(2);
    imponibileDisplay.innerText = imp.toFixed(2) + ' €';
    ivaAmountDisplay.innerText = iva.toFixed(2) + ' €';
    totalInvoiceDisplay.innerText = (imp + iva).toFixed(2) + ' €';
}

function aggiornaParametri() {
    let np = parseFloat(pricePerKgInput.value);
    if (!isNaN(np) && np >= 0) prezzoKgCorrente = np;
    pricePerKgInput.value = prezzoKgCorrente;
    salvaPrezzo();
    aggiornaRiepilogo();
    updateAllCharts();
}

// Modale fattura
function apriModal() {
    let tot = getTotalKgPeriodo();
    if (tot === 0) { alert("Nessun kg da fatturare."); return; }
    modalKgTotali.value = tot.toFixed(2) + " kg";
    modalPrezzoKg.value = prezzoKgCorrente;
    modalInvoiceDate.value = new Date().toISOString().slice(0, 10);
    let prossimo = storicoFatture.length + 1;
    modalInvoiceNumber.value = `${prossimo}/${new Date().getFullYear()}`;
    calcolaAnteprimaModal();
    modal.style.display = "flex";
}

function calcolaAnteprimaModal() {
    let kg = getTotalKgPeriodo();
    let prezzo = parseFloat(modalPrezzoKg.value);
    if (isNaN(prezzo)) prezzo = prezzoKgCorrente;
    let imp = kg * prezzo;
    let tot = imp + (imp * IVA_FISSA / 100);
    modalTotaleCalcolato.value = `${imp.toFixed(2)} € + IVA 4% = ${tot.toFixed(2)} €`;
}

function confermaFattura() {
    let num = modalInvoiceNumber.value.trim();
    let data = modalInvoiceDate.value;
    if (!num || !data) { alert("Compila numero e data"); return; }
    let totKg = getTotalKgPeriodo();
    if (totKg === 0) return;
    let prezzoUsato = parseFloat(modalPrezzoKg.value);
    if (isNaN(prezzoUsato) || prezzoUsato <= 0) prezzoUsato = prezzoKgCorrente;
    let imponibile = totKg * prezzoUsato;
    let ivaVal = imponibile * IVA_FISSA / 100;
    let totale = imponibile + ivaVal;

    storicoFatture.push({
        numero: num,
        data: data,
        kgTotali: totKg,
        prezzoKg: prezzoUsato,
        imponibile: imponibile,
        iva: ivaVal,
        totale: totale,
        ivaPercentuale: IVA_FISSA
    });
    salvaFatture();
    produzioniPeriodo = [];
    salvaPeriodo();
    refreshAll();
    modal.style.display = "none";
    showMessage('invoice');
}

function chiudiModal() { modal.style.display = "none"; }
function cancellaFatture() {
    if (confirm("Eliminare tutto storico?")) {
        storicoFatture = [];
        salvaFatture();
        refreshAll();
    }
}

// Render tabella
function renderTable() {
    if (produzioniPeriodo.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nessuna produzione</td></tr>';
        return;
    }
    let html = '';
    produzioniPeriodo.forEach((p, idx) => {
        html += `<tr>
                    <td>${formatItalian(p.date)}</td>
                    <td><span class="badge-kg" id="spanKg-${idx}">${p.kg.toFixed(2)} kg</span><input id="editIn-${idx}" type="number" step="any" value="${p.kg.toFixed(2)}" style="display:none; width:65px; border-radius:40px; padding:5px;"></td>
                    <td><button class="action-btn edit" data-edit="${idx}"><i class="fas fa-pen"></i></button> <button class="action-btn delete" data-del="${idx}"><i class="fas fa-trash"></i></button></td>
                 </tr>`;
    });
    tableBody.innerHTML = html;

    for (let i = 0; i < produzioniPeriodo.length; i++) {
        document.querySelector(`[data-edit="${i}"]`)?.addEventListener('click', () => {
            const span = document.getElementById(`spanKg-${i}`), inp = document.getElementById(`editIn-${i}`);
            span.style.display = 'none'; inp.style.display = 'inline-block'; inp.focus();
            const save = () => { let val = parseFloat(inp.value); if (!isNaN(val) && val > 0) editRecord(i, val); else refreshAll(); };
            inp.onblur = save; inp.onkeypress = (e) => { if (e.key === 'Enter') save(); };
        });
        document.querySelector(`[data-del="${i}"]`)?.addEventListener('click', () => deleteRecord(i));
    }
}

function renderFatture() {
    if (storicoFatture.length === 0) {
        fattureListContainer.innerHTML = '<p style="text-align:center;">📭 Nessuna fattura emessa</p>';
        return;
    }
    let h = '';
    [...storicoFatture].reverse().forEach(f => {
        h += `<div class="invoice-item"><strong>🧾 Fatt. ${f.numero}</strong> · ${f.data}<br>Kg: ${f.kgTotali.toFixed(2)} · Prezzo: ${f.prezzoKg.toFixed(2)} €/kg<br>Totale: <b>${f.totale.toFixed(2)} €</b> (IVA 4%)</div>`;
    });
    fattureListContainer.innerHTML = h;
}

function formatItalian(d) {
    let [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
}

// Grafici
function getCurrentYear() { return new Date().getFullYear(); }
function filterByYear(arr, year) { return arr.filter(p => p.date.startsWith(year.toString())); }
function monthlyAggregate(dataArr) {
    let months = new Array(12).fill(0);
    dataArr.forEach(p => { let m = parseInt(p.date.split('-')[1]) - 1; months[m] += p.kg; });
    return months;
}

function updateAllCharts() {
    let year = getCurrentYear();
    let yearData = filterByYear(archivioProduzioni, year);
    let monthlyKgs = monthlyAggregate(yearData);
    let monthlyEuros = monthlyKgs.map(kg => kg * prezzoKgCorrente);
    let labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    if (currentYearKgChart) {
        currentYearKgChart.data.datasets[0].data = monthlyKgs;
        currentYearKgChart.update();
    }
    if (currentYearEurosChart) {
        currentYearEurosChart.data.datasets[0].data = monthlyEuros;
        currentYearEurosChart.update();
    }

    let yearMap = new Map();
    archivioProduzioni.forEach(p => {
        let y = p.date.split('-')[0];
        if (!yearMap.has(y)) yearMap.set(y, { kg: 0, guadagno: 0 });
        let d = yearMap.get(y);
        d.kg += p.kg;
        d.guadagno += p.kg * prezzoKgCorrente;
    });
    let years = Array.from(yearMap.keys()).sort();
    let kgTot = years.map(y => yearMap.get(y).kg);
    let gainTot = years.map(y => yearMap.get(y).guadagno);

    if (fullHistoryChart) {
        fullHistoryChart.data.labels = years;
        fullHistoryChart.data.datasets[0].data = kgTot;
        fullHistoryChart.data.datasets[1].data = gainTot;
        fullHistoryChart.update();
    }
}

function initCharts() {
    let ctxKg = document.getElementById('currentYearKgChart').getContext('2d');
    let ctxEu = document.getElementById('currentYearEurosChart').getContext('2d');
    let ctxFull = document.getElementById('fullHistoryChart').getContext('2d');
    let monthLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    currentYearKgChart = new Chart(ctxKg, {
        type: 'bar',
        data: { labels: monthLabels, datasets: [{ label: 'Kg prodotti', data: Array(12).fill(0), backgroundColor: '#6dae85', borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });

    currentYearEurosChart = new Chart(ctxEu, {
        type: 'line',
        data: { labels: monthLabels, datasets: [{ label: 'Ricavo netto (€)', data: Array(12).fill(0), borderColor: '#e9b35f', backgroundColor: '#f7e5c2', fill: true, tension: 0.3 }] },
        options: { responsive: true }
    });

    fullHistoryChart = new Chart(ctxFull, {
        type: 'bar',
        data: { labels: [], datasets: [
            { label: 'Kg annuali', data: [], backgroundColor: '#5e9b79', borderRadius: 8, yAxisID: 'y' },
            { label: 'Guadagno netto (€)', data: [], backgroundColor: '#e9bc6e', borderRadius: 8, yAxisID: 'y1' }
        ] },
        options: { responsive: true, scales: { y: { title: { text: 'Kg' } }, y1: { position: 'right', title: { text: '€' } } } }
    });

    updateAllCharts();
}

function refreshAll() {
    renderTable();
    renderFatture();
    aggiornaRiepilogo();
    updateAllCharts();
}

// Eventi
addBtn.addEventListener('click', addRecord);
aggiornaCalcoliBtn.addEventListener('click', aggiornaParametri);
apriSimulazioneBtn.addEventListener('click', apriModal);
cancellaTutteFattureBtn.addEventListener('click', cancellaFatture);
pricePerKgInput.addEventListener('change', aggiornaParametri);
confermaFatturaModaleBtn.addEventListener('click', confermaFattura);
closeModalBtn.addEventListener('click', chiudiModal);
annullaModaleBtn.addEventListener('click', chiudiModal);
modalPrezzoKg.addEventListener('input', calcolaAnteprimaModal);
window.addEventListener('click', (e) => { if (e.target === modal) chiudiModal(); });

// Avvio
setDefaultDate();
loadAllData();
initCharts();