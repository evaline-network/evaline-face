/**
 * Eva Face - Application Bootstrap & HUD Controls
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('evaCanvas');
  if (!canvas || typeof EVA_FACE_DATA === 'undefined') {
    console.error('Canvas or EVA_FACE_DATA not found.');
    return;
  }

  // Instantiate animation engine
  const anim = new EvaFaceAnimation(canvas, EVA_FACE_DATA);

  // HUD Elements
  const stagePillText = document.getElementById('stagePillText');
  const narrativeText = document.getElementById('narrativeText');
  const btnPlay = document.getElementById('btnPlay');
  const btnPlayIcon = document.getElementById('btnPlayIcon');
  const btnReplay = document.getElementById('btnReplay');
  const btnRotate = document.getElementById('btnRotate');
  const timelineSlider = document.getElementById('timelineSlider');
  const timeDisplay = document.getElementById('timeDisplay');
  const stageBtns = document.querySelectorAll('.stage-btn');
  const themeSwatches = document.querySelectorAll('.theme-swatch');

  // Stage Narratives (Poetic Russian / English bilingual or elegant concise text)
  const STAGE_INFO = [
    {
      title: '00 // THE VOID',
      narrative: 'В бесконечной тишине рождается квантовая сингулярность.'
    },
    {
      title: '01 // THE TRIAD',
      narrative: 'Из пустоты возникают точки, связываются лучами и образуют первый треугольник.'
    },
    {
      title: '02 // POLYGONAL SPHERE',
      narrative: 'Волна триангуляции распространяется в пространстве, формируя прозрачную сферу узлов.'
    },
    {
      title: '03 // METAMORPHOSIS',
      narrative: 'Поверхность сферы плавно деформируется, прорисовывая женственные черты лица.'
    },
    {
      title: '04 // EVA FACE',
      narrative: 'Лицо Евы оживает: гармония геометрии, света и органического дыхания.'
    }
  ];

  // Callback on progress
  let isUserSeeking = false;
  anim.onProgressUpdate = (curTime, totalTime, stageIdx) => {
    if (!isUserSeeking && timelineSlider) {
      timelineSlider.value = (curTime / totalTime) * 100;
    }

    if (timeDisplay) {
      const curM = Math.floor(curTime / 60);
      const curS = (curTime % 60).toFixed(1).padStart(4, '0');
      const totM = Math.floor(totalTime / 60);
      const totS = (totalTime % 60).toFixed(1).padStart(4, '0');
      timeDisplay.textContent = `${curM}:${curS} / ${totM}:${totS}`;
    }

    // Update stage button highlighting
    stageBtns.forEach(btn => {
      const btnStage = parseInt(btn.dataset.stage, 10);
      btn.classList.toggle('active', btnStage === stageIdx);
    });
  };

  anim.onStageChange = (stageIdx) => {
    const info = STAGE_INFO[stageIdx] || STAGE_INFO[0];
    if (stagePillText) stagePillText.textContent = info.title;
    if (narrativeText) {
      narrativeText.style.opacity = '0';
      setTimeout(() => {
        narrativeText.textContent = info.narrative;
        narrativeText.style.opacity = '1';
      }, 200);
    }
  };

  // Play / Pause Toggle
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      const isPlaying = anim.togglePlay();
      updatePlayButtonUI(isPlaying);
    });
  }

  function updatePlayButtonUI(isPlaying) {
    if (btnPlayIcon) {
      if (isPlaying) {
        // Pause Icon
        btnPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      } else {
        // Play Icon
        btnPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      }
    }
  }

  // Replay
  if (btnReplay) {
    btnReplay.addEventListener('click', () => {
      anim.replay();
      updatePlayButtonUI(true);
    });
  }

  // Auto-Rotate Toggle
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      anim.autoRotate = !anim.autoRotate;
      btnRotate.classList.toggle('active', anim.autoRotate);
    });
  }

  // Timeline Scrubber
  if (timelineSlider) {
    timelineSlider.addEventListener('mousedown', () => { isUserSeeking = true; });
    timelineSlider.addEventListener('touchstart', () => { isUserSeeking = true; }, { passive: true });

    timelineSlider.addEventListener('input', (e) => {
      const percent = parseFloat(e.target.value) / 100;
      anim.seek(percent * anim.totalDuration);
    });

    const endSeek = () => { isUserSeeking = false; };
    timelineSlider.addEventListener('mouseup', endSeek);
    timelineSlider.addEventListener('touchend', endSeek);
  }

  // Stage Jump Buttons
  stageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = parseInt(btn.dataset.stage, 10);
      anim.jumpToStage(stage);
      updatePlayButtonUI(true);
    });
  });

  // Theme Swatches
  themeSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      themeSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const themeKey = swatch.dataset.theme;
      anim.setTheme(themeKey);
    });
  });

  // Keyboard Shortcuts: Space (Play/Pause), R (Replay), 1-5 (Stages)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const isPlaying = anim.togglePlay();
      updatePlayButtonUI(isPlaying);
    } else if (e.code === 'KeyR') {
      anim.replay();
      updatePlayButtonUI(true);
    } else if (e.key >= '1' && e.key <= '5') {
      anim.jumpToStage(parseInt(e.key, 10) - 1);
      updatePlayButtonUI(true);
    }
  });

  // Main 60 FPS Render Loop
  let lastTime = performance.now();
  function loop(now) {
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    anim.update(deltaSeconds);
    anim.render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
