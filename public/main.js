// ============================================================================
// J.A.R.V.I.S. // Interactive 3D Particle Core & Voice / File HUD Controller
// Aesthetic: Minimalist Full-Screen Dark Mode + MCU Cyan (#00f0ff) & Amber (#ffaa00)
// ============================================================================

const container = document.getElementById('canvasContainer');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5.4;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

function createGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.28, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.18)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const spriteTexture = createGlowSprite();

const coreGroup = new THREE.Group();
scene.add(coreGroup);

const outerCount = 3200;
const outerGeometry = new THREE.BufferGeometry();
const outerPositions = new Float32Array(outerCount * 3);
const outerBasePositions = new Float32Array(outerCount * 3);
const outerColors = new Float32Array(outerCount * 3);
const outerBaseColors = new Float32Array(outerCount * 3);

const cyanColor = new THREE.Color(0x00f0ff);
const electricBlue = new THREE.Color(0x38bdf8);
const amberColor = new THREE.Color(0xffaa00);

for (let i = 0; i < outerCount; i++) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / outerCount);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const radius = 1.92 + (Math.random() - 0.5) * 0.14;

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);

  const idx = i * 3;
  outerPositions[idx] = outerBasePositions[idx] = x;
  outerPositions[idx + 1] = outerBasePositions[idx + 1] = y;
  outerPositions[idx + 2] = outerBasePositions[idx + 2] = z;

  const isAmberNode = Math.random() < 0.12;
  const c = isAmberNode
    ? amberColor
    : cyanColor.clone().lerp(electricBlue, Math.random() * 0.45);

  outerColors[idx] = outerBaseColors[idx] = c.r;
  outerColors[idx + 1] = outerBaseColors[idx + 1] = c.g;
  outerColors[idx + 2] = outerBaseColors[idx + 2] = c.b;
}

outerGeometry.setAttribute('position', new THREE.BufferAttribute(outerPositions, 3));
outerGeometry.setAttribute('color', new THREE.BufferAttribute(outerColors, 3));

const outerMaterial = new THREE.PointsMaterial({
  size: 0.052,
  map: spriteTexture,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const outerSphere = new THREE.Points(outerGeometry, outerMaterial);
coreGroup.add(outerSphere);

const innerCount = 900;
const innerGeometry = new THREE.BufferGeometry();
const innerPositions = new Float32Array(innerCount * 3);
const innerBasePositions = new Float32Array(innerCount * 3);

for (let i = 0; i < innerCount; i++) {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = 0.72 + Math.random() * 0.36;

  const idx = i * 3;
  innerPositions[idx] = innerBasePositions[idx] = r * Math.sin(phi) * Math.cos(theta);
  innerPositions[idx + 1] = innerBasePositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
  innerPositions[idx + 2] = innerBasePositions[idx + 2] = r * Math.cos(phi);
}

innerGeometry.setAttribute('position', new THREE.BufferAttribute(innerPositions, 3));

const innerMaterial = new THREE.PointsMaterial({
  color: 0xffaa00,
  size: 0.06,
  map: spriteTexture,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const innerCore = new THREE.Points(innerGeometry, innerMaterial);
coreGroup.add(innerCore);

function createHoloRing(radius, colorHex, opacity, tiltX, tiltY) {
  const segments = 180;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const ringMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Line(ringGeo, ringMat);
  ring.rotation.x = tiltX;
  ring.rotation.y = tiltY;
  return ring;
}

const cyanRing = createHoloRing(2.38, 0x00f0ff, 0.22, Math.PI * 0.36, 0.22);
const amberRing = createHoloRing(2.58, 0xffaa00, 0.16, -Math.PI * 0.28, -0.35);
coreGroup.add(cyanRing);
coreGroup.add(amberRing);

const mouseNDC = new THREE.Vector2(999, 999);
const smoothMouse = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const cursorWorld = new THREE.Vector3(999, 999, 0);
const localCursor = new THREE.Vector3(999, 999, 0);

window.addEventListener('mousemove', (event) => {
  mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mouseleave', () => {
  mouseNDC.set(999, 999);
});

// System Visual State ('STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'OFFLINE')
let systemState = 'STANDBY';
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // FPS diagnostics counter
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    const fpsEl = document.getElementById('diagFps');
    if (fpsEl) fpsEl.textContent = `${frameCount} FPS`;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  if (mouseNDC.x < 10) {
    smoothMouse.x += (mouseNDC.x - smoothMouse.x) * 0.06;
    smoothMouse.y += (mouseNDC.y - smoothMouse.y) * 0.06;
  } else {
    smoothMouse.x *= 0.95;
    smoothMouse.y *= 0.95;
  }

  let spinSpeed = 0.0024;
  let pulseAmp = 0.03;
  let pulseFreq = 1.8;

  if (systemState === 'LISTENING') {
    spinSpeed = 0.0055;
    pulseAmp = 0.08;
    pulseFreq = 4.2;
  } else if (systemState === 'PROCESSING') {
    spinSpeed = 0.011;
    pulseAmp = 0.06;
    pulseFreq = 6.5;
  } else if (systemState === 'SPEAKING') {
    spinSpeed = 0.0045;
    pulseAmp = 0.11;
    pulseFreq = 9.0;
  }

  outerSphere.rotation.y += spinSpeed;
  outerSphere.rotation.x += spinSpeed * 0.45;
  innerCore.rotation.y -= spinSpeed * 1.6;
  innerCore.rotation.z += spinSpeed * 0.8;

  cyanRing.rotation.z += 0.002;
  amberRing.rotation.z -= 0.0015;

  coreGroup.rotation.y = smoothMouse.x * 0.35;
  coreGroup.rotation.x = -smoothMouse.y * 0.25;

  const innerScale = 1 + Math.sin(elapsed * pulseFreq) * (pulseAmp * 2.2);
  innerCore.scale.setScalar(innerScale);

  let hasCursor = false;
  if (mouseNDC.x < 10) {
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(interactionPlane, cursorWorld)) {
      localCursor.copy(cursorWorld);
      outerSphere.worldToLocal(localCursor);
      hasCursor = true;
    }
  }

  const posAttr = outerGeometry.attributes.position;
  const colAttr = outerGeometry.attributes.color;
  const posArr = posAttr.array;
  const colArr = colAttr.array;

  const waveBreath = 1 + Math.sin(elapsed * pulseFreq) * pulseAmp;
  const perturbRadius = 0.95;

  for (let i = 0; i < outerCount; i++) {
    const idx = i * 3;
    const bx = outerBasePositions[idx] * waveBreath;
    const by = outerBasePositions[idx + 1] * waveBreath;
    const bz = outerBasePositions[idx + 2] * waveBreath;

    let tx = bx;
    let ty = by;
    let tz = bz;
    let heat = 0;

    if (hasCursor) {
      const dx = bx - localCursor.x;
      const dy = by - localCursor.y;
      const dz = bz - localCursor.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < perturbRadius * perturbRadius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const falloff = 1 - dist / perturbRadius;
        const force = falloff * falloff * 0.48;
        tx += (dx / dist) * force;
        ty += (dy / dist) * force;
        tz += (dz / dist) * force;
        heat = falloff;
      }
    }

    posArr[idx] += (tx - posArr[idx]) * 0.14;
    posArr[idx + 1] += (ty - posArr[idx + 1]) * 0.14;
    posArr[idx + 2] += (tz - posArr[idx + 2]) * 0.14;

    const br = outerBaseColors[idx];
    const bg = outerBaseColors[idx + 1];
    const bb = outerBaseColors[idx + 2];

    const targetR = br + (amberColor.r - br) * heat;
    const targetG = bg + (amberColor.g - bg) * heat;
    const targetB = bb + (amberColor.b - bb) * heat;

    colArr[idx] += (targetR - colArr[idx]) * 0.15;
    colArr[idx + 1] += (targetG - colArr[idx + 1]) * 0.15;
    colArr[idx + 2] += (targetB - colArr[idx + 2]) * 0.15;
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// 2. HUD State, Navigation Drawers, Speech Recognition & Backend Integration
// ============================================================================
const wakeBtn = document.getElementById('wakeBtn');
const wakeBtnLabel = document.getElementById('wakeBtnLabel');
const statusIndicator = document.getElementById('statusIndicator');
const waveform = document.getElementById('waveform');
const diagSpeech = document.getElementById('diagSpeech');
const userText = document.getElementById('userText');
const jarvisText = document.getElementById('jarvisText');
const audioPlayer = document.getElementById('audioPlayer');
const commandForm = document.getElementById('commandForm');
const commandInput = document.getElementById('commandInput');
const activityLog = document.getElementById('activityLog');

window.isJarvisSpeaking = false;

function logActivity(tag, message) {
  if (!activityLog) return;
  const li = document.createElement('li');
  li.innerHTML = `<span class="log-time">[${tag}]</span> ${message}`;
  activityLog.prepend(li);
}

function setHudState(state, btnText) {
  systemState = state; // Syncs 3D Jarvis Core pulse & spin speed
  if (statusIndicator) statusIndicator.textContent = state;
  if (wakeBtnLabel && btnText) wakeBtnLabel.textContent = btnText;
  if (waveform) {
    waveform.classList.toggle('active', state === 'LISTENING' || state === 'SPEAKING');
  }
}

// --- 1. VOICE RECOGNITION (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let silenceTimer = null;
let accumulatedFinal = '';

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;      // Prevents cutting off mid-sentence
  recognition.interimResults = true;
  if (diagSpeech) diagSpeech.textContent = 'READY';

  recognition.onstart = () => {
    isListening = true;
    accumulatedFinal = '';
    wakeBtn?.classList.add('listening');
    setHudState('LISTENING', 'LISTENING...');
    userText.textContent = 'Listening... Speak your directive.';
  };

  recognition.onresult = (event) => {
    clearTimeout(silenceTimer);
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        accumulatedFinal += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    const liveTranscript = (accumulatedFinal + interimTranscript).trim();
    if (liveTranscript) {
      userText.textContent = liveTranscript;
    }

    // Wait 1.5s after you stop speaking so full sentences are captured cleanly
    silenceTimer = setTimeout(() => {
      const completePrompt = (accumulatedFinal + interimTranscript).trim();
      if (completePrompt) {
        accumulatedFinal = '';
        recognition.stop();
        sendPromptToJarvis(completePrompt);
      }
    }, 1500);
  };

  recognition.onerror = (event) => {
    clearTimeout(silenceTimer);
    console.error('Speech recognition error:', event.error);

    if (event.error === 'no-speech') {
      userText.textContent = 'No audio detected — check active microphone in Chrome.';
    } else if (event.error === 'not-allowed') {
      userText.textContent = 'Microphone permission blocked by browser.';
    } else {
      userText.textContent = `Mic alert: ${event.error}`;
    }

    logActivity('VOICE_ERR', event.error);
    resetVoiceButton();
  };

  recognition.onend = () => {
    clearTimeout(silenceTimer);
    resetVoiceButton();
  };
} else {
  if (diagSpeech) diagSpeech.textContent = 'UNSUPPORTED';
  if (wakeBtn) wakeBtn.disabled = true;
  setHudState('OFFLINE', 'NO MIC API');
}

function resetVoiceButton() {
  isListening = false;
  wakeBtn?.classList.remove('listening');
  if (!window.isJarvisSpeaking && systemState !== 'PROCESSING') {
    setHudState('STANDBY', 'ENGAGE VOICE');
  }
}

function toggleListening() {
  if (!recognition) {
    jarvisText.textContent = 'Voice recognition requires Chrome or Edge, Sir.';
    return;
  }

  if (isListening) {
    clearTimeout(silenceTimer);
    recognition.stop();
  } else {
    audioPlayer.pause();
    window.speechSynthesis?.cancel();
    window.isJarvisSpeaking = false;
    recognition.start();
  }
}
window.toggleListening = toggleListening;

// --- 2. SEND DIRECTIVE & SPEAK RESPONSE ---
async function sendPromptToJarvis(prompt) {
  setHudState('PROCESSING', 'PROCESSING...');
  jarvisText.textContent = 'Analyzing directive...';
  logActivity('INPUT', prompt);

  try {
    const res = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const reply = data.reply || 'Systems nominal, Sir.';
    jarvisText.textContent = reply;
    logActivity('JARVIS', reply);

    await speakJarvisResponse(reply, data.audio);
  } catch (error) {
    console.error('HUD connection error:', error);
    const offlineMsg = 'Connection to local server interrupted, Sir.';
    jarvisText.textContent = offlineMsg;
    speakWithBrowserFallback(offlineMsg);
  }
}

async function speakJarvisResponse(text, audioBase64) {
  if (audioBase64) {
    try {
      audioPlayer.src = `data:audio/mp3;base64,${audioBase64}`;

      audioPlayer.onplay = () => {
        window.isJarvisSpeaking = true;
        setHudState('SPEAKING', 'ENGAGE VOICE');
      };

      audioPlayer.onended = () => {
        window.isJarvisSpeaking = false;
        setHudState('STANDBY', 'ENGAGE VOICE');
      };

      audioPlayer.onerror = () => {
        window.isJarvisSpeaking = false;
        speakWithBrowserFallback(text);
      };

      await audioPlayer.play();
      return;
    } catch (err) {
      console.warn('Fish Audio playback blocked, using browser fallback:', err);
    }
  }

  speakWithBrowserFallback(text);
}

function speakWithBrowserFallback(text) {
  if (!('speechSynthesis' in window)) {
    setHudState('STANDBY', 'ENGAGE VOICE');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis.getVoices();
  const britishVoice =
    voices.find(v => v.lang === 'en-GB' && /daniel|george|ryan|male/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-GB');

  if (britishVoice) utterance.voice = britishVoice;
  utterance.rate = 1.02;
  utterance.pitch = 0.95;

  utterance.onstart = () => {
    window.isJarvisSpeaking = true;
    setHudState('SPEAKING', 'ENGAGE VOICE');
  };

  utterance.onend = () => {
    window.isJarvisSpeaking = false;
    setHudState('STANDBY', 'ENGAGE VOICE');
  };

  window.speechSynthesis.speak(utterance);
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// --- 3. TEXT COMMAND BAR, QUICK CHIPS & HUD NAVIGATION DRAWERS ---
commandForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const prompt = commandInput.value.trim();
  if (!prompt) return;
  userText.textContent = prompt;
  commandInput.value = '';
  sendPromptToJarvis(prompt);
});

document.querySelectorAll('.chip-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = btn.dataset.prompt;
    if (!prompt) return;
    userText.textContent = prompt;
    sendPromptToJarvis(prompt);
  });
});

const hudDrawer = document.getElementById('hudDrawer');
const drawerTitle = document.getElementById('drawerTitle');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const viewOperations = document.getElementById('view-operations');
const viewDiagnostics = document.getElementById('view-diagnostics');
const navBtns = document.querySelectorAll('.nav-btn');

navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    navBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (view === 'core') {
      hudDrawer?.classList.remove('open');
      hudDrawer?.setAttribute('aria-hidden', 'true');
      return;
    }

    hudDrawer?.classList.add('open');
    hudDrawer?.setAttribute('aria-hidden', 'false');

    if (view === 'operations') {
      if (drawerTitle) drawerTitle.textContent = '// FILE OPERATIONS';
      viewOperations?.classList.remove('hidden');
      viewDiagnostics?.classList.add('hidden');
    } else if (view === 'diagnostics') {
      if (drawerTitle) drawerTitle.textContent = '// SYSTEM DIAGNOSTICS';
      viewDiagnostics?.classList.remove('hidden');
      viewOperations?.classList.add('hidden');
    }
  });
});

closeDrawerBtn?.addEventListener('click', () => {
  hudDrawer?.classList.remove('open');
  hudDrawer?.setAttribute('aria-hidden', 'true');
  navBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === 'core'));
});