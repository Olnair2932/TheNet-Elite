// --- CONFIGURAÇÃO FIREBASE ---
// Mestre Olnair, certifique-se de usar suas chaves reais aqui
const firebaseConfig = {
    authDomain: "thenet-d2994.firebaseapp.com",
    projectId: "thenet-d2994",
    storageBucket: "thenet-d2994.appspot.com",
    messagingSenderId: "1055743842186",
    appId: "1:1055743842186:web:65b058c40854298150a0f0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const grid = document.getElementById('grid');
const triesDisplay = document.getElementById('tries');
const recordDisplay = document.getElementById('record');
const timerDisplay = document.getElementById('timer');
const rankingList = document.getElementById('ranking-list');
const icons = ['🚀','🚀','🔥','🔥','💎','💎','🛡️','🛡️','⚡','⚡','🌐','🌐','💻','💻','🤖','🤖'];

let flippedCards = [], lockBoard = false, tries = 0, matches = 0, seconds = 0, timerActive = false;
let record = localStorage.getItem('thenet-record') || '--';
recordDisplay.textContent = record;

// --- MOTOR DE ÁUDIO DE ELITE (COM AUTO-RESUME) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, dur) {
    // Força o navegador a liberar o áudio se estiver suspenso
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

// --- EFEITO MATRIX ---
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const letters = "01";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);
function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff41"; ctx.font = fontSize + "px monospace";
    drops.forEach((y, i) => {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    });
}
setInterval(drawMatrix, 50);

// --- RANKING GLOBAL ---
async function updateLeaderboard() {
    try {
        const snapshot = await db.collection('ranking').orderBy('seconds', 'asc').limit(5).get();
        rankingList.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${data.name}</span> <span>${data.seconds}s (${data.tries} mov)</span>`;
            rankingList.appendChild(li);
        });
    } catch (e) {
        rankingList.innerHTML = '<li>Rede offline ou em pausa.</li>';
    }
}
updateLeaderboard();

// --- GAME LOGIC ---
icons.sort(() => Math.random() - 0.5);
icons.forEach(icon => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-back">?</div><div class="card-front">${icon}</div>`;
    card.dataset.icon = icon;
    card.onclick = flipCard;
    grid.appendChild(card);
});

function flipCard() {
    if (lockBoard || this.classList.contains('flipped') || flippedCards.length >= 2) return;
    
    // Inicia o timer e garante o som no primeiro toque
    if (!timerActive) {
        timerActive = true;
        setInterval(() => {
            seconds++;
            const min = String(Math.floor(seconds / 60)).padStart(2, '0');
            const sec = String(seconds % 60).padStart(2, '0');
            timerDisplay.textContent = `${min}:${sec}`;
        }, 1000);
    }

    playSound(400, 'sine', 0.1); // Som de clique
    this.classList.add('flipped');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        tries++;
        triesDisplay.textContent = tries;
        checkMatch();
    }
}

function checkMatch() {
    lockBoard = true;
    const [c1, c2] = flippedCards;
    if (c1.dataset.icon === c2.dataset.icon) {
        playSound(800, 'square', 0.2); // Som de acerto
        matches++;
        flippedCards = []; lockBoard = false;
        if (matches === 8) setTimeout(endGame, 500);
    } else {
        playSound(150, 'sawtooth', 0.3); // Som de erro
        setTimeout(() => {
            c1.classList.remove('flipped'); c2.classList.remove('flipped');
            flippedCards = []; lockBoard = false;
        }, 800);
    }
}

async function endGame() {
    const playerName = prompt("SISTEMA RESTAURADO! Digite seu Codinome Hacker:") || "Anon_Sentinela";
    try {
        await db.collection('ranking').add({
            name: playerName,
            tries: tries,
            seconds: seconds,
            date: firebase.firestore.Timestamp.now()
        });
    } catch(e) { console.log("Erro ao salvar ranking"); }

    if (record === '--' || tries < parseInt(record)) {
        localStorage.setItem('thenet-record', tries);
    }
    location.reload();
}

window.shareAccess = async () => {
    const shareData = { title: 'TheNet v4.3', text: 'Venci o terminal hacker!', url: 'https://thenet-d2994.web.app/' };
    try { await navigator.share(shareData); } catch (err) {}
};
