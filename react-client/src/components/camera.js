import { OrbitControls, PerspectiveCamera } from '@react-three/drei'

function Camera() {
    return (
        <group>
        < PerspectiveCamera 
            makeDefault 
            position={[0,450,400]}  
            far={10000}/>
        <OrbitControls/>
        </group>

    )
}

export default Camera;