"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const points = useMemo(() => {
    const pts = [];
    const count = 2000;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2;
      pts.push(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
        Math.cos(phi) * radius,
      );
    }
    return new Float32Array(pts);
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group>
      {/* الكرة الشفافة */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.12}
        />
      </Sphere>

      {/* النقاط المضيئة */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2000}
            array={points}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00e5ff"
          size={0.02}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* حلقات حول الكرة */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.005, 16, 100]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.5, 0.003, 16, 100]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function CyberGlobe() {
  return (
    <div className="absolute inset-0 z-0 opacity-70">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#00e5ff" />
        <GlobeMesh />
      </Canvas>
    </div>
  );
}
