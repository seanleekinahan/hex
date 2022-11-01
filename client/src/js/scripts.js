import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "three.interactive";
import PriorityQueue from './priorityqueue'
import SendState from "./api.js";
import {DegToRad, ToKey, Round, Distance} from "./utils.js";

//Direction Constants
const DIR_TOP = 'top'
const DIR_TOPRIGHT = 'topRight'
const DIR_TOPLEFT = 'topLeft'
const DIR_BOTTOM = 'bottom'
const DIR_BOTTOMRIGHT = 'bottomRight'
const DIR_BOTTOMLEFT = 'bottomLeft'

//Tile Path Status Constants
const IMPASSABLE = "impassable"
const ORIGIN = "origin"
const WAYPOINT = "waypoint"
const FINDABLE = "findable"

//Tile Colour Constants
const colours = {
    //tile generation colours
    plain: "#00ff00",
    mountain: "#6b7574",

    //mouse interaction colours
    waypoint: "#11f2f2",
    findable: "#ff0000",
    hover: "#eb6363",
    click: "#a87c39",

    //search fill colours
    path: "#e88858",
    aStar: "#ffe600",
    breadthFirst: "#e88858",
    uniformCost:"#10a0e3",
    greedyDepthFirst:"#d810e3"
}



//Pathing Variables
let origin = null
let findableTotal = 2
let findables = []
let findRadius = 5
let waypointTotal =3
let waypoints = []

//Mode Flags
const MODE_FIND = true
const MODE_WAYPOINTS = false
const SHOW_SEARCH_AREA = true

//Renderer and Scene init
const renderer = getRenderer()
document.body.appendChild(renderer.domElement)
const scene = new THREE.Scene()

//Lights, camera and controls
let sLight = spotLight()
scene.add(sLight.light)
let camera = cameraSetup()
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.maxPolarAngle = DegToRad(75)

//Package handling raycasting for interacting with scene objects.
const interactionManager = new InteractionManager(
    renderer,
    camera,
    renderer.domElement,
    undefined
)

//Object for returning data via GameServer API
let mapStore = {
    gameData: {
        stateID: 5,
        tiles: new Map()
    }
}

//Tiles
let tileMapByCoord = new Map(); //Map of co-ord: tileMesh where co-ords are stringified cubic co-ordinates
let tileMapByID = new Map(); //Map of ID: tileMesh
let reached = new Map() //For tracking reached tiles while pathfinding and searching
let tileCount = 0 //For generating unique Tile IDs
hexSpiral(10) //Generates hexMeshes in spiral pattern from 0,0,0 up to given radius.
populateScene(tileMapByCoord) //Calls scene.add for each mesh in tileMap

addTileNeighbours() //Checks each tile and adds Tile IDs or null to .neighbours string array
SendState(mapStore) //Sends data to GameServer API

//Update renderer and set animation loop for camera controls
renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    orbit.update();
});

function hexSpiral(radius) {

    //Creates Origin Mesh
    let next = hexMesh()
    for(let i = 1; i <= radius; i++) {

        //Creates six sides of length i starting from a dummy position above
        //the last tile in the previous layer
        next = hexMesh(next, DIR_TOP, true)
        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_BOTTOMRIGHT)

        }

        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_BOTTOM)

        }

        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_BOTTOMLEFT)
        }

        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_TOPLEFT)

        }

        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_TOP)

        }

        for(let j = 0; j < i; j++) {
            next = hexMesh(next, DIR_TOPRIGHT)

        }
    }
}

function dummyTopHex(parent){
    let hex = {

    }
}

function hexMesh(parent, dir, isDummy) {
    let x = 0
    let y = 0
    let z = 0


    const radius =  12
    const geo = new THREE.CylinderGeometry(radius*0.9,radius*0.95,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: colours.plain})
    const hex = new THREE.Mesh(geo, mat)

    hex.uid = tileCount.toString()
    hex.cpos = [0,0,0]

    if(parent && dir){
        let r = parent.radius
        let q = Round(Math.sqrt(Math.pow(r,2) - Math.pow((r/2),2))); //y midway to origin of tessellated hexagon on same x
        let p = Round(Math.sqrt(Math.pow(r/2, 2))); //x of the origin of a tessellated hexagon on same y
        let c = parent.cpos

        if (dir === DIR_TOP) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z + q*2
            hex.cpos = [c[0], c[1]-1, c[2]+1]
        }

        if (dir === DIR_TOPRIGHT) {
            x = parent.position.x - p - r
            y = parent.position.y
            z = parent.position.z + q
            hex.cpos = [c[0]+1, c[1]-1, c[2]]
        }

        if (dir === DIR_BOTTOMRIGHT) {
            x = parent.position.x - p - r
            y = parent.position.y
            z = parent.position.z - q
            hex.cpos = [c[0]+1, c[1], c[2]-1]
        }

        if (dir === DIR_BOTTOM) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z - q*2
            hex.cpos = [c[0], c[1]+1, c[2]-1]
        }

        if (dir === DIR_BOTTOMLEFT) {
            x = parent.position.x + p + r
            y = parent.position.y
            z = parent.position.z - q
            hex.cpos = [c[0]-1, c[1]+1, c[2]]
        }

        if (dir === DIR_TOPLEFT) {
            x = parent.position.x + p + r
            y = parent.position.y
            z = parent.position.z + q
            hex.cpos = [c[0]-1, c[1], c[2]+1]
        }
    }

    if(!isDummy) {
        tileMapByCoord.set(ToKey(hex.cpos), hex)
        tileMapByID.set(hex.uid, hex)
    }

    hex.rotation.set(0, DegToRad(30),0)
    hex.position.set(x, y, z)
    hex.radius = radius

    //lighting
    hex.castShadow = true
    hex.receiveShadow = true

    //mouseEvents
    hex.cost = 1
    addMouseEvents(hex, interactionManager)

    //Creates Random Walls
    let rng = Math.floor(Math.random() * 100);
    if(rng > 50) {
        impassableTileHandler(hex)
    }

    if(!isDummy) {

        let tile = {
            pos: [x,y,z],
            type: (hex.pathStatus === IMPASSABLE ? "mountain" : "plain"),
            uid: hex.uid,
            cpos: hex.cpos,
        }

        mapStore.gameData.tiles.set(tile.uid, tile)
        tileCount++
    }
    return hex
}

function getAllNeighbours(c) {
    let neighbours = []

    let tKey = ToKey([c[0], c[1]-1, c[2]+1])
    if(!tileMapByCoord.get(tKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(tKey).uid.toString())
    }

    let tRKey = ToKey([c[0]+1, c[1]-1, c[2]])
    if(!tileMapByCoord.get(tRKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(tRKey).uid.toString())
    }

    let bRKey = ToKey([c[0]+1, c[1], c[2]-1])
    if(!tileMapByCoord.get(bRKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(bRKey).uid.toString())
    }

    let bKey = ToKey([c[0], c[1]+1, c[2]-1])
    if(!tileMapByCoord.get(bKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(bKey).uid.toString())
    }

    let bLKey = ToKey([c[0]-1, c[1]+1, c[2]])
    if(!tileMapByCoord.get(bLKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(bLKey).uid.toString())
    }

    let tLKey = ToKey([c[0]-1, c[1], c[2]+1])
    if(!tileMapByCoord.get(tLKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMapByCoord.get(tLKey).uid.toString())
    }

    return neighbours
}

function breadthFirstAsSearch(origin, radius) {

    let frontier = new PriorityQueue()
    frontier.enqueue(origin, 0)
    reached.set(origin.uid, origin.uid)

    let findables = 0
    let iterations = 0;
    while(!frontier.isEmpty()){
        iterations++
        let current = frontier.dequeue().element
        let neighbours = getAllNeighbours(current.cpos)

        for(let i = 0; i < neighbours.length; i++) {
            let nb = tileMapByID.get(neighbours[i])
            //Void Tiles
            if (!nb || nb.uid === "null") {
                continue
            }

            if(reached.get(nb.uid)){
                console.log("Neighbour has already been visited.")
                continue
            }

            if(Distance(nb.cpos, origin.cpos) > radius){
                console.log("Neighbour is out of reach.")
                continue
            }

            reached.set(nb.uid, nb.id)
            frontier.enqueue(nb, 0)

            if(nb.pathStatus === FINDABLE){
                findables++
            }

            if(!nb.pathStatus) {
                nb.material.color.set(colours.breadthFirst)
            }

        }

        if(frontier.isEmpty()) {
            console.log("breadthFirstAsSearch (red) found ", findables, " within radius ", radius)
            break
        }
    }



}

function weightedAStar(origin, waypoints) {

    if(waypoints && !waypoints.length) {
        waypoints = [waypoints]
    }
    let pathBroken = false
    let path = []
    let found = false

    for(let d = 0;d  < waypoints.length; d++) {

        if(pathBroken){
            break
        }

        if(d !== 0) {
            origin = waypoints[d-1]
        }

        let frontier = new PriorityQueue()
        frontier.enqueue(origin, 0)
        let costSoFar = new Map()
        costSoFar.set(origin.uid, 0)
        let cameFrom = new Map()
        reached.set(origin.uid, origin.uid)


        let iterations = 0;
        while(!frontier.isEmpty()){
            iterations++
            let current = frontier.dequeue().element
            let neighbours = getAllNeighbours(current.cpos)

            if(neighbours.length) {
                for(let i = 0; i < neighbours.length; i++) {
                    let nb = tileMapByID.get(neighbours[i])

                    //Void Tiles
                    if (!nb || nb.uid === "null") {
                        continue
                    }

                    //Mountain Tiles
                    if (nb.pathStatus === IMPASSABLE) {
                        continue
                    }

                    //Already visited
                    if(cameFrom.get(nb.uid)){
                        continue
                    }

                    let newCost = Distance(current.cpos, nb.cpos) * nb.cost
                    if(!costSoFar.get(nb.uid) || newCost < costSoFar.get(nb.uid))  {

                        costSoFar.set(nb.uid, newCost)

                        let priority = newCost +
                            Distance(waypoints[d].cpos, nb.cpos)

                        reached.set(nb.uid, nb.uid)
                        cameFrom.set(nb.uid, current.uid)
                        frontier.enqueue(nb, priority)
                        if(SHOW_SEARCH_AREA && !nb.pathStatus) {
                            nb.material.color.set(colours.aStar)
                        }


                    }


                    if(nb.uid === waypoints[d].uid){
                        console.log("aStar (yellow) Found the destination after ",iterations, "iterations.")
                        found = true;
                        frontier.flush()
                        break
                    }

                }
            }


            if(frontier.isEmpty() && found === false) {
                console.log("No Path Found!")
                pathBroken = true
                break
            }


        }

        if(found && !pathBroken) {
            let check = cameFrom.get(waypoints[d].uid)
            while(check !== origin.uid) {
                path.push(check)
                check = cameFrom.get(check)
            }
        }


    }

    if(found && !pathBroken){
        for(let i = 0; i < path.length; i++){
            let pathObject = tileMapByID.get(path[i])

            if(!pathObject.pathStatus){
                pathObject.material.color.set(colours.path)
            }

        }
    }


}

function addTileNeighbours() {
    let tiles = mapStore.gameData.tiles
    for (let[,v] of tiles ) {
        v.neighbours = getAllNeighbours(v.cpos)
    }
}

function addMouseEvents(object, interactionManager){
    interactionManager.add(object)

    object.addEventListener('click', function(e) {
        e.stopPropagation()

        clickHandler(object)
        if(MODE_WAYPOINTS && origin && waypoints.length === waypointTotal) {
            let t1 = performance.now()
            weightedAStar(origin,waypoints)
            let t2 = performance.now()
            console.log("Time To Run: ", Round(t2-t1),"ms")
        }

        if(MODE_FIND && origin && findables.length === findableTotal) {
            let t1 = performance.now()
            breadthFirstAsSearch(origin, findRadius)
            let t2 = performance.now()
            console.log("Time To Run: ", Round(t2-t1),"ms")
        }

    })
}

function clickHandler(object) {

    if(object.pathStatus === IMPASSABLE) {
        clearMapHandler()
        return
    }

    if(!object.pathStatus && !origin) {
        originHandler(object)
        return
    }

    if(MODE_WAYPOINTS){
        if(!object.pathStatus && origin && waypoints.length < waypointTotal){
            waypointHandler(object)
            return
        }
    }

    if(MODE_FIND){
        if(!object.pathStatus && origin && findables.length < findableTotal){
            findableTileHandler(object)
        }
    }

}

function impassableTileHandler(object){
    object.pathStatus = IMPASSABLE
    object.material.color.set(colours.mountain)
}

function findableTileHandler(object){
    findables.push(object)
    object.pathStatus = FINDABLE
    object.material.color.set(colours.findable)
}

function clearMapHandler() {

    if(origin) {
        origin.pathStatus = null
        origin.material.color.set(colours.plain)
        origin = null
    }

    if(waypoints.length) {
        for(let i = 0; i < waypoints.length; i++) {
            let destObj = waypoints[i]
            destObj.pathStatus = null
            destObj.material.color.set(colours.plain)
            
        }
        waypoints = []
        
    }

    if(findables.length) {
        for(let i = 0; i < findables.length; i++) {
            findables[i].pathStatus = null
            findables[i].material.color.set(colours.plain)

        }
        findables = []
    }

    for(let[k] of reached.entries()) {
        let obj = tileMapByID.get(k)

        if(obj.pathStatus){
            if(obj.pathStatus === FINDABLE) {
                obj.material.color.set(colours.findable)
            }

          continue
        }

        reached.delete(k)
        obj.material.color.set(colours.plain)
        obj.pathStatus = null
    }

}

function originHandler(object){
    origin = object
    object.pathStatus = ORIGIN
    object.material.color.set(colours.waypoint)
}

function waypointHandler(object){
    waypoints.push(object)
    object.pathStatus = WAYPOINT
    object.material.color.set(colours.waypoint)
}

function pointLight() {
    const light = new THREE.PointLight( 0xff0000, 1, 100 );
    light.position.set( 50, 50, 50 );
    scene.add( light );
}

function spotLight() {
    const light = new THREE.SpotLight(0xFFFFFF, 0.15);
    light.position.set(0, 1000, 0);
    light.rotation.set(DegToRad(180),0,0)
    light.castShadow = true;
    light.shadow.camera.x = light.shadow.mapSize.x * 20
    light.shadow.camera.y = light.shadow.mapSize.y * 20
    light.shadow.camera.far *= 2
    light.angle = 1;
    const helper = new THREE.SpotLightHelper(light);
    return {light, helper}
}

function cameraSetup(){
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth/window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(350,350,10)

    return camera
}

function getRenderer() {
    const r = new THREE.WebGLRenderer({antialias: true, powerPreference:"high-performance"});
    r.setSize(window.innerWidth, window.innerHeight)
    r.shadowMap.enabled = true;
    r.outputEncoding = THREE.sRGBEncoding
    r.toneMapping = THREE.ACESFilmicToneMapping

    r.setClearColor("#5f9ea0")
    return r
}

function populateScene(meshMap) {
    for (let [,v] of meshMap){
        scene.add(v)
    }
}



