

function Spotlight(){
  return (
    <spotLight
          castShadow
          intensity={0.1}
          angle={Math.PI / 1}
          position={[150, 1500, 150]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
  )
}

function Lights() {
    return (
      <group>
        <pointLight intensity={0.3} />
        <ambientLight intensity={0.1} />
        <Spotlight />
      </group>
    )
  }

  export default Lights;