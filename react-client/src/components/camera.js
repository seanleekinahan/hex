import { OrbitControls, PerspectiveCamera } from '@react-three/drei'

function DegToRad(deg){
    return Math.PI/180 * deg
}

function Camera() {
    return (
        <group>
        < PerspectiveCamera 
            makeDefault 
            position={[0,450,400]}  
            far={10000}/>
        <OrbitControls maxPolarAngle={DegToRad(75)}/>
        </group>

    )
}

export default Camera;