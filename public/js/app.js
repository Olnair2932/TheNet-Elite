/**
 * THENET ELITE v4.3.2
 * Arquiteto: Olnair Gonzaga Pereira
 * Aliança Técnica Gemini
 */

// --- 1. CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    authDomain: "thenet-d2994.firebaseapp.com",
    projectId: "thenet-d2994",
    storageBucket: "thenet-d2994.appspot.com",
    messagingSenderId: "1055743842186",
    appId: "1:1055743842186:web:65b058c40854298150a0f0"
};

// Inicialização Segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- 2. ELEMENTOS DA INTERFACE (HUD) ---
const grid = document.getElementById('grid');
const triesDisplay = document.getElementById('tries');
const recordDisplay = document.getElementById('record');
const timerDisplay = document.getElementById('timer');
const rankingList = document.getElementById('ranking-list');
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

// --- 3. VARIÁVEIS DE ESTADO ---
const icons = ['🚀','🚀','🔥','🔥','💎','💎','🛡️','🛡️','⚡','⚡','🌐','🌐','💻','💻','🤖','🤖'];
let flippedCards = [], lockBoard = false, tries = 0, matches = 0, seconds = 0, timerActive = false;
let record = localStorage.getItem('thenet-record') || '--';
recordDisplay.textContent = record;

// --- 4. MOTOR GRÁFICO (MATRIX BINARY) ---
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const letters = "010101";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff41";
    ctx.font = fontSize + "px monospace";
    drops.forEach((y, i) => {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    });
}
setInterval(drawMatrix, 50);

// --- 5. MOTOR DE ÁUDIO SINTÉTICO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
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

// --- 6. RANKING GLOBAL (FIRESTORE) ---
async function updateLeaderboard() {
    try {
        const snapshot = await db.collection('ranking').orderBy('seconds', 'asc').limit(5).get();
        rankingList.innerHTML = '';
        if (snapshot.empty) {
            rankingList.innerHTML = '<li>Aguardando primeiro Sentinela...</li>';
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${data.name}</span> <b>${data.seconds}s (${data.tries} mov)</b>`;
            rankingList.appendChild(li);
        });
    } catch (e) {
        rankingList.innerHTML = '<li>Rede em modo offline.</li>';
    }
}
updateLeaderboard();

// --- 7. LÓGICA DO JOGO DE MEMÓRIA ---
function createBoard() {
    icons.sort(() => Math.random() - 0.5);
    icons.forEach(icon => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-back">?</div><div class="card-front">${icon}</div>`;
        card.dataset.icon = icon;
        card.onclick = flipCard;
        grid.appendChild(card);
    });
}

function flipCard() {
    if (lockBoard || this.classList.contains('flipped') || flippedCards.length >= 2) return;
    
    if (!timerActive) {
        timerActive = true;
        setInterval(() => {
            seconds++;
            const min = String(Math.floor(seconds / 60)).padStart(2, '0');
            const sec = String(seconds % 60).padStart(2, '0');
            timerDisplay.textContent = `${min}:${sec}`;
        }, 1000);
    }

    playSound(400, 'sine', 0.1);
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
    const isMatch = c1.dataset.icon === c2.dataset.icon;

    if (isMatch) {
        playSound(800, 'square', 0.2);
        matches++;
        flippedCards = [];
        lockBoard = false;
        if (matches === 8) setTimeout(endGame, 500);
    } else {
        playSound(150, 'sawtooth', 0.3);
        setTimeout(() => {
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            flippedCards = [];
            lockBoard = false;
        }, 800);
    }
}

// --- 8. FINALIZAÇÃO E REGISTRO DE RECORDE ---
async function endGame() {
    const playerName = prompt("PROTOCOLO COMPLETO! Digite seu Codinome Hacker:") || "Anon_Sentinela";
    
    try {
        await db.collection('ranking').add({
            name: playerName,
            tries: tries,
            seconds: seconds,
            date: firebase.firestore.Timestamp.now()
        });
        updateLeaderboard();
    } catch(e) { 
        console.error("Erro ao salvar recorde global."); 
    }

    if (record === '--' || tries < parseInt(record)) {
        localStorage.setItem('thenet-record', tries);
        alert(`NOVO RECORDE PESSOAL: ${tries} movimentos!`);
    } else {
        alert(`SISTEMA RESTAURADO EM ${seconds}s!`);
    }
    location.reload();
}

// --- 9. API DE COMPARTILHAMENTO ---
window.shareAccess = async () => {
    const shareData = { 
        title: 'TheNet v4.3.2 Elite', 
        text: `Venci o Terminal do Mestre Olnair em ${seconds} segundos! Consegue bater meu recorde?`, 
        url: 'https://thenet-d2994.web.app/' 
    };
    try { await navigator.share(shareData); } catch (err) {}
};

// Inicializar Sistema
createBoard();
