import ActorLabels from "../UI/actorlabels";
import {Html} from "@react-three/drei";
import {useState, useRef, useEffect} from 'react'
import './labels.css';

function Box(props) {
    const [showLabel, toggleLabel] = useState(false)

    let ref = useRef()

    useEffect( () => {

        if(ref.current) {

            console.log("BASTARD")
            ref.current.parentElement.style.pointerEvents = 'none'
        }
    },
        [ref]
    )


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
                props.contextSetter(props)
                toggleLabel(!showLabel)
            }}

        >
            <boxGeometry args={[width, height, depth]}/>
            <meshLambertMaterial color={colour}/>

        </mesh>
    )
}

/*
//annoying html popups with div that I can't make fuck off and it blocks clicking the box

            <Html
                as='boxLabel'
                  wrapperClass={"actor-label"}
                sprite
                  prepend
                transform
                style={{
                    pointerEvents: 'none',
                    transition: 'all 0.2s',
                    opacity: !showLabel ? 0 : 1,
                    transform: `scale(${!showLabel ? 1 : 10})
                                translateY(-40px)`}}
            >
                <div className="actor-label" >
                    <button className="button-19">
                        Action 1
                    </button>
                    <button className="button-19">
                        Action 2
                    </button>
                    <button className="button-19">
                        Action 3
                    </button>
                </div>
            </Html>
 */

export default Box;