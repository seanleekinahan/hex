function Box(props) {

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
    }

    return (
        <mesh
            {...props}
            receiveShadow={true}
            scale={[12,12,12]}
        >
            <boxGeometry args={[width, height, depth]}/>
            <meshLambertMaterial color={colour}/>
        </mesh>
    )
}

export default Box;