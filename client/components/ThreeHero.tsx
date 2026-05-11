import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere, Stars } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere args={[1, 64, 64]} scale={1.5}>
        <MeshDistortMaterial
          ref={(ref) => {
            if (ref) {
              ref.uniforms.distort.value = 0.4;
              ref.uniforms.frequency.value = 3;
            }
          }}
          color="#4F46E5"
          emissive="#1E3A8A"
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.8}
          distort={0.4}
          speed={2}
        />
      </Sphere>
    </Float>
  );
}

function FloatingCube({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={3} rotationIntensity={2} floatIntensity={1.5}>
      <mesh position={position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export default function ThreeHero() {
  return (
    <div className="w-full h-96 md:h-[500px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4F46E5" />

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        <AnimatedSphere />

        <FloatingCube position={[-3, 1, 0]} color="#3B82F6" />
        <FloatingCube position={[3, -1, 0]} color="#8B5CF6" />
        <FloatingCube position={[2, 2, -2]} color="#10B981" />
        <FloatingCube position={[-2, -2, -1]} color="#F59E0B" />

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
