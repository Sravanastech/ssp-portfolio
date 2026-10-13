import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ParticleSystem = () => {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const particleCount = 50;
    groupRef.current.children.forEach((particle, idx) => {
      const rotation =
        Date.now() * 0.0001 + (idx / particleCount) * Math.PI * 2;
      const radius = 2.5 + Math.sin(Date.now() * 0.0005 + idx) * 1;
      particle.position.x =
        Math.cos(rotation) * radius + mouseRef.current.x * 0.3;
      particle.position.y =
        Math.sin(rotation * 0.7) * radius + mouseRef.current.y * 0.3;
      particle.position.z = Math.cos(rotation * 1.3) * (radius * 0.4);
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshPhongMaterial
            color={new THREE.Color().setHSL(0.6 + i * 0.005, 0.8, 0.6)}
            emissive={new THREE.Color().setHSL(0.6 + i * 0.005, 0.8, 0.4)}
          />
        </mesh>
      ))}
    </group>
  );
};

const ArchitectureCore = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x += 0.0005;
      groupRef.current.rotation.y += 0.0008;
      groupRef.current.rotation.z += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central cube */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshPhongMaterial
          color="#FDB913"
          emissive="#FDB913"
          emissiveIntensity={0.3}
          wireframe={false}
        />
      </mesh>

      {/* Orbiting spheres */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 2.5;
        const z = Math.sin(angle) * 2.5;
        return (
          <mesh key={`sphere-${i}`} position={[x, 0, z]}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshPhongMaterial
              color="#17A2B8"
              emissive="#17A2B8"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const AnimatedHeroScene = () => {
  return (
    <div className="w-full h-full min-h-125">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: "transparent" }}
        dpr={typeof window !== "undefined" ? window.devicePixelRatio : 1}
      >
        <ArchitectureCore />
        <ParticleSystem />
        <ambientLight intensity={0.6} />
        <pointLight position={[8, 8, 8]} intensity={0.8} />
        <pointLight position={[-8, -8, -8]} intensity={0.3} color="#FDB913" />
      </Canvas>
    </div>
  );
};
