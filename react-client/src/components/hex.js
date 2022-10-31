function Hex(props) {

    let topRadius = 0.9
    let bottomRadius = 1
    let height = 0.1
    let divisions = 6

    let colour = props.colour

    return (
        <mesh castShadow receiveShadow {...props}>
            <cylinderGeometry args={[topRadius, bottomRadius, height, divisions]}/>
            <meshLambertMaterial color={colour}/>
        </mesh>
    )
}

export default Hex;