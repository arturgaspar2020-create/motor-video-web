import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Props = { name: string; type: string; directives: string[]; ratio: "16:9" | "9:16" | "1:1"; modelUrl?: string };

function valueOf(directives: string[], key: string) {
  const line = directives.find(item => new RegExp("^\\[" + key + "\\s*:", "i").test(item));
  return line ? line.slice(line.indexOf(":") + 1, -1).trim() : "";
}

export default function Scene3DPreview({ name, type, directives, ratio, modelUrl }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      root.dataset.error = "WebGL indisponível neste navegador ou driver.";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(root.clientWidth, root.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    root.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#91a9bd");
    scene.fog = new THREE.Fog("#91a9bd", 16, 42);
    const camera = new THREE.PerspectiveCamera(38, root.clientWidth / root.clientHeight, 0.1, 100);
    camera.position.set(7, 5.2, 10);
    camera.lookAt(0, 1.4, 0);

    scene.add(new THREE.HemisphereLight(0xc9e4ff, 0x514333, 2.1));
    const sun = new THREE.DirectionalLight(0xffd6a0, 3.2);
    sun.position.set(-5, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8cbcff, 1.8);
    rim.position.set(5, 4, -5); scene.add(rim);

    const mat = (color: string, roughness = 0.82, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat("#52634c"));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.04; ground.receiveShadow = true; scene.add(ground);

    const mountainMat = mat("#526b79");
    for (let i = 0; i < 8; i++) {
      const h = 3 + (i % 3) * 1.25;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(2.4 + (i % 2), h, 5), mountainMat);
      mountain.position.set(-12 + i * 3.5, h / 2 - 0.2, -12 - (i % 3) * 2);
      mountain.rotation.y = i * 0.7; scene.add(mountain);
    }
    const trunkMat = mat("#59402d"), leafMat = mat("#294d3d");
    for (let i = 0; i < 13; i++) {
      const x = (i % 2 ? 1 : -1) * (4.5 + (i % 4) * 1.15);
      const z = -3 - Math.floor(i / 2) * 2.2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, 2.2, 7), trunkMat);
      trunk.position.set(x, 1.1, z); trunk.castShadow = true; scene.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(.95 + (i % 3) * .16, 2.5, 7), leafMat);
      crown.position.set(x, 2.7, z); crown.castShadow = true; scene.add(crown);
    }

    const actor = new THREE.Group(); scene.add(actor);
    const skin = mat("#d7a47d"), cloth = mat("#b66a3c"), dark = mat("#263447");
    const make = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    make(new THREE.CapsuleGeometry(.48, .82, 5, 10), cloth, actor, 0, 1.45, 0);
    make(new THREE.SphereGeometry(.39, 20, 16), skin, actor, 0, 2.42, 0);
    make(new THREE.SphereGeometry(.405, 20, 12), dark, actor, 0, 2.67, -.02).scale.set(1.04, .56, 1.02);
    make(new THREE.BoxGeometry(.16, .09, .06), mat("#f4eee1"), actor, -.14, 2.43, .355);
    make(new THREE.BoxGeometry(.16, .09, .06), mat("#f4eee1"), actor, .14, 2.43, .355);
    make(new THREE.SphereGeometry(.045, 10, 8), dark, actor, -.14, 2.43, .39);
    make(new THREE.SphereGeometry(.045, 10, 8), dark, actor, .14, 2.43, .39);
    const armL = new THREE.Group(); armL.position.set(-.55, 1.92, 0); actor.add(armL);
    make(new THREE.CapsuleGeometry(.14, .53, 4, 8), cloth, armL, 0, -.32, 0);
    make(new THREE.SphereGeometry(.15, 12, 10), skin, armL, 0, -.68, 0);
    const armR = new THREE.Group(); armR.position.set(.55, 1.92, 0); actor.add(armR);
    make(new THREE.CapsuleGeometry(.14, .53, 4, 8), cloth, armR, 0, -.32, 0);
    make(new THREE.SphereGeometry(.15, 12, 10), skin, armR, 0, -.68, 0);
    const legL = new THREE.Group(); legL.position.set(-.23, 1.02, 0); actor.add(legL);
    make(new THREE.CapsuleGeometry(.17, .65, 4, 8), dark, legL, 0, -.42, 0);
    make(new THREE.BoxGeometry(.3, .16, .48), dark, legL, 0, -.84, .12);
    const legR = new THREE.Group(); legR.position.set(.23, 1.02, 0); actor.add(legR);
    make(new THREE.CapsuleGeometry(.17, .65, 4, 8), dark, legR, 0, -.42, 0);
    make(new THREE.BoxGeometry(.3, .16, .48), dark, legR, 0, -.84, .12);
    const pack = make(new THREE.BoxGeometry(.62, .72, .28), mat("#8a5735"), actor, 0, 1.55, -.43);
    pack.rotation.x = -.08;

    const prop = new THREE.Group(); prop.position.set(1.15, 1.65, .1); actor.add(prop);
    const map = make(new THREE.BoxGeometry(.55, .04, .72), mat("#e5d5a7"), prop, 0, 0, 0);
    map.rotation.x = -.22;
    const actionText = valueOf(directives, "acao") || valueOf(directives, "animacao");
    const hasMap = /mapa|map|carta|papel/i.test((name + " " + actionText + " " + directives.join(" ")));
    prop.visible = hasMap;

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (modelMixer) modelMixer.setTime(t);
      if (modelRoot) actor.visible = false;
      const moving = /corr|camin|andar|run|walk|fug/i.test(actionText + " " + type);
      actor.position.y = moving ? Math.abs(Math.sin(t * 5)) * .09 : Math.sin(t * 1.4) * .025;
      actor.rotation.y = Math.sin(t * .45) * .12;
      legL.rotation.x = moving ? Math.sin(t * 5) * .48 : 0;
      legR.rotation.x = moving ? -Math.sin(t * 5) * .48 : 0;
      armL.rotation.x = moving ? -Math.sin(t * 5) * .3 : Math.sin(t * 1.3) * .035;
      armR.rotation.x = moving ? Math.sin(t * 5) * .3 : -.12 + Math.sin(t * 1.2) * .04;
      prop.rotation.z = hasMap ? Math.sin(t * 1.1) * .04 : 0;
      camera.position.x = 7 + Math.sin(t * .16) * .55;
      camera.lookAt(0, 1.45, 0);
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      if (!root.clientWidth || !root.clientHeight) return;
      camera.aspect = root.clientWidth / root.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(root.clientWidth, root.clientHeight, false);
    };
    const observer = new ResizeObserver(resize); observer.observe(root);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect();
      if (modelRoot) { scene.remove(modelRoot); modelRoot.traverse(object => { const mesh=object as THREE.Mesh; if(mesh.geometry) mesh.geometry.dispose(); if(mesh.material){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats.forEach(material=>material.dispose());} }); }
      modelMixer?.stopAllAction();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === root) root.removeChild(renderer.domElement);
    };
  }, [name, type, directives.join("|"), ratio, modelUrl]);

  return <div className={"scene3d-frame " + (ratio === "9:16" ? "scene3d-vertical" : "")}>
    <div className="scene3d-canvas" ref={host} />
    <div className="scene3d-overlay"><span>PRÉVIA 3D REAL · THREE.JS</span><b>{name || type}</b></div>
    <div className="scene3d-footer">CENÁRIO PROCEDURAL · ANIMAÇÃO EM TEMPO REAL</div>
    <div className="scene3d-error">WebGL não está disponível. Atualize o driver ou habilite aceleração de hardware no navegador.</div>
  </div>;
}
