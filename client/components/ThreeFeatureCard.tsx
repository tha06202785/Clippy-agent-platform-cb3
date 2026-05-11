import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, RoundedBox, Stars, Text3D } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

interface ThreeFeatureCardProps {
  color: string;
  title: string;
}

function FeatureShape({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
      <RoundedBox args={[2, 2, 0.5]} radius={0.2} smoothness={4} scale={0.8}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.7}
          distort={0.3}
          speed={1.5}
        />
      </RoundedBox>
    </Float>
  );
}

function FloatingParticles() {
  const count = 20;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const position: [number, number, number] = [
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 2,
    ];

    particles.push(
      <mesh key={i} position={position}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
    );
  }

  return <>{particles}</>;
}

export default function ThreeFeatureCard({ color, title }: ThreeFeatureCardProps) {
  return (
    <div className="w-full h-full min-h-[280px]">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 3]} intensity={1} />
        <pointLight position={[-5, -5, -3]} intensity={0.5} color={color} />

        <FeatureShape color={color} />
        <FloatingParticles />

        <Stars radius={50} depth={20} count={1000} factor={2} saturation={0} fade />
      </Canvas>
    </div>
  );
}
