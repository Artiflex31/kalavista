import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import heroBackdrop from '../assets/kalavista-hero-backdrop.webp'
import './ArtAscent.css'

const ROUTE_START_Z = 118
const ROUTE_END_Z = -150
const TERRAIN_WIDTH = 74
const TERRAIN_LENGTH = ROUTE_START_Z - ROUTE_END_Z
const TERRAIN_CENTER_Z = (ROUTE_START_Z + ROUTE_END_Z) / 2
const TERRAIN_Y_OFFSET = -3.2
const ROAD_HALF_WIDTH = 2.15
const EYE_HEIGHT = 2.2

const COLOURS = {
  mountain: new THREE.Color('#263f72'),
  forest: new THREE.Color('#246653'),
  desert: new THREE.Color('#bb7049'),
  highlight: new THREE.Color('#f4d690'),
  roadMountain: new THREE.Color('#35415b'),
  roadForest: new THREE.Color('#4c4b38'),
  roadDesert: new THREE.Color('#9b7047'),
  skyMountain: new THREE.Color('#18325d'),
  skyForest: new THREE.Color('#17433e'),
  skyDesert: new THREE.Color('#8d4938'),
}

const ROAD_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 118),
    new THREE.Vector3(-5, 0, 86),
    new THREE.Vector3(-1, 0, 54),
    new THREE.Vector3(5, 0, 20),
    new THREE.Vector3(1, 0, -14),
    new THREE.Vector3(-5, 0, -48),
    new THREE.Vector3(-2, 0, -84),
    new THREE.Vector3(5, 0, -116),
    new THREE.Vector3(1, 0, -150),
  ],
  false,
  'centripetal',
  0.5,
)

function seededRandom(seed) {
  let value = seed >>> 0

  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function getZoneWeights(z, target) {
  const mountain = THREE.MathUtils.smoothstep(z, 26, 76)
  const desert = 1 - THREE.MathUtils.smoothstep(z, -98, -48)

  target.mountain = mountain
  target.desert = desert
  target.forest = THREE.MathUtils.clamp(1 - mountain - desert, 0, 1)

  return target
}

function getTerrainHeight(x, z) {
  const mountainWeight = THREE.MathUtils.smoothstep(z, 26, 76)
  const desertWeight = 1 - THREE.MathUtils.smoothstep(z, -98, -48)
  const forestWeight = THREE.MathUtils.clamp(
    1 - mountainWeight - desertWeight,
    0,
    1,
  )

  const sideDistance = Math.min(Math.abs(x) / 34, 1)

  const mountain =
    1.4 +
    10 * Math.pow(sideDistance, 1.6) +
    Math.sin(z * 0.11 + x * 0.31) * 1.1 +
    Math.cos(z * 0.06 - x * 0.44) * 0.8

  const forest =
    0.45 +
    Math.sin(z * 0.23 + x * 0.38) * 0.56 +
    Math.cos(x * 0.58 - z * 0.08) * 0.34 +
    sideDistance * 0.9

  const desert =
    0.25 +
    Math.sin(z * 0.14 + x * 0.2) * 0.62 +
    Math.cos(z * 0.07 - x * 0.5) * 0.35 +
    sideDistance * 0.5

  return (
    mountain * mountainWeight +
    forest * forestWeight +
    desert * desertWeight
  )
}

function paintTerrainColour(target, weights, height, x, z) {
  const pigment = 0.9 + Math.sin(x * 0.36 + z * 0.17) * 0.1

  target.setRGB(
    (COLOURS.mountain.r * weights.mountain +
      COLOURS.forest.r * weights.forest +
      COLOURS.desert.r * weights.desert) *
      pigment,
    (COLOURS.mountain.g * weights.mountain +
      COLOURS.forest.g * weights.forest +
      COLOURS.desert.g * weights.desert) *
      pigment,
    (COLOURS.mountain.b * weights.mountain +
      COLOURS.forest.b * weights.forest +
      COLOURS.desert.b * weights.desert) *
      pigment,
  )

  const highlight = THREE.MathUtils.clamp((height + 1) / 15, 0, 1) * 0.14
  target.lerp(COLOURS.highlight, highlight)
}

function paintRoadColour(target, weights) {
  target.setRGB(
    COLOURS.roadMountain.r * weights.mountain +
      COLOURS.roadForest.r * weights.forest +
      COLOURS.roadDesert.r * weights.desert,
    COLOURS.roadMountain.g * weights.mountain +
      COLOURS.roadForest.g * weights.forest +
      COLOURS.roadDesert.g * weights.desert,
    COLOURS.roadMountain.b * weights.mountain +
      COLOURS.roadForest.b * weights.forest +
      COLOURS.roadDesert.b * weights.desert,
  )
}

function createTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_WIDTH,
    TERRAIN_LENGTH,
    64,
    300,
  )

  const positions = geometry.attributes.position
  const colours = new Float32Array(positions.count * 3)
  const colour = new THREE.Color()
  const weights = { mountain: 0, forest: 0, desert: 0 }

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const worldZ = -positions.getY(index) + TERRAIN_CENTER_Z
    const height = getTerrainHeight(x, worldZ)

    positions.setZ(index, height)

    getZoneWeights(worldZ, weights)
    paintTerrainColour(colour, weights, height, x, worldZ)

    colours[index * 3] = colour.r
    colours[index * 3 + 1] = colour.g
    colours[index * 3 + 2] = colour.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingSphere()

  return geometry
}

function createRoadGeometry() {
  const segments = 440
  const positions = []
  const colours = []
  const uvs = []
  const indices = []

  const center = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const left = new THREE.Vector3()
  const right = new THREE.Vector3()
  const roadColour = new THREE.Color()
  const weights = { mountain: 0, forest: 0, desert: 0 }

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments

    ROAD_CURVE.getPointAt(progress, center)
    ROAD_CURVE.getTangentAt(progress, tangent)

    tangent.y = 0
    tangent.normalize()

    normal.set(-tangent.z, 0, tangent.x).normalize()

    left.copy(center).addScaledVector(normal, ROAD_HALF_WIDTH)
    right.copy(center).addScaledVector(normal, -ROAD_HALF_WIDTH)

    left.y = getTerrainHeight(left.x, left.z) + TERRAIN_Y_OFFSET + 0.12
    right.y = getTerrainHeight(right.x, right.z) + TERRAIN_Y_OFFSET + 0.12

    getZoneWeights(center.z, weights)
    paintRoadColour(roadColour, weights)

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)

    colours.push(
      roadColour.r,
      roadColour.g,
      roadColour.b,
      roadColour.r,
      roadColour.g,
      roadColour.b,
    )

    uvs.push(0, progress * 14, 1, progress * 14)
  }

  for (let index = 0; index < segments; index += 1) {
    const current = index * 2
    const next = current + 2

    indices.push(current, next, current + 1)
    indices.push(current + 1, next, next + 1)
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setIndex(indices)
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function PaintedTerrain() {
  const geometry = useMemo(createTerrainGeometry, [])

  return (
    <group position={[0, TERRAIN_Y_OFFSET, TERRAIN_CENTER_Z]}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={1}
          metalness={0.02}
        />
      </mesh>

      <mesh geometry={geometry} renderOrder={1}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function PaintedRoad() {
  const geometry = useMemo(createRoadGeometry, [])

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.96}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

function MountainRocks() {
  const rockRef = useRef()
  const rocks = useMemo(() => {
    const random = seededRandom(82)
    const center = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const normal = new THREE.Vector3()

    return Array.from({ length: 46 }, () => {
      const progress = 0.02 + random() * 0.27
      const side = random() > 0.5 ? 1 : -1
      const distance = 5 + random() * 23

      ROAD_CURVE.getPointAt(progress, center)
      ROAD_CURVE.getTangentAt(progress, tangent)

      normal.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(side)

      const x = center.x + normal.x * distance
      const z = center.z + normal.z * distance

      return {
        x,
        z,
        y: getTerrainHeight(x, z) + TERRAIN_Y_OFFSET,
        scale: 0.45 + random() * 1.65,
        rotation: random() * Math.PI,
        colour: random() > 0.5 ? '#344b76' : '#5f5377',
      }
    })
  }, [])

  useLayoutEffect(() => {
    const mesh = rockRef.current

    if (!mesh) return

    const object = new THREE.Object3D()
    const colour = new THREE.Color()

    rocks.forEach((rock, index) => {
      object.position.set(rock.x, rock.y + rock.scale * 0.55, rock.z)
      object.rotation.set(0, rock.rotation, 0)
      object.scale.set(rock.scale, rock.scale * 0.72, rock.scale)
      object.updateMatrix()

      mesh.setMatrixAt(index, object.matrix)
      colour.set(rock.colour)
      mesh.setColorAt(index, colour)
    })

    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [rocks])

  return (
    <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial vertexColors flatShading roughness={0.92} />
    </instancedMesh>
  )
}

function PaintedForest() {
  const trunkRef = useRef()
  const foliageRef = useRef()

  const trees = useMemo(() => {
    const random = seededRandom(145)
    const center = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const normal = new THREE.Vector3()

    return Array.from({ length: 76 }, () => {
      const progress = 0.29 + random() * 0.34
      const side = random() > 0.5 ? 1 : -1
      const distance = ROAD_HALF_WIDTH + 3.4 + random() * 20

      ROAD_CURVE.getPointAt(progress, center)
      ROAD_CURVE.getTangentAt(progress, tangent)

      normal.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(side)

      const x = center.x + normal.x * distance
      const z = center.z + normal.z * distance

      return {
        x,
        z,
        y: getTerrainHeight(x, z) + TERRAIN_Y_OFFSET,
        rotation: random() * Math.PI,
        trunkHeight: 1.2 + random() * 1.5,
        crownHeight: 1.8 + random() * 3.3,
        crownWidth: 0.65 + random() * 1.05,
        trunkColour: random() > 0.5 ? '#513d31' : '#684634',
        foliageColour: random() > 0.5 ? '#1d594b' : '#2f7454',
      }
    })
  }, [])

  useLayoutEffect(() => {
    const trunks = trunkRef.current
    const foliage = foliageRef.current

    if (!trunks || !foliage) return

    const object = new THREE.Object3D()
    const colour = new THREE.Color()

    trees.forEach((tree, index) => {
      object.position.set(
        tree.x,
        tree.y + tree.trunkHeight / 2,
        tree.z,
      )
      object.rotation.set(0, tree.rotation, 0)
      object.scale.set(0.32, tree.trunkHeight, 0.32)
      object.updateMatrix()

      trunks.setMatrixAt(index, object.matrix)
      colour.set(tree.trunkColour)
      trunks.setColorAt(index, colour)

      object.position.set(
        tree.x,
        tree.y + tree.trunkHeight + tree.crownHeight / 2,
        tree.z,
      )
      object.rotation.set(0, tree.rotation, 0)
      object.scale.set(tree.crownWidth, tree.crownHeight, tree.crownWidth)
      object.updateMatrix()

      foliage.setMatrixAt(index, object.matrix)
      colour.set(tree.foliageColour)
      foliage.setColorAt(index, colour)
    })

    trunks.instanceMatrix.needsUpdate = true
    foliage.instanceMatrix.needsUpdate = true

    if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true
  }, [trees])

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, trees.length]}
      >
        <cylinderGeometry args={[0.42, 0.56, 1, 5]} />
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </instancedMesh>

      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, trees.length]}
      >
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial vertexColors flatShading roughness={0.96} />
      </instancedMesh>
    </group>
  )
}

function DesertSpires() {
  const spireRef = useRef()

  const spires = useMemo(() => {
    const random = seededRandom(921)
    const center = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const normal = new THREE.Vector3()

    return Array.from({ length: 44 }, () => {
      const progress = 0.67 + random() * 0.3
      const side = random() > 0.5 ? 1 : -1
      const distance = ROAD_HALF_WIDTH + 3.5 + random() * 24

      ROAD_CURVE.getPointAt(progress, center)
      ROAD_CURVE.getTangentAt(progress, tangent)

      normal.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(side)

      const x = center.x + normal.x * distance
      const z = center.z + normal.z * distance

      return {
        x,
        z,
        y: getTerrainHeight(x, z) + TERRAIN_Y_OFFSET,
        width: 0.4 + random() * 0.72,
        height: 1.8 + random() * 5.6,
        rotation: random() * Math.PI,
        colour: random() > 0.5 ? '#d68251' : '#b65548',
      }
    })
  }, [])

  useLayoutEffect(() => {
    const mesh = spireRef.current

    if (!mesh) return

    const object = new THREE.Object3D()
    const colour = new THREE.Color()

    spires.forEach((spire, index) => {
      object.position.set(
        spire.x,
        spire.y + spire.height / 2,
        spire.z,
      )
      object.rotation.set(0, spire.rotation, 0)
      object.scale.set(spire.width, spire.height, spire.width)
      object.updateMatrix()

      mesh.setMatrixAt(index, object.matrix)
      colour.set(spire.colour)
      mesh.setColorAt(index, colour)
    })

    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [spires])

  return (
    <instancedMesh ref={spireRef} args={[undefined, undefined, spires.length]}>
      <coneGeometry args={[0.72, 1, 5]} />
      <meshStandardMaterial vertexColors flatShading roughness={0.9} />
    </instancedMesh>
  )
}

function PaintedPortal({ progress, side, background, paint, stroke }) {
  const placement = useMemo(() => {
    const center = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const normal = new THREE.Vector3()

    ROAD_CURVE.getPointAt(progress, center)
    ROAD_CURVE.getTangentAt(progress, tangent)

    normal.set(-tangent.z, 0, tangent.x).normalize()

    const distance = 7.2
    const x = center.x + normal.x * side * distance
    const z = center.z + normal.z * side * distance
    const ground = getTerrainHeight(x, z) + TERRAIN_Y_OFFSET

    const faceX = -normal.x * side
    const faceZ = -normal.z * side

    return {
      position: [x, ground + 2.6, z],
      rotationY: Math.atan2(faceX, faceZ),
    }
  }, [progress, side])

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      <mesh>
        <boxGeometry args={[3.25, 4.55, 0.22]} />
        <meshStandardMaterial color="#eadcc0" roughness={0.72} />
      </mesh>

      <mesh position={[0, 0, 0.13]}>
        <planeGeometry args={[2.72, 3.9]} />
        <meshBasicMaterial color={background} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-0.24, 0.32, 0.15]} rotation={[0, 0, 0.42]}>
        <circleGeometry args={[0.86, 24]} />
        <meshBasicMaterial color={paint} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0.42, -0.38, 0.16]} rotation={[0, 0, -0.24]}>
        <planeGeometry args={[1.6, 0.3]} />
        <meshBasicMaterial color={stroke} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function PaintedPortals() {
  return (
    <>
      <PaintedPortal
        progress={0.16}
        side={-1}
        background="#293b75"
        paint="#e6a355"
        stroke="#f8d978"
      />
      <PaintedPortal
        progress={0.48}
        side={1}
        background="#1e6253"
        paint="#d4a35b"
        stroke="#f4e0ae"
      />
      <PaintedPortal
        progress={0.82}
        side={-1}
        background="#a64f42"
        paint="#f1be6c"
        stroke="#392845"
      />
    </>
  )
}

function CameraRig({ progressRef }) {
  const { camera, scene } = useThree()

  const roadPoint = useRef(new THREE.Vector3())
  const lookPoint = useRef(new THREE.Vector3())
  const targetPosition = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())
  const skyColour = useRef(new THREE.Color())
  const weights = useRef({ mountain: 0, forest: 0, desert: 0 })

  useLayoutEffect(() => {
    ROAD_CURVE.getPointAt(0, roadPoint.current)

    const start = roadPoint.current
    const cameraY =
      getTerrainHeight(start.x, start.z) + TERRAIN_Y_OFFSET + EYE_HEIGHT

    camera.position.set(start.x, cameraY, start.z)
    currentLookAt.current.set(start.x, cameraY - 0.7, start.z - 8)
    camera.lookAt(currentLookAt.current)
  }, [camera])

  useFrame((_, delta) => {
    const rawProgress = progressRef.current
    const progress = rawProgress * rawProgress * (3 - 2 * rawProgress)
    const lookAhead = Math.min(progress + 0.018, 0.999)

    ROAD_CURVE.getPointAt(progress, roadPoint.current)
    ROAD_CURVE.getPointAt(lookAhead, lookPoint.current)

    targetPosition.current.set(
      roadPoint.current.x,
      getTerrainHeight(roadPoint.current.x, roadPoint.current.z) +
        TERRAIN_Y_OFFSET +
        EYE_HEIGHT,
      roadPoint.current.z,
    )

    targetLookAt.current.set(
      lookPoint.current.x,
      getTerrainHeight(lookPoint.current.x, lookPoint.current.z) +
        TERRAIN_Y_OFFSET +
        1.05,
      lookPoint.current.z,
    )

    const smoothing = 1 - Math.exp(-delta * 4)

    camera.position.lerp(targetPosition.current, smoothing)
    currentLookAt.current.lerp(targetLookAt.current, smoothing)
    camera.lookAt(currentLookAt.current)

    getZoneWeights(roadPoint.current.z, weights.current)

    skyColour.current.setRGB(
      COLOURS.skyMountain.r * weights.current.mountain +
        COLOURS.skyForest.r * weights.current.forest +
        COLOURS.skyDesert.r * weights.current.desert,
      COLOURS.skyMountain.g * weights.current.mountain +
        COLOURS.skyForest.g * weights.current.forest +
        COLOURS.skyDesert.g * weights.current.desert,
      COLOURS.skyMountain.b * weights.current.mountain +
        COLOURS.skyForest.b * weights.current.forest +
        COLOURS.skyDesert.b * weights.current.desert,
    )

    if (scene.background?.isColor) {
      scene.background.copy(skyColour.current)
    }

    if (scene.fog?.isFog) {
      scene.fog.color.copy(skyColour.current)
    }
  })

  return null
}

function AscentScene({ progressRef }) {
  return (
    <>
      <color attach="background" args={['#18325d']} />
      <fog attach="fog" args={['#18325d', 9, 82]} />

      <ambientLight intensity={1.35} />
      <hemisphereLight args={['#d6e0ff', '#30243c', 1.9]} />
      <directionalLight
        position={[-35, 42, 42]}
        color="#ffd38d"
        intensity={2.6}
      />
      <directionalLight
        position={[36, 18, -48]}
        color="#7fa3d1"
        intensity={1.25}
      />

      <PaintedTerrain />
      <PaintedRoad />
      <MountainRocks />
      <PaintedForest />
      <DesertSpires />
      <PaintedPortals />
      <CameraRig progressRef={progressRef} />
    </>
  )
}

function useJourneyProgress(sectionRef) {
  const progressRef = useRef(0)

  useEffect(() => {
    function updateProgress() {
      const section = sectionRef.current

      if (!section) return

      const bounds = section.getBoundingClientRect()
      const scrollLength = Math.max(section.offsetHeight - window.innerHeight, 1)

      progressRef.current = THREE.MathUtils.clamp(
        -bounds.top / scrollLength,
        0,
        1,
      )
    }

    updateProgress()

    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [sectionRef])

  return progressRef
}

function canRenderScene() {
  return (
    window.matchMedia('(min-width: 761px) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function useSceneEnabled() {
  const [enabled, setEnabled] = useState(() =>
    typeof window === 'undefined' ? false : canRenderScene(),
  )

  useEffect(() => {
    const desktopQuery = window.matchMedia(
      '(min-width: 761px) and (pointer: fine)',
    )
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function updateSceneState() {
      setEnabled(desktopQuery.matches && !motionQuery.matches)
    }

    updateSceneState()

    desktopQuery.addEventListener('change', updateSceneState)
    motionQuery.addEventListener('change', updateSceneState)

    return () => {
      desktopQuery.removeEventListener('change', updateSceneState)
      motionQuery.removeEventListener('change', updateSceneState)
    }
  }, [])

  return enabled
}

function ArtAscent() {
  const ascentRef = useRef(null)
  const progressRef = useJourneyProgress(ascentRef)
  const sceneEnabled = useSceneEnabled()

  return (
    <section
      className="art-ascent"
      id="art-ascent"
      ref={ascentRef}
      aria-label="KalaVista art journey"
    >
      {sceneEnabled ? (
        <div className="art-ascent__scene" aria-hidden="true">
          <Canvas
            className="art-ascent__canvas"
            camera={{ position: [0, 2, ROUTE_START_Z], fov: 46, near: 0.1, far: 180 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <AscentScene progressRef={progressRef} />
          </Canvas>
        </div>
      ) : (
        <div
          className="art-ascent__fallback"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(18, 32, 65, 0.2), rgba(17, 23, 45, 0.78)), url(${heroBackdrop})`,
          }}
        />
      )}

      <div className="art-ascent__story">
        <section className="art-ascent__stop art-ascent__stop--left">
          <div className="art-ascent__card art-ascent__card--intro">
            <p className="art-ascent__eyebrow">KALA SHIKHAR · 01</p>
            <h1>Walk into the canvas.</h1>
            <p>
              A slow route through colour, terrain, memory, and the works that
              stay with you.
            </p>
            <span className="art-ascent__scroll-cue">Scroll to travel ↓</span>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--chapter art-ascent__stop--right">
          <div className="art-ascent__chapter">
            <span>01 / MOUNTAIN</span>
            <p>Indigo ridges, charcoal shadows, and a path finding its line.</p>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--right">
          <div className="art-ascent__card">
            <p className="art-ascent__eyebrow">THE FIRST STOP</p>
            <h2>A gallery shaped by weather.</h2>
            <p>Browse original works, stories, moods, and evolving collections.</p>
            <Link className="art-ascent__link" to="/gallery">
              Explore gallery <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--chapter art-ascent__stop--left">
          <div className="art-ascent__chapter">
            <span>02 / MONSOON FOREST</span>
            <p>Layered greens, rain-softened forms, and marks that keep growing.</p>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--left">
          <div className="art-ascent__card">
            <p className="art-ascent__eyebrow">THE ARTIST</p>
            <h2>Every work begins with a feeling.</h2>
            <p>See the ideas, materials, and small observations behind KalaVista.</p>
            <Link className="art-ascent__link" to="/about">
              Meet the artist <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--chapter art-ascent__stop--right">
          <div className="art-ascent__chapter">
            <span>03 / DESERT OF PIGMENT</span>
            <p>Ochre light, warm earth, and forms left behind by the wind.</p>
          </div>
        </section>

        <section className="art-ascent__stop art-ascent__stop--right">
          <div className="art-ascent__card">
            <p className="art-ascent__eyebrow">THE FINAL STOP</p>
            <h2>Make something new together.</h2>
            <p>Share your idea for a personal artwork or a thoughtful commission.</p>
            <Link className="art-ascent__link" to="/commissions">
              Start a commission <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  )
}

export default ArtAscent