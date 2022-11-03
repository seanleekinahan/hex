import UI from "../UI/actorlabels";
import {Html} from "@react-three/drei";
import { useState } from 'react'

function Box(props) {
    const [showLabel, toggleLabel] = useState(false)
    let width = 0.4
    let height = 0.5
    let depth = 0.4

    let boxColours = {
        structure: "#4287f5",
        unit: "#f7f728",
        resource: "#f76d28"
    }

    let colour = ""
    switch(props.type) {
        case "structure":
            colour = boxColours.structure
            break
        case "unit":
            colour = boxColours.unit
            break
        case "resource":
            colour = boxColours.resource
            break
        default:
            colour ='#ffffff'
            break
    }

    return (
        <mesh
            {...props}
            receiveShadow={true}
            scale={[12,12,12]}
            onClick={(e) => {
                e.stopPropagation()
                console.log(props)
                toggleLabel(!showLabel)
            }}

        >
            <boxGeometry args={[width, height, depth]}/>
            <meshLambertMaterial color={colour}/>

            <Html className="actor-label"
                sprite
                // 3D-transform contents
                transform
                // Hide contents "behind" other meshes
                //occlude
                // Tells us when contents are occluded (or not)
                //onOcclude={occlude}
                // We just interpolate the visible state into css opacity and transforms
                style={{ transition: 'all 0.2s',
                    opacity: !showLabel ? 0 : 1,
                    transform: `scale(${!showLabel ? 1 : 10}) 
                                translateY(-40px)`}}
            >
                <UI text={props.uid} key={props.uid}/>
            </Html>
        </mesh>
    )
}

export default Box;