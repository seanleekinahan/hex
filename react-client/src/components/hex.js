function Hex(props) {

    let topRadius = 0.9
    let bottomRadius = 0.98
    let height = 0.1
    let divisions = 6

    let tileColours = {
        water: "#4287f5",
        mountain: "#737b7d",
        plain: "#9be670"
    }

    let colour = ""
    switch(props.type) {
        case "water":
            colour = tileColours.water
            break
        case "mountain":
            colour = tileColours.mountain
            break
        case "plain":
            colour = tileColours.plain
            break
    }

    return (
        <mesh 
        {...props} 
     
        receiveShadow 
        scale={[12,12,12]} 
        rotation={[0,rad(30),0]}
        onClick={(e) => console.log(props.hexid)}
        >
            <cylinderGeometry args={[topRadius, bottomRadius, height, divisions]}/>
            <meshLambertMaterial color={colour}/>
        </mesh>
    )
}


function rad(deg){
    return deg * Math.PI/180
}

export default Hex;