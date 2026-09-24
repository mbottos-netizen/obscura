import * as THREE from 'three'

/** Premium material library. Created lazily, shared everywhere. */
let lib: ReturnType<typeof create> | null = null

function create() {
  return {
    chrome: new THREE.MeshPhysicalMaterial({
      color: '#dcd9d4',
      metalness: 1,
      roughness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.2,
    }),
    satinChrome: new THREE.MeshPhysicalMaterial({
      color: '#bdb9b2',
      metalness: 1,
      roughness: 0.28,
      envMapIntensity: 1.1,
    }),
    ivory: new THREE.MeshPhysicalMaterial({
      color: '#d9d1c3',
      roughness: 0.48,
      metalness: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      sheen: 0.4,
      sheenColor: new THREE.Color('#fff4e3'),
    }),
    plaster: new THREE.MeshStandardMaterial({ color: '#b9ae9c', roughness: 0.94, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ color: '#d7cfc2', roughness: 0.9, metalness: 0 }),
    plasterDark: new THREE.MeshStandardMaterial({ color: '#8f8577', roughness: 0.96, metalness: 0 }),
    basalt: new THREE.MeshPhysicalMaterial({ color: '#141312', roughness: 0.55, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    signal: new THREE.MeshPhysicalMaterial({
      color: '#ff4d1f',
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.25,
    }),
    bone: new THREE.MeshStandardMaterial({ color: '#efeae2', roughness: 0.82, metalness: 0 }),
    graphite: new THREE.MeshStandardMaterial({ color: '#1d1d20', roughness: 0.4, metalness: 0.6 }),
    frosted: new THREE.MeshPhysicalMaterial({
      color: '#f3f6f7',
      roughness: 0.32,
      metalness: 0,
      transmission: 1,
      thickness: 1.4,
      ior: 1.42,
      attenuationColor: new THREE.Color('#d9e6ea'),
      attenuationDistance: 2.5,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
    }),
    frostedLite: new THREE.MeshPhysicalMaterial({
      color: '#e6ecee',
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
    }),
  }
}

export const materials = () => (lib ??= create())
export type MaterialLib = ReturnType<typeof create>
