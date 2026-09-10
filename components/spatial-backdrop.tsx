'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const models: Record<string, string> = { overview: 'campus-core', transactions: 'transactions', budgets: 'budgets', goals: 'goals', accounts: 'accounts', college: 'college', toolkit: 'toolkit', reports: 'reports', settings: 'campus-core', admin: 'accounts' };

export function SpatialBackdrop({ view }: { view: string }) {
  const host = useRef<HTMLDivElement>(null);
  const active = useRef(view);
  const choose = useRef<(view: string) => void>(() => {});
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { active.current = view; choose.current(view); }, [view]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, cleanup = () => {};
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    pausedRef.current = motion.matches; setPaused(motion.matches);
    const motionChanged = () => { pausedRef.current = motion.matches; setPaused(motion.matches); };
    motion.addEventListener('change', motionChanged);
    async function setup() {
      const [T, { GLTFLoader }, { RoomEnvironment }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js'),
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'),
      ]);
      if (disposed || !element) return;
      const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
      const mobile = innerWidth < 700;
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
      element.appendChild(renderer.domElement);
      const scene = new T.Scene(); scene.background = new T.Color('#06120f'); scene.fog = new T.FogExp2('#06120f', .033);
      const camera = new T.PerspectiveCamera(38, 1, .1, 70); camera.position.set(0, 0, 12);
      const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment(), environment = pmrem.fromScene(room, .05);
      scene.environment = environment.texture; room.dispose(); pmrem.dispose();
      const key = new T.DirectionalLight('#daf5e9', 2.5); key.position.set(2, 4, 7); scene.add(key);
      const rim = new T.PointLight('#52ffba', 38, 20); rim.position.set(-3, 3, 4); scene.add(rim);
      const warm = new T.PointLight('#ffbb63', 30, 20); warm.position.set(5, -1, 4); scene.add(warm);
      scene.add(new T.AmbientLight('#6cd3a1', .7));
      const anchor = new T.Group(); scene.add(anchor);
      const cache = new Map<string, import('three').Group>();
      const loading = new Set<string>();
      let target = '', dirty = true;
      const disposeModel = (object: import('three').Object3D) => object.traverse(o => { if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
      const loader = new GLTFLoader();
      choose.current = nextView => {
        target = models[nextView] || 'campus-core'; dirty = true;
        if (cache.has(target) || loading.has(target)) return;
        const id = target; loading.add(id);
        loader.load(`/3d/${id}.glb`, gltf => {
          loading.delete(id);
          if (disposed) { disposeModel(gltf.scene); return; }
          const object = gltf.scene; object.scale.setScalar(.001); object.rotation.set(.1, -.26, -.1); anchor.add(object); cache.set(id, object); dirty = true; setReady(true);
        }, undefined, () => { loading.delete(id); });
      };
      choose.current(active.current);
      const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new T.Vector2(1, 1), .24, .4, 1.3); composer.addPass(bloom); composer.addPass(new OutputPass());
      let seed = 119; const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
      const count = mobile ? 200 : 650, points = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) points.set([(random() - .5) * 30, (random() - .5) * 18, -random() * 15], i * 3);
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(points, 3));
      const particles = new T.Points(geometry, new T.PointsMaterial({ color: '#69caa1', size: .022, transparent: true, opacity: .6, depthWrite: false })); scene.add(particles);
      const grid = new T.GridHelper(80, 55, '#276449', '#133428'); grid.position.y = -5; grid.position.z = -15; scene.add(grid);
      const orbit = new T.Group(); anchor.add(orbit);
      for (let i = 0; i < 3; i++) {
        const curve = new T.EllipseCurve(0, 0, 4 + i * .35, 4 + i * .35, 0, Math.PI * 2, false, 0);
        const line = new T.LineLoop(new T.BufferGeometry().setFromPoints(curve.getPoints(160)), new T.LineBasicMaterial({ color: i === 1 ? '#9d8150' : '#2f7959', transparent: true, opacity: .24 }));
        line.rotation.set(.5 + i * .4, .3, .2); orbit.add(line);
      }
      let px = 0, py = 0, frame = 0, last = 0, t = 0;
      const pointer = (e: PointerEvent) => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; };
      window.addEventListener('pointermove', pointer, { passive: true });
      const resize = () => { const w = element.clientWidth, h = element.clientHeight; if (!w || !h) return; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); const narrow = w < 700; anchor.position.set(narrow ? 1.8 : camera.aspect * 1.9, narrow ? 2.8 : 1.45, 0); anchor.scale.setScalar(narrow ? .55 : .85); dirty = true; };
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      const draw = (now: number) => {
        frame = requestAnimationFrame(draw);
        if (document.hidden || now - last < (mobile ? 40 : 30)) return;
        if (pausedRef.current && !dirty) { last = now; return; }
        const dt = Math.min((now - last) / 1000, .05); last = now;
        let transitioning = false;
        cache.forEach((object, id) => {
          const desired = id === target ? (id === 'campus-core' ? 1.15 : 1.30) : .001;
          const scale = pausedRef.current ? desired : T.MathUtils.damp(object.scale.x, desired, 5, dt);
          object.scale.setScalar(scale); object.visible = scale > .01;
          if (Math.abs(scale - desired) > .002) transitioning = true;
          if (!pausedRef.current && object.visible) {
            object.position.y = Math.sin(t * .6) * .1;
            object.rotation.y = T.MathUtils.damp(object.rotation.y, -.25 + px * .28, 2, dt);
            if (id === 'campus-core') object.traverse(o => { if (o.name.startsWith('GYRO_')) o.rotation.y += dt * .11; });
            else object.rotation.z = Math.sin(t * .3) * .05;
          }
        });
        if (!pausedRef.current) { t += dt; particles.rotation.y = t * .006; orbit.rotation.y = t * .035; camera.position.x = T.MathUtils.damp(camera.position.x, px * .16, 2, dt); camera.position.y = T.MathUtils.damp(camera.position.y, -py * .12, 2, dt); camera.lookAt(0, 0, 0); }
        composer.render(); dirty = transitioning;
      };
      frame = requestAnimationFrame(draw);
      const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(frame); setReady(false); };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      cleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('pointermove', pointer); renderer.domElement.removeEventListener('webglcontextlost', lost); disposeModel(scene); environment.dispose(); bloom.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove(); choose.current = () => {}; };
    }
    setup().catch(() => setReady(false));
    return () => { disposed = true; cleanup(); motion.removeEventListener('change', motionChanged); };
  }, []);

  return <><div className={`spatial-backdrop ${ready ? 'is-ready' : ''}`} ref={host} aria-hidden="true" /><div className="spatial-atmosphere" aria-hidden="true" /><Button className="spatial-motion" variant="outline" size="sm" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume 3D motion' : 'Pause 3D motion'}>{paused ? <Play /> : <Pause />}<span>{paused ? 'Motion paused' : '3D motion'}</span></Button></>;
}
