// starfield.js
(function() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];
  
  function resizeCanvas() { 
    W = canvas.width = window.innerWidth; 
    H = canvas.height = window.innerHeight; 
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Create stars
  const NUM_STARS = 400; // Increased for better logo resolution
  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random(), 
      y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.6 + 0.1,
      da: (Math.random() - 0.5) * 0.004,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      c: ['#7C3AED', '#06B6D4', '#ffffff'][Math.floor(Math.random() * 3)],
      tx: 0, 
      ty: 0 // Target coordinates for logo
    });
  }

  let phase = 'wander'; // 'wander', 'form', 'hold', 'explode'
  let phaseTimer = 0;
  let logoPoints = [];

  // Load the logo image and extract points
  const img = new Image();
  img.src = '/images/logo.png';
  img.onload = () => {
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    const size = 150; // Resolution of the point cloud
    offCanvas.width = size;
    offCanvas.height = size;
    offCtx.drawImage(img, 0, 0, size, size);
    
    const imgData = offCtx.getImageData(0, 0, size, size).data;
    
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const i = (y * size + x) * 4;
        const alpha = imgData[i + 3];
        if (alpha > 100) { // If pixel is mostly opaque
          logoPoints.push({ x: x / size, y: y / size });
        }
      }
    }
  };

  function setLogoTargets() {
    if (logoPoints.length === 0) return false;
    
    // Scale logo based on screen size
    const minDim = Math.min(W, H);
    const logoW = minDim * 0.4;
    const logoH = minDim * 0.4;
    
    // Center offsets
    const cx = 0.5;
    const cy = 0.5;
    
    stars.forEach((s) => {
      // Pick a random point from the logo
      const pt = logoPoints[Math.floor(Math.random() * logoPoints.length)];
      
      // Calculate final target coordinate (normalized 0 to 1)
      s.tx = cx + ((pt.x - 0.5) * logoW) / W;
      s.ty = cy + ((pt.y - 0.5) * logoH) / H;
    });
    return true;
  }

  function drawBg() {
    ctx.clearRect(0, 0, W, H);
    phaseTimer++;

    // Phase transitions
    if (phase === 'wander' && phaseTimer > 600) { // 10 seconds at 60fps
      if (setLogoTargets()) {
        phase = 'form';
        phaseTimer = 0;
      }
    } else if (phase === 'form' && phaseTimer > 400) { // ~6.5 seconds forming (very slow & fluid)
      phase = 'hold';
      phaseTimer = 0;
    } else if (phase === 'hold' && phaseTimer > 180) { // 3 seconds holding
      phase = 'explode';
      phaseTimer = 0;
      // Assign explosive velocities outwards from center
      stars.forEach(s => {
        const dx = s.x - 0.5;
        const dy = s.y - 0.5;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        s.dx = (dx / dist) * (Math.random() * 3 + 1);
        s.dy = (dy / dist) * (Math.random() * 3 + 1);
      });
    } else if (phase === 'explode' && phaseTimer > 100) { // ~1.5 seconds exploding
      phase = 'wander';
      phaseTimer = 0;
      // Return to normal speeds
      stars.forEach(s => {
        s.dx = (Math.random() - 0.5) * 0.5;
        s.dy = (Math.random() - 0.5) * 0.5;
      });
    }

    stars.forEach(s => {
      if (phase === 'wander' || phase === 'explode') {
        s.x += s.dx / W;
        s.y += s.dy / H;
        
        // Wrap around
        if (s.x < 0) s.x += 1; if (s.x > 1) s.x -= 1;
        if (s.y < 0) s.y += 1; if (s.y > 1) s.y -= 1;
      } else if (phase === 'form' || phase === 'hold') {
        // Lerp towards target slowly for fluid assembly
        s.x += (s.tx - s.x) * 0.012;
        s.y += (s.ty - s.y) * 0.012;
      }
      
      // Twinkle
      s.a = Math.max(0.05, Math.min(0.85, s.a + s.da));
      if (s.a <= 0.05 || s.a >= 0.85) s.da *= -1;
      
      ctx.beginPath(); 
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.c; 
      ctx.globalAlpha = s.a; 
      ctx.fill();
    });
    
    ctx.globalAlpha = 1; 
    requestAnimationFrame(drawBg);
  }
  
  drawBg();
})();
