import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Text, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Animated floating card component
function FloatingCard({ position, color, title, delay = 0, icon }: { 
  position: [number, number, number]; 
  color: string; 
  title: string; 
  delay?: number;
  icon?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + delay) * 0.1;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + delay) * 0.1;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.3}
      floatIntensity={0.5}
    >
      <group position={position}>
        {/* Main card */}
        <RoundedBox
          ref={meshRef}
          args={[2.2, 1.4, 0.1]}
          radius={0.05}
          smoothness={4}
        >
          <meshStandardMaterial 
            color={color} 
            roughness={0.2}
            metalness={0.1}
          />
        </RoundedBox>
        
        {/* Card header bar */}
        <RoundedBox
          args={[2.0, 0.15, 0.12]}
          radius={0.02}
          position={[0, 0.55, 0.05]}
        >
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </RoundedBox>
        
        {/* Content lines simulation */}
        {[0, 1, 2].map((i) => (
          <RoundedBox
            key={i}
            args={[1.6 - i * 0.2, 0.08, 0.12]}
            radius={0.02}
            position={[-0.2 + i * 0.1, 0.2 - i * 0.25, 0.05]}
          >
            <meshStandardMaterial color="#ffffff" opacity={0.4 - i * 0.1} transparent />
          </RoundedBox>
        ))}
        
        {/* Icon circle */}
        <mesh position={[-0.8, 0.4, 0.08]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      </group>
    </Float>
  );
}

// Central AI core sphere
function AICore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <group>
      {/* Main sphere */}
      <Float speed={1.5} floatIntensity={0.3}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial 
            color="#3b82f6"
            roughness={0.1}
            metalness={0.8}
            emissive="#1d4ed8"
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>
      
      {/* Orbiting rings */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.02, 16, 100]} />
          <meshStandardMaterial color="#60a5fa" opacity={0.6} transparent />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.4, 0.015, 16, 100]} />
          <meshStandardMaterial color="#93c5fd" opacity={0.4} transparent />
        </mesh>
      </group>
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <mesh 
          key={i}
          position={[
            Math.cos(i * Math.PI / 3) * 1.8,
            Math.sin(i * Math.PI / 3) * 0.5,
            Math.sin(i * Math.PI / 3) * 1.5
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#dbeafe" emissive="#3b82f6" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Connection lines between elements
function ConnectionLines() {
  const linesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const points = useMemo(() => [
    new THREE.Vector3(-2.5, 1, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(2.5, 1, 0),
    new THREE.Vector3(-2.5, -1, 0),
    new THREE.Vector3(2.5, -1, 0),
  ], []);

  return (
    <group ref={linesRef}>
      {/* Lines from center to cards */}
      {points.slice(1).map((point, i) => (
        <mesh key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, point.x, point.y, point.z])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#60a5fa" opacity={0.3} transparent />
        </mesh>
      ))}
    </group>
  );
}

// Main scene
function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={50} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, 3, 2]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[5, -3, 2]} intensity={0.5} color="#8b5cf6" />
      
      <Environment preset="city" />
      
      {/* Central AI Core */}
      <AICore />
      
      {/* Floating Dashboard Cards */}
      <FloatingCard 
        position={[-2.5, 1.2, 0]} 
        color="#3b82f6" 
        title="AI Content"
        delay={0}
      />
      <FloatingCard 
        position={[2.5, 1.2, 0]} 
        color="#8b5cf6" 
        title="Lead Capture"
        delay={1}
      />
      <FloatingCard 
        position={[-2.5, -1.2, 0]} 
        color="#10b981" 
        title="Analytics"
        delay={2}
      />
      <FloatingCard 
        position={[2.5, -1.2, 0]} 
        color="#f59e0b" 
        title="Scheduling"
        delay={3}
      />
      
      {/* Connection visualization */}
      <ConnectionLines />
    </>
  );
}

// Export the 3D Dashboard component
export default function Dashboard3D() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
