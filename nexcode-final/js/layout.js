/* ============================================
   NexCode — Shared Layout (nav, footer, bg)
   ============================================ */
(function () {
  const root = location.pathname.includes('/pages/') ? '../' : '';

  const logoSVG = `<span class="logo-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6.5v6c0 5 3.8 8.5 9 9.5 5.2-1 9-4.5 9-9.5v-6L12 2z" fill="#fff" fill-opacity=".95"/><path d="M9 11.5l2 2 4-4.5" stroke="#2f6bff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

  /* Background */
  document.body.insertAdjacentHTML('afterbegin', `
    <canvas id="webgl" aria-hidden="true"></canvas>
    <div class="aurora" aria-hidden="true">
      <div class="orb orb1"></div><div class="orb orb2"></div>
      <div class="orb orb3"></div><div class="orb orb4"></div>
    </div>
    <div class="grid-bg" aria-hidden="true"></div>
    <div class="noise" aria-hidden="true"></div>
    <div id="cur-dot" aria-hidden="true"></div>
    <div id="cur-ring" aria-hidden="true"></div>
  `);

  /* Nav */
  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="nav" role="navigation" aria-label="Main">
      <div class="nav-inner">
        <a href="${root}index.html" class="logo">${logoSVG}Nex<em>Code</em></a>
        <div class="nav-center">
          <a href="${root}pages/features.html">Features</a>
          <a href="${root}pages/security.html">Security</a>
          <a href="${root}pages/pricing.html">Pricing</a>
          <a href="${root}pages/docs.html">Docs</a>
          <a href="${root}pages/faq.html">FAQ</a>
          <a href="${root}pages/contact.html">Contact</a>
        </div>
        <div class="nav-end">
          <a href="${root}pages/auth/login.html" class="nav-sign">Sign in</a>
          <a href="${root}pages/pricing.html" class="btn btn-primary btn-sm mag">Get started</a>
        </div>
        <button class="burger" aria-label="Toggle menu"><span></span><span></span><span></span></button>
      </div>
    </nav>
  `);

  /* Footer */
  document.body.insertAdjacentHTML('beforeend', `
    <footer>
      <div class="wrap">
        <div class="foot-grid">
          <div>
            <div class="foot-logo">${logoSVG}Nex<em>Code</em></div>
            <p class="foot-desc">Elite Lua script protection and software licensing. Built for developers who ship.</p>
            <div class="foot-socials">
              <a href="#" class="fsoc" aria-label="Discord">⌘</a>
              <a href="#" class="fsoc" aria-label="GitHub">⊙</a>
              <a href="#" class="fsoc" aria-label="Twitter">𝕏</a>
              <a href="#" class="fsoc" aria-label="YouTube">▶</a>
            </div>
          </div>
          <div class="foot-col">
            <h5>Product</h5>
            <div class="foot-col-links">
              <a href="${root}pages/features.html">Features</a>
              <a href="${root}pages/security.html">Security</a>
              <a href="${root}pages/pricing.html">Pricing</a>
              <a href="#">Changelog</a>
              <a href="#">Roadmap</a>
              <a href="#">Status</a>
            </div>
          </div>
          <div class="foot-col">
            <h5>Developers</h5>
            <div class="foot-col-links">
              <a href="${root}pages/docs.html">Documentation</a>
              <a href="${root}pages/docs.html#api">API Reference</a>
              <a href="${root}pages/docs.html#sdks">SDKs</a>
              <a href="${root}pages/docs.html#webhooks">Webhooks</a>
              <a href="${root}pages/faq.html">FAQ</a>
            </div>
          </div>
          <div class="foot-col">
            <h5>Company</h5>
            <div class="foot-col-links">
              <a href="${root}pages/about.html">About</a>
              <a href="#">Blog</a>
              <a href="${root}pages/contact.html">Contact</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
        <div class="foot-bottom">
          <div class="foot-copy">© 2026 NexCode. All rights reserved.</div>
          <div class="foot-status"><span class="sdot"></span>All systems operational</div>
          <div class="foot-legal">
            <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  `);

  /* WebGL particle field */
  (function initWebGL() {
    if (typeof THREE === 'undefined') { setTimeout(initWebGL, 100); return; }
    const canvas = document.getElementById('webgl');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 1000);
    camera.position.z = 5;

    const COUNT = 1600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const siz = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - .5) * 28;
      pos[i * 3 + 1] = (Math.random() - .5) * 18;
      pos[i * 3 + 2] = (Math.random() - .5) * 14;
      const r = Math.random();
      if (r < .6) { col[i * 3] = .18; col[i * 3 + 1] = .42; col[i * 3 + 2] = 1; }      // royal blue
      else if (r < .82) { col[i * 3] = .36; col[i * 3 + 1] = .55; col[i * 3 + 2] = 1; } // light blue
      else { col[i * 3] = .13; col[i * 3 + 1] = .83; col[i * 3 + 2] = .93; }            // cyan
      siz[i] = Math.random() * 2.2 + .4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute vec3 color; attribute float size;
        varying vec3 vColor; varying float vAlpha;
        uniform float time;
        void main(){
          vColor = color;
          vec3 p = position;
          p.y += sin(time*.4 + position.x*.5)*.18;
          p.x += cos(time*.3 + position.z*.4)*.12;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vAlpha = clamp(1.0 - length(mv.xyz)/18.0, 0.0, 1.0);
          gl_PointSize = size * (280.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vAlpha;
        void main(){
          float d = length(gl_PointCoord - vec2(.5));
          if(d > .5) discard;
          gl_FragColor = vec4(vColor, smoothstep(.5,.1,d) * vAlpha * .55);
        }`,
      transparent: true, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    let mx = 0, my = 0;
    window.addEventListener('mousemove', e => { mx = (e.clientX / window.innerWidth - .5) * 2; my = -(e.clientY / window.innerHeight - .5) * 2; });
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    const clock = new THREE.Clock();
    (function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mat.uniforms.time.value = t;
      particles.rotation.y = t * .018 + mx * .06;
      particles.rotation.x = my * .04;
      renderer.render(scene, camera);
    })();
  })();
})();
