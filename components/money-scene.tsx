'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Maximize2, Minimize2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './money-scene.css';

type Props = { balance: string; daily: string; savings: string; runway: string; month: string; onTransactions: () => void; onBudgets: () => void };

export function MoneyScene({ balance, daily, savings, runway, month, onTransactions, onBudgets }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    setPaused(motion.matches);
    const changeMotion = () => setPaused(motion.matches);
    motion.addEventListener('change', changeMotion);
    async function setup() {
      const [THREE, { GLTFLoader }, { RoomEnvironment }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js'),
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'),
      ]);
      if (disposed || !host) return;
      const mobile = innerWidth < 700;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.65));
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#030d0c'); scene.fog = new THREE.FogExp2('#030d0c', .048);
      const camera = new THREE.PerspectiveCamera(40, 1, .1, 70); camera.position.set(0, .1, 11);
      const pmrem = new THREE.PMREMGenerator(renderer); const env = new RoomEnvironment();
      const envTarget = pmrem.fromScene(env, .04); scene.environment = envTarget.texture; env.dispose(); pmrem.dispose();
      scene.add(new THREE.AmbientLight('#76e7c0', .7));
      const jade = new THREE.PointLight('#22ffc0', 55, 18); jade.position.set(-3, 3, 4); scene.add(jade);
      const amber = new THREE.PointLight('#ffc06a', 45, 15); amber.position.set(4, -2, 3); scene.add(amber);
      const key = new THREE.DirectionalLight('#ffffff', 3); key.position.set(2, 4, 6); scene.add(key);
      const group = new THREE.Group(); scene.add(group);
      const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .38, .45, 1.3); composer.addPass(bloom); composer.addPass(new OutputPass());
      let needsRender = true;
      let model: import('three').Group | undefined;
      const gyros: import('three').Object3D[] = [];
      const loader = new GLTFLoader();
      loader.load('/3d/campus-core.glb', gltf => {
        if (disposed) { gltf.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); return; }
        model = gltf.scene; group.add(model);
        model.traverse(o => { if (o.name.startsWith('GYRO_')) gyros.push(o); });
        model.rotation.set(.1, -.16, -.12); needsRender = true; setReady(true);
      }, undefined, () => setReady(false));
      const count = mobile ? 400 : 1100;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      let seed = 917;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < count; i++) {
        const a = random() * Math.PI * 2, radius = 3 + random() * 9;
        positions.set([Math.cos(a) * radius, (random() - .5) * 11, Math.sin(a) * radius - 5], i * 3);
        colors.set(i % 5 ? [.12, .65, .48] : [1, .58, .2], i * 3);
      }
      const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const dustMaterial = new THREE.PointsMaterial({ size: .027, vertexColors: true, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false });
      const dust = new THREE.Points(dustGeometry, dustMaterial); scene.add(dust);
      // Three dimensional energy ribbons wind around the Blender model.
      const ribbons: import('three').Line[] = [];
      for (let k = 0; k < 5; k++) {
        const points = [];
        for (let i = 0; i < 220; i++) { const t = i / 219; const a = t * Math.PI * 3 + k * 1.25; const r = 3.3 + .5 * Math.sin(t * 5 + k); points.push(new THREE.Vector3(Math.cos(a) * r, (t - .5) * 8, Math.sin(a) * r - 1)); }
        const ribbon = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: k % 2 ? '#52f7b9' : '#d69c4e', transparent: true, opacity: .16, blending: THREE.AdditiveBlending })); group.add(ribbon); ribbons.push(ribbon);
      }
      let pointerX = 0, pointerY = 0, intersecting = true, frame = 0, last = 0, t = 0;
      const move = (e: PointerEvent) => { const rect = host.getBoundingClientRect(); pointerX = (e.clientX - rect.left) / rect.width - .5; pointerY = (e.clientY - rect.top) / rect.height - .5; };
      const resetPointer = () => { pointerX = pointerY = 0; };
      host.parentElement?.addEventListener('pointermove', move); host.parentElement?.addEventListener('pointerleave', resetPointer);
      const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h); const narrow = w < 680; group.position.set(narrow ? 0 : 1.8, narrow ? 1.45 : .2, 0); group.scale.setScalar(narrow ? .66 : .94); needsRender = true; };
      const observer = new ResizeObserver(resize); observer.observe(host); resize();
      const intersection = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; }); intersection.observe(host);
      const draw = (now: number) => {
        frame = requestAnimationFrame(draw);
        if (!intersecting || document.hidden || now - last < (mobile ? 33 : 22)) return;
        if (pausedRef.current && !needsRender) { last = now; return; }
        const dt = Math.min((now - last) / 1000, .05); last = now;
        if (!pausedRef.current) {
          t += dt;
          gyros.forEach((o, i) => { o.rotation.y += dt * (.09 + i * .035) * (i === 1 ? -1 : 1); o.rotation.z += dt * .018 * (i + 1); });
          if (model) { model.position.y = Math.sin(t * .65) * .09; model.rotation.y += ((-.16 + pointerX * .22) - model.rotation.y) * .025; }
          dust.rotation.y = t * .012;
          ribbons.forEach((o, i) => { o.rotation.y = Math.sin(t * .11 + i) * .16; });
          camera.position.x += (pointerX * .35 - camera.position.x) * .025; camera.position.y += (.1 - pointerY * .22 - camera.position.y) * .025; camera.lookAt(0, 0, 0);
        }
        composer.render(); needsRender = false;
      };
      frame = requestAnimationFrame(draw);
      const lost = (e: Event) => { e.preventDefault(); setReady(false); cancelAnimationFrame(frame); };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); host.parentElement?.removeEventListener('pointermove', move); host.parentElement?.removeEventListener('pointerleave', resetPointer);
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        scene.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
        envTarget.dispose(); bloom.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    }
    setup().catch(() => { if (!disposed) setReady(false); });
    return () => { disposed = true; motion.removeEventListener('change', changeMotion); cleanup(); };
  }, []);

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === section.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await section.current?.requestFullscreen(); } catch { /* Fullscreen is optional; the embedded scene remains usable. */ } }

  return <section ref={section} className="money-universe" aria-label="Your money plan">
    <div className={`money-universe__canvas ${ready ? 'is-ready' : ''}`} ref={mount} aria-hidden="true" />
    {!ready && <Image className="money-universe__poster" src="/3d/core-poster.png" alt="" fill unoptimized />}
    <div className="money-universe__shade" />
    <div className="money-universe__top"><span><i /> {month} / MONEY PLAN</span><div><Button variant="ghost" size="icon" className="universe-control" aria-label={paused ? 'Play background animation' : 'Pause background animation'} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</Button><Button variant="ghost" size="icon" className="universe-control" aria-label={expanded ? 'Exit immersive view' : 'Open immersive view'} onClick={fullscreen}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button></div></div>
    <div className="money-universe__copy"><span className="money-universe__eyebrow">YOUR FUTURE. IN MOTION.</span><h2>Small moves.<br /><em>Infinite</em><br />possibilities.</h2><p><strong>{balance}</strong> available to direct with intention.<br />Give every rupee a purpose.</p><div className="money-universe__actions"><Button onClick={onTransactions} className="universe-primary">Log a transaction <ArrowUpRight size={17} /></Button><Button onClick={onBudgets} variant="ghost" className="universe-secondary">Review budgets</Button></div></div>
    <div className="money-universe__object-label"><span>01 / THE MONEY CORE</span><i /><small>PLAN · SAVE · GROW</small></div>
    <div className="money-universe__metrics"><div><span>SAFE DAILY SPEND</span><strong>{daily}</strong></div><div><span>SAVINGS RATE</span><strong>{savings}</strong></div><div><span>BALANCE RUNWAY</span><strong>{runway}</strong></div><p>Build the life<br />you have in mind. <ArrowUpRight size={20} /></p></div>
  </section>;
}
