import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Text3D, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';

// AI Brain visualization
function AIBrain() {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    if (nodesRef.current) {
      nodesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      nodesRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  // Generate neural network nodes
  const nodes = Array.from({ length: 20 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2,
    ] as [number, number, number],
    size: 0.05 + Math.random() * 0.08,
    color: ['#3b82f6', '#60a5fa', '#93c5fd'][Math.floor(Math.random() * 3)],
  }));

  return (
    <group ref={groupRef}>
      {/* Central brain core */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh>
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial 
            color="#3b82f6" 
            roughness={0.3}
            metalness={0.6}
            emissive="#1d4ed8"
            emissiveIntensity={0.2}
            wireframe
          />
        </mesh>
      </Float>
      
      {/* Inner glowing sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color="#60a5fa"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Neural nodes */}
      <group ref={nodesRef}>
        {nodes.map((node, i) => (
          <Float key={i} speed={2 + Math.random()} floatIntensity={0.2}>
            <mesh position={node.position}>
              <sphereGeometry args={[node.size, 8, 8]} />
              <meshStandardMaterial 
                color={node.color}
                emissive={node.color}
                emissiveIntensity={0.6}
              />
            </mesh>
            {/* Connection lines to center */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([...node.position, 0, 0, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#60a5fa" opacity={0.2} transparent />
            </line>
          </Float>
        ))}
      </group>
      
      {/* Data flow particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`particle-${i}`}
          position={[
            Math.cos(i * Math.PI / 4) * 1.5,
            Math.sin(i * Math.PI / 4) * 0.5,
            Math.sin(i * Math.PI / 4) * 1.5,
          ]}
        >
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#dbeafe" emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

// Lead Management visualization
function LeadFunnel() {
  const funnelRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (funnelRef.current) {
      funnelRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const funnelStages = [
    { width: 1.8, color: '#f59e0b', y: 1.2 },
    { width: 1.4, color: '#f97316', y: 0.4 },
    { width: 1.0, color: '#ef4444', y: -0.4 },
    { width: 0.6, color: '#10b981', y: -1.2 },
  ];

  return (
    <group ref={funnelRef}>
      {funnelStages.map((stage, i) => (
        <Float key={i} speed={1.5} floatIntensity={0.1} delay={i * 0.2}>
          <mesh position={[0, stage.y, 0]}>
            <cylinderGeometry args={[stage.width / 2, stage.width / 2, 0.3, 32]} />
            <meshStandardMaterial 
              color={stage.color}
              roughness={0.2}
              metalness={0.4}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* Glow ring */}
          <mesh position={[0, stage.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[stage.width / 2 + 0.05, 0.02, 8, 64]} />
            <meshBasicMaterial color={stage.color} />
          </mesh>
        </Float>
      ))}
      
      {/* Flowing leads */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={`lead-${i}`}
          position={[
            (Math.random() - 0.5) * 1.5,
            1.5 - (i * 0.3),
            (Math.random() - 0.5) * 0.5,
          ]}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Main scene
function AIScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#3b82f6" />
      <Stars count={200} factor={4} fade speed={0.5} />
      <AIBrain />
    </>
  );
}

function LeadScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[3, 0, 5]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, 3, 2]} intensity={0.5} color="#f59e0b" />
      <LeadFunnel />
    </>
  );
}

// Exports
export function AIFeature3D() {
  return (
    <div className="w-full h-full min-h-[350px]">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <AIScene />
      </Canvas>
    </div>
  );
}

export function LeadFeature3D() {
  return (
    <div className="w-full h-full min-h-[350px]">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <LeadScene />
      </Canvas>
    </div>
  );
}
