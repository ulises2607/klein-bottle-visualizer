import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry";
import bacgroundMusic from "./assets/background1.mp3";

// === ESTILOS ===
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
  color: "white",
  textAlign: "center",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};
const buttonStyle = {
  padding: "15px 30px",
  fontSize: "20px",
  color: "#000000",
  backgroundColor: "#00ffff",
  border: "2px solid #00dddd",
  borderRadius: "8px",
  cursor: "pointer",
  marginBottom: "25px",
  boxShadow: "0 5px 15px rgba(0, 255, 255, 0.4)",
  transition: "background-color 0.3s ease, transform 0.1s ease",
};
const infoTextStyle = {
  fontSize: "16px",
  maxWidth: "450px",
  lineHeight: "1.5",
};
const errorDisplayStyle = {
  position: "fixed",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "rgba(220, 53, 69, 0.85)",
  color: "white",
  padding: "12px 24px",
  borderRadius: "8px",
  zIndex: 2000,
  textAlign: "center",
  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  fontSize: "16px",
};

// === FUNCIÓN PARAMÉTRICA DE KLEIN ===
const klein = (u, v, target) => {
  let uGeom = u * Math.PI;
  const vRad = v * 2 * Math.PI;
  const uRadTrig = uGeom * 2;
  let x, y, z;
  if (uGeom < Math.PI) {
    x =
      3 * Math.cos(uRadTrig) * (1 + Math.sin(uRadTrig)) +
      2 * (1 - Math.cos(uRadTrig) / 2) * Math.cos(uRadTrig) * Math.cos(vRad);
    z =
      -8 * Math.sin(uRadTrig) -
      2 * (1 - Math.cos(uRadTrig) / 2) * Math.sin(uRadTrig) * Math.cos(vRad);
  } else {
    x =
      3 * Math.cos(uRadTrig) * (1 + Math.sin(uRadTrig)) +
      2 * (1 - Math.cos(uRadTrig) / 2) * Math.cos(vRad + Math.PI);
    z = -8 * Math.sin(uRadTrig);
  }
  y = 2 * (1 - Math.cos(uRadTrig) / 2) * Math.sin(vRad);
  target.set(x, y, z);
  return target;
};

// === COMPONENTES HIJOS ===

const KleinShape = (props) => {
  const materialRef = useRef();
  const { movementIntensity } = props;
  const geometry = useMemo(() => new ParametricGeometry(klein, 100, 100), []);

  useFrame(() => {
    const currentIntensity = movementIntensity || 1.0;
    if (materialRef.current) {
      const baseOpacity = 0.5;
      let newOpacity = baseOpacity + (currentIntensity - 1.0) * 0.2;
      newOpacity = Math.max(0.1, Math.min(newOpacity, 0.9));
      materialRef.current.opacity = newOpacity;
    }
  });
  return (
    <mesh geometry={geometry}>
      {" "}
      <meshBasicMaterial
        ref={materialRef}
        color="#00ffff"
        wireframe={true}
        transparent={true}
        opacity={0.5}
        side={THREE.DoubleSide}
      />{" "}
    </mesh>
  );
};

// InsideCamera Simplificado: Siempre dentro, con roll.
const InsideCamera = (props) => {
  const camRef = useRef();
  const { movementIntensity } = props;

  const cameraPositionVec = useMemo(() => new THREE.Vector3(), []);
  const lookAtPositionVec = useMemo(() => new THREE.Vector3(), []);

  const v_path_param = 0.65; // El valor que estabas usando. ¡Puedes cambiarlo para diferentes "tubos"!
  const lookAheadDeltaU = 0.008;

  useFrame((state) => {
    const t_global = state.clock.getElapsedTime();
    const currentIntensityFactor = movementIntensity || 1.0;

    const baseSpeed = 0.035;
    const speedModulationFactor = 0.4;
    const pathSpeed =
      baseSpeed * (1 + (currentIntensityFactor - 1.0) * speedModulationFactor);

    const u_path_param = (t_global * pathSpeed) % 1.0;

    klein(u_path_param, v_path_param, cameraPositionVec);
    const u_lookahead_param = (u_path_param + lookAheadDeltaU) % 1.0;
    klein(u_lookahead_param, v_path_param, lookAtPositionVec);

    if (camRef.current) {
      camRef.current.position.copy(cameraPositionVec);
      camRef.current.lookAt(lookAtPositionVec);

      const baseRollSpeed = 0.25;
      const rollIntensityFactor = 0.3;
      const currentRollSpeed =
        baseRollSpeed *
        (1 + (currentIntensityFactor - 1.0) * rollIntensityFactor);

      camRef.current.rotation.z = (t_global * currentRollSpeed) % (2 * Math.PI);
    }
  });

  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      fov={80}
      near={0.1}
      far={1000}
    />
  );
};

// SceneContent: Calcula movementIntensity con onda seno
const SceneContent = ({ setMovementIntensity, movementIntensity }) => {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const sineFrequency = 0.25;
    const minIntensity = 0.2;
    const maxIntensity = 2.4;
    const normalizedSine = (Math.sin(t * sineFrequency) + 1) / 2;
    const newCalculatedIntensity =
      minIntensity + normalizedSine * (maxIntensity - minIntensity);
    setMovementIntensity(newCalculatedIntensity);
  });
  return (
    <>
      {" "}
      <KleinShape movementIntensity={movementIntensity} />{" "}
      <InsideCamera movementIntensity={movementIntensity} />{" "}
    </>
  );
};

// === COMPONENTE PRINCIPAL KleinBottle ===
const KleinBottle = () => {
  const [userInteracted, setUserInteracted] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [movementIntensity, setMovementIntensity] = useState(1.0);
  const [audioError, setAudioError] = useState(null);
  const audioElRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const handleStartExperience = useCallback(() => {
    setUserInteracted(true);
    setAudioError(null);
  }, []);

  useEffect(() => {
    if (!userInteracted) return;
    if (audioInitialized && audioElRef.current && !audioElRef.current.paused)
      return;
    if (
      audioInitialized &&
      audioElRef.current &&
      audioElRef.current.paused &&
      audioError
    ) {
    } else if (audioInitialized) return;

    let activeAudioElement = null;
    const initializeAndPlayAudio = async () => {
      try {
        activeAudioElement = new Audio(bacgroundMusic);
        activeAudioElement.crossOrigin = "anonymous";
        activeAudioElement.loop = true;
        audioElRef.current = activeAudioElement;
        if (
          !audioContextRef.current ||
          audioContextRef.current.state === "closed"
        ) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }
        sourceNodeRef.current =
          audioContextRef.current.createMediaElementSource(activeAudioElement);
        sourceNodeRef.current.connect(audioContextRef.current.destination);
        await activeAudioElement.play();
        setAudioInitialized(true);
        setAudioError(null);
      } catch (err) {
        console.error("Error en initializeAndPlayAudio (sin análisis):", err);
        setAudioError(`No se pudo reproducir el audio (${err.name}).`);
        setAudioInitialized(false);
        if (activeAudioElement) activeAudioElement.src = "";
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
      }
    };
    initializeAndPlayAudio();
    return () => {
      if (activeAudioElement) {
        activeAudioElement.pause();
        activeAudioElement.src = "";
      }
    };
  }, [userInteracted]);

  useEffect(() => {
    return () => {
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = "";
        audioElRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().then(() => {
          audioContextRef.current = null;
        });
      }
    };
  }, []);

  return (
    <>
      {!userInteracted && (
        <div style={overlayStyle}>
          {" "}
          <button
            onClick={handleStartExperience}
            style={buttonStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#00e0e0")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#00ffff")
            }
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.98)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {" "}
            Iniciar Experiencia Sonora{" "}
          </button>{" "}
          <p style={infoTextStyle}>
            {" "}
            Debido a las políticas del navegador, es necesario que interactúes
            con la página para activar el audio.{" "}
          </p>{" "}
        </div>
      )}
      {audioError && <div style={errorDisplayStyle}>⚠️ {audioError}</div>}
      <Canvas style={{ height: "100vh", background: "#000" }}>
        <SceneContent
          setMovementIntensity={setMovementIntensity}
          movementIntensity={movementIntensity}
        />
      </Canvas>
    </>
  );
};

export default KleinBottle;
