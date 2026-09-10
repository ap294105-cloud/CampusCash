'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
const destinations=[{view:'transactions',label:'Spending',model:'transactions'},{view:'goals',label:'Savings',model:'goals'},{view:'college',label:'College fees',model:'college'},{view:'reports',label:'Insights',model:'reports'}];
export function CampusExplorer({onNavigate}:{onNavigate:(view:string)=>void}){
 const host=useRef<HTMLDivElement>(null),navigate=useRef(onNavigate),select=useRef<(i:number)=>void>(()=>{});
 const [ready,setReady]=useState(false),[light,setLight]=useState(false);
 useEffect(()=>{const update=()=>{setLight(localStorage.getItem('campus-visual-mode')==='light');setReady(false);};update();window.addEventListener('campus-quality',update);return()=>window.removeEventListener('campus-quality',update);},[]);
 useEffect(()=>{navigate.current=onNavigate;},[onNavigate]);
 useEffect(()=>{
  if(light)return;
  let disposed=false,clean=()=>{};
  (async()=>{
   const [T,{GLTFLoader}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js')]);if(disposed||!host.current)return;
   const el=host.current,renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.3));el.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,100);camera.position.set(0,3,16);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight('#e6fff0','#27563b',3));const light=new T.DirectionalLight('#ffdf9e',4);light.position.set(3,5,8);scene.add(light);
   const groups:import('three').Group[]=[],loader=new GLTFLoader();let frame=0,target=-1,chosenAt=0,visible=true,last=0;
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');
   const dispose=(object:import('three').Object3D)=>object.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
   destinations.forEach((d,i)=>loader.load('/3d/'+d.model+'.glb',g=>{if(disposed){dispose(g.scene);return;}const box=new T.Box3().setFromObject(g.scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());g.scene.position.sub(center);const wrapper=new T.Group();wrapper.add(g.scene);wrapper.scale.setScalar(2.5/Math.max(size.x,size.y,size.z));wrapper.position.x=(i-1.5)*3.6;wrapper.userData.index=i;scene.add(wrapper);groups.push(wrapper);setReady(true);},undefined,()=>{}));
   const resize=()=>{if(!el.clientWidth)return;renderer.setSize(el.clientWidth,260);camera.aspect=el.clientWidth/260;camera.position.z=el.clientWidth<600?27:16;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();
   const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(el);
   select.current=i=>{if(target>=0)return;if(reduced.matches){navigate.current(destinations[i].view);return;}target=i;chosenAt=performance.now();};
   const click=(e:MouseEvent)=>{const bounds=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1),camera);const hit=ray.intersectObjects(groups,true)[0];if(hit){let o=hit.object;while(o.parent&&o.userData.index===undefined)o=o.parent;select.current(o.userData.index);}};el.addEventListener('click',click);
   const draw=(now:number)=>{frame=requestAnimationFrame(draw);if(document.hidden||!visible||now-last<40)return;last=now;if(!reduced.matches)groups.forEach(g=>{g.rotation.y=Math.sin(now*.0003+g.userData.index)*.2;});if(target>=0){const p=Math.min(1,(now-chosenAt)/500);camera.position.x=T.MathUtils.lerp(camera.position.x,(target-1.5)*3.6,.15);camera.position.z=T.MathUtils.lerp(camera.position.z,8,.1);camera.lookAt((target-1.5)*3.6*p,0,0);if(p===1){navigate.current(destinations[target].view);target=-1;}}renderer.render(scene,camera);};frame=requestAnimationFrame(draw);
   clean=()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();el.removeEventListener('click',click);dispose(scene);renderer.dispose();renderer.domElement.remove();select.current=()=>{};};
  })().catch(()=>{});
  return()=>{disposed=true;clean();};
 },[light]);
 return <div className="upgrade-card campus-explorer"><h2>Explore your money campus</h2><p>Choose a 3D landmark to open its workspace.</p><div ref={host} className="campus-canvas" aria-hidden="true" style={{display:ready?'block':'none'}}/><div className="campus-links">{destinations.map((d,i)=><Button key={d.view} variant="outline" onClick={()=>ready?select.current(i):onNavigate(d.view)}>{d.label}</Button>)}</div></div>;
}
