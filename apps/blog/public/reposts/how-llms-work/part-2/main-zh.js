// ═══════════════════════════════════════════════
// HERO CANVAS — Floating Usage Words
// ═══════════════════════════════════════════════
(function(){
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, tokens = [];
  const WORDS = ['搜索','语音','代码','文档','思维','聊天','智能体','规划','调试','阅读','写作','API','工具','PDF','提问','绘图','研究','查询','ZIP','模型','o1','o3','GPT','Claude','Gemini','Cursor','提示词','记忆','图像','视觉','备忘','Whisper','草稿','编辑','运行','引用','解析','RAG','深度','微调','评估'];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeToken() {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const size = 10 + Math.floor(Math.random() * 5);
    const alpha = 0.05 + Math.random() * 0.085;
    return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 0.17, vy: -0.11 - Math.random() * 0.13, word, size, alpha };
  }

  function init() { resize(); tokens = Array.from({length: 45}, makeToken); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const t of tokens) {
      t.x += t.vx; t.y += t.vy;
      if (t.y < -30) Object.assign(t, makeToken(), { x: Math.random() * W, y: H + 20 });
      if (t.x < -60) t.x = W + 20;
      if (t.x > W + 60) t.x = -20;
      ctx.font = `${t.size}px 'JetBrains Mono', monospace`;
      const mw = ctx.measureText(t.word).width;
      const pad = 5, ph = t.size + 6;
      ctx.strokeStyle = `rgba(13,148,136,${t.alpha * 0.6})`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(t.x - pad/2, t.y - ph + 3, mw + pad, ph);
      ctx.fillStyle = `rgba(10,22,40,${t.alpha})`;
      ctx.fillText(t.word, t.x, t.y);
    }
    requestAnimationFrame(draw);
  }

  init();
  requestAnimationFrame(draw);
  window.addEventListener('resize', () => { resize(); init(); });
})();

// ═══════════════════════════════════════════════
// TYPEWRITER
// ═══════════════════════════════════════════════
(function(){
  const el = document.getElementById('tw-response');
  const messages = [
    "它对你没有记忆，知识滞后 6-12 个月，每个回答都是概率性采样。把它当作一个聪明的实习生——而不是神谕。",
    "对于永恒不变的知识，跳过网络搜索——权重足够。对于任何近期的、时间敏感的或冷门的内容——启用搜索或使用 Perplexity。",
    "语音消除了一半的摩擦。Super Whisper 可以免手处理约 50% 的查询。对于 Whisper 容易误转录的产品名和库名，请切换到打字。",
    "思维模型（o1、o3）用于困难问题。它们更慢也更贵——不要在简单任务上浪费它们。Claude Sonnet 在细致编程上经常击败 o1 Pro。"
  ];
  let mi = 0, ci = 0, deleting = false;

  function type() {
    const msg = messages[mi];
    if (!deleting) {
      if (ci < msg.length) {
        el.innerHTML = msg.slice(0, ++ci) + '<span class="tw-cursor"></span>';
        setTimeout(type, 24 + Math.random() * 18);
      } else {
        setTimeout(() => { deleting = true; type(); }, 3200);
      }
    } else {
      if (ci > 0) {
        el.innerHTML = msg.slice(0, --ci) + '<span class="tw-cursor"></span>';
        setTimeout(type, 10);
      } else {
        deleting = false;
        mi = (mi + 1) % messages.length;
        setTimeout(type, 400);
      }
    }
  }
  setTimeout(type, 1000);
})();

// ═══════════════════════════════════════════════
// THINKING DEMO
// ═══════════════════════════════════════════════
(function(){
  const stepsEl = document.getElementById('thinking-steps');
  const answerEl = document.getElementById('thinking-answer');
  const contentEl = document.getElementById('ta-content');
  const timeEl = document.getElementById('thinking-time');
  const runBtn = document.getElementById('thinking-run-btn');

  const steps = [
    { icon: '🔍', text: "让我想想奇数意味着什么……" },
    { icon: '📐', text: "奇数可以写成 2k+1，其中 k 为整数。让我用这个定义。" },
    { icon: '🔄', text: "如果有两个奇数：a = 2j+1 和 b = 2k+1……" },
    { icon: '➕', text: "它们的和：a + b = (2j+1) + (2k+1) = 2j + 2k + 2 = 2(j+k+1)" },
    { icon: '✓', text: "因为 j+k+1 是整数，2(j+k+1) 能被 2 整除——这就是偶数的定义。" },
  ];

  const answer = "设两个奇整数分别为 a = 2j+1 和 b = 2k+1。则 a+b = 2j+1 + 2k+1 = 2(j+k+1)。因为 j+k+1 ∈ ℤ，所以和为偶数。□";

  let running = false;

  runBtn.addEventListener('click', function() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = '思考中...';
    stepsEl.innerHTML = '';
    answerEl.style.display = 'none';

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed++;
      timeEl.textContent = `已思考 ${elapsed}s...`;
    }, 1000);

    steps.forEach((step, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'thinking-step';
        div.innerHTML = `<span class="ts-icon">${step.icon}</span><span class="ts-text">${step.text}</span>`;
        stepsEl.appendChild(div);
      }, i * 700);
    });

    setTimeout(() => {
      clearInterval(timer);
      timeEl.textContent = `思考了 ${steps.length - 1}s`;
      answerEl.style.display = 'block';
      contentEl.textContent = answer;
      runBtn.disabled = false;
      runBtn.textContent = '↺ 重新运行';
      running = false;
    }, steps.length * 700 + 300);
  });
})();

// ═══════════════════════════════════════════════
// RESEARCH PIPELINE
// ═══════════════════════════════════════════════
(function(){
  const runBtn = document.getElementById('rp-run-btn');
  const resultEl = document.getElementById('rp-result');
  const steps = [0,1,2,3].map(i => document.getElementById(`rp-s${i}`));
  let running = false;

  function resetSteps() {
    steps.forEach(s => s && s.classList.remove('rp-active'));
    resultEl.style.display = 'none';
  }

  function runDemo() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = '模拟中...';
    resetSteps();

    const timings = [0, 800, 1700, 2700];
    timings.forEach((t, i) => {
      setTimeout(() => {
        steps.forEach(s => s && s.classList.remove('rp-active'));
        steps[i] && steps[i].classList.add('rp-active');
      }, t);
    });

    setTimeout(() => {
      resultEl.style.display = 'block';
      runBtn.disabled = false;
      runBtn.textContent = '↺ 重新模拟';
      running = false;
    }, 3700);
  }

  runBtn.addEventListener('click', () => { resetSteps(); setTimeout(runDemo, 80); });
})();

// ═══════════════════════════════════════════════
// CODE DEMO + CHART
// ═══════════════════════════════════════════════
(function(){
  const runBtn = document.getElementById('code-run-btn');
  const steps = [0,1,2].map(i => document.getElementById(`cd-step-${i}`));
  let running = false;

  function drawChart() {
    const canvas = document.getElementById('chart-canvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 340;
    const H = 160;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = { l: 36, r: 12, t: 12, b: 24 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, W, H);

    const countries = ['美国','日本','德国','英国','法国','意大利','加拿大'];
    const colors = ['#0D9488','#6EE7E7','#FCD34D','#C4B5FD','#F9A8D4','#86EFAC','#FCA5A5'];
    const years = Array.from({length: 34}, (_, i) => 1990 + i);

    function gdpSeed(baseGDP, volatility, trend, countryIdx) {
      return years.map((_, i) => {
        const noise = Math.sin(i * 2.3 + countryIdx * 1.7) * volatility;
        return baseGDP + trend * i + noise;
      });
    }

    const series = [
      gdpSeed(5.9, 0.3, 0.38, 0),
      gdpSeed(3.2, 0.2, 0.08, 1),
      gdpSeed(1.8, 0.15, 0.11, 2),
      gdpSeed(1.2, 0.1, 0.08, 3),
      gdpSeed(1.1, 0.1, 0.07, 4),
      gdpSeed(1.0, 0.1, 0.04, 5),
      gdpSeed(0.7, 0.08, 0.05, 6),
    ];

    const allVals = series.flat();
    const minV = Math.min(...allVals) * 0.9;
    const maxV = Math.max(...allVals) * 1.05;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const val = (maxV - (i / 4) * (maxV - minV)).toFixed(0);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText(`$${val}T`, 0, y + 3);
    }

    ['1990','2000','2010','2023'].forEach((yr, i) => {
      const x = pad.l + (i / 3) * cW;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText(yr, x - 10, H - 4);
    });

    series.forEach((data, si) => {
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = pad.l + (i / (years.length - 1)) * cW;
        const y = pad.t + ((maxV - val) / (maxV - minV)) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = colors[si];
      ctx.lineWidth = si === 0 ? 1.8 : 1.2;
      ctx.globalAlpha = si === 0 ? 1 : 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;

      const lastVal = data[data.length - 1];
      const lastX = pad.l + cW;
      const lastY = pad.t + ((maxV - lastVal) / (maxV - minV)) * cH;
      ctx.font = '8px JetBrains Mono';
      ctx.fillStyle = colors[si];
      ctx.fillText(countries[si], lastX - 38, lastY - 3);
    });
  }

  runBtn.addEventListener('click', function() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    steps.forEach(s => { if (s) s.style.display = 'none'; });

    setTimeout(() => {
      steps[0].style.display = 'block';
    }, 100);

    setTimeout(() => {
      steps[0].style.display = 'none';
      steps[1].style.display = 'block';
    }, 1400);

    setTimeout(() => {
      steps[1].style.display = 'none';
      steps[2].style.display = 'block';
      drawChart();
      runBtn.disabled = false;
      runBtn.textContent = '↺ 重新运行';
      running = false;
    }, 2400);
  });
})();

// ═══════════════════════════════════════════════
// AGENT LOOP ANIMATION
// ═══════════════════════════════════════════════
(function(){
  const runBtn = document.getElementById('al-run-btn');
  const steps = [0,1,2,3].map(i => document.getElementById(`al-s${i}`));
  let running = false;

  runBtn.addEventListener('click', function() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    steps.forEach(s => s && s.classList.remove('al-active'));

    let i = 0;
    const interval = setInterval(() => {
      steps.forEach(s => s && s.classList.remove('al-active'));
      if (i < steps.length) {
        steps[i] && steps[i].classList.add('al-active');
        i++;
      } else {
        clearInterval(interval);
        runBtn.disabled = false;
        runBtn.textContent = '↺ 重新演示';
        running = false;
      }
    }, 600);
  });
})();

// ═══════════════════════════════════════════════
// SCROLL OBSERVER — Animations + Nav + Progress
// ═══════════════════════════════════════════════
(function(){
  const sections = document.querySelectorAll('.section');
  const navBtns = document.querySelectorAll('.tnav-btn');
  const progressBar = document.getElementById('progress-bar');
  const pipelineStages = document.querySelectorAll('.pipeline-stage');

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = Math.round(scrolled / total * 100);
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
  }, {passive: true});

  document.querySelectorAll('.fade-up').forEach(el => el.classList.add('animate-ready'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

  const pipelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        pipelineStages.forEach((s, i) => setTimeout(() => s.classList.add('visible'), i * 120));
        pipelineObserver.disconnect();
      }
    });
  }, { threshold: 0.05 });

  const summarySection = document.getElementById('s-summary');
  if (summarySection) pipelineObserver.observe(summarySection);

  function setActiveNav(sectionId) {
    navBtns.forEach(btn => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'true');
        btn.scrollIntoView({block:'nearest', inline:'center'});
      } else {
        btn.removeAttribute('aria-current');
      }
    });
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveNav(entry.target.id);
    });
  }, { threshold: 0.35 });

  sections.forEach(s => sectionObserver.observe(s));

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = document.getElementById(btn.dataset.section);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();