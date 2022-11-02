import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "three.interactive";
import PriorityQueue from './priorityqueue'
import SendState from "./api.js";
import {DegToRad, ToKey, Round, Distance, ColorLightener, Sleep} from "./utils.js";

//Direction Constants
const DIR_TOP = 'top'
const DIR_TOPRIGHT = 'topRight'
const DIR_TOPLEFT = 'topLeft'
const DIR_BOTTOM = 'bottom'
const DIR_BOTTOMRIGHT = 'bottomRight'
const DIR_BOTTOMLEFT = 'bottomLeft'

//Tile Path Status Constants
const PLAIN = "plain"
const FOREST = "forest"
const IMPASSABLE = "impassable"
const ORIGIN = "origin"
const WAYPOINT = "waypoint"
const FINDABLE = "findable"

//Tile Colour Constants
const colours = {
    //tile generation colours
    plain: "#9ede9f",
    mountain: "#6b7574",
    forest: "#498f7a",

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


//Rng Variables
let seedGroupCounter = 0


//Pathing Variables
let origin = null
let findableTotal = 2
let findables = []
let findRadius = 50
let waypointTotal = 4
let waypoints = []

//Mode Flags
const MODE_DEBUG = false
const MODE_FIND = false
const MODE_WAYPOINTS = false
const SHOW_SEARCH_AREA = false
const GENERATE_MESHES = true

//Scene init
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
hexSpiral(60) //Generates hexMeshes in spiral pattern from 0,0,0 up to given radius.

if(GENERATE_MESHES) {
    populateScene(tileMapByCoord) //Calls scene.add for each mesh in tileMap
}

postGenerationMeddling(tileMapByID)

createTileInfoForSend()
addTileNeighbours() //Checks each tile and adds Tile IDs or null to .neighbours string array
SendState(mapStore) //Sends data to GameServer API

//Update renderer and set animation loop for camera controls
renderer.setAnimationLoop(() => {

    renderer.render(scene, camera);
    orbit.update();
});

function createTileInfoForSend(){
    for(let t of tileMapByID){
        let tile = t [1]
        let send = {
            pos: [tile.position.x,tile.position.y,tile.position.z],
            type: tile.pathStatus,
            uid: tile.uid,
            cpos: tile.cpos,
        }
        mapStore.gameData.tiles.set(tile.uid, send)
    }
}



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

function hexMesh(parent, dir, isDummy) {
    let x = 0
    let y = 0
    let z = 0

    const radius =  12
    const geo = new THREE.CylinderGeometry(radius*0.9,radius,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: colours.plain})
    const hex = new THREE.Mesh(geo, mat)

    hex.pathStatus = PLAIN
    hex.uid = tileCount.toString()
    hex.cpos = [0,0,0]

    if(parent && dir){
        let r = parent.radius
        let q = Math.sqrt(Math.pow(r,2) - Math.pow((r/2),2)); //y midway to origin of tessellated hexagon on same x
        let p = Math.sqrt(Math.pow(r/2, 2)); //x of the origin of a tessellated hexagon on same y
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
        let potentialKey = ToKey(hex.cpos)
        if(tileMapByCoord.get(potentialKey)){
            console.error("Generation Error: Tile Key Duplicated")
            return
        }
        tileMapByCoord.set(potentialKey, hex)
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
    decideTerrainStatus(hex)

    if(!isDummy) {
        tileCount++
    }
    return hex
}

function decideTerrainStatus(hex) {
    let rng = Math.floor(Math.random() * 100);
    if(rng > 35 ) {
        let neighbours = getNeighbourObjects(hex)
        let seeds = 0
        let firstSeed = null
        for(let n of neighbours) {
            if(n.seedGroup && n.seedGroup !== firstSeed){
                firstSeed = n.seedGroup
                seeds++
            }
        }

        if(seeds <= 1) {
            hex.seedGroup = firstSeed
            impassableTileHandler(hex)
        }

    }
}

function postGenerationMeddling(tileMap) {
    let passes = 10
    while(--passes){
        for(let t of tileMap){
            let tile = t[1]


            //Attempting to find voids and narrow spots
            if(tile.pathStatus === PLAIN){
                let impassCount = 0
                let adj = getNeighbourObjects(tile)
                for(let a of adj){
                    if(a.pathStatus === IMPASSABLE) {
                        impassCount++
                    }
                }

                if(impassCount >= 4){
                    //console.log("Found tile with at least four mountain neighbours.")
                    let found = breadthFirstAsSearch(tile, 1, PLAIN, PLAIN)
                    if(found.length <= 1){
                        //console.log("Found free spaces: ", found.length)
                        tile.pathStatus = IMPASSABLE
                        tile.material.color.set(colours.mountain)

                        for(let f of found){
                            tile.pathStatus = IMPASSABLE
                            tile.material.color.set(colours.mountain)
                        }
                    }
                }
            }


            //Finding stupid spits of land and dots
            if(tile.pathStatus === IMPASSABLE){
                let impassCount = 0
                let adj = getNeighbourObjects(tile)
                for(let a of adj){
                    if(a.pathStatus === IMPASSABLE) {
                        impassCount++
                    }
                }

                if(impassCount <= 2){

                    tile.pathStatus = PLAIN
                    tile.material.color.set(colours.plain)
                }
            }
        }
    }

    //Try to turn small blobs of impassable into trees
    passes = 2
    while(--passes) {
        for(let t of tileMap){
            let tile = t[1]

            if(tile.pathStatus === IMPASSABLE) {

                let impassCount = 0
                let adj = getNeighbourObjects(tile)
                for(let a of adj){
                    if(a.pathStatus === IMPASSABLE) {
                        impassCount++
                    }
                }

                if(impassCount <=4 ) {
                    let found = breadthFirstAsSearch(tile, 10, IMPASSABLE, IMPASSABLE)
                    if(found.length <= 15 && found.length > 0){
                        //console.log("Found occupied spaces: ", found.length)
                        tile.pathStatus = FOREST
                        tile.material.color.set(colours.forest)

                        for(let f of found){
                            f.pathStatus = FOREST
                            f.material.color.set(colours.forest)
                        }
                    }
                }


            }

        }

    }



    for(let t of tileMapByID){
        let tile = t[1]
        if(tile.pathStatus === "forest") {
            console.log("sending forest")
        }
    }
}


function getNeighbourObjects(object) {
    let neighbours = getAllNeighbours(object.cpos)
    let objectArray = []
    for(let i = 0; i < neighbours.length; i++) {
        let nb = tileMapByID.get(neighbours[i])
        if(nb){
            objectArray.push(nb)
        }
    }

    return objectArray
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

function breadthFirstAsSearch(origin, radius, searchTerm, keepSearchInside) {

    let frontier = new PriorityQueue()
    frontier.enqueue(origin, 0)
    reached.set(origin.uid, origin.uid)

    let findables
    if(searchTerm){
        findables = []
    } else {
        findables = 0
    }

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

            if(keepSearchInside !== nb.pathStatus){
                continue
            }

            if(reached.get(nb.uid)){
                //console.log("Neighbour has already been visited.")
                continue
            }

            if(Distance(nb.cpos, origin.cpos) > radius){
                //console.log("Neighbour is out of reach.")
                continue
            }

            reached.set(nb.uid, nb.id)
            frontier.enqueue(nb, 0)

            if(!searchTerm && nb.pathStatus === FINDABLE){
                findables++
            }

            if(searchTerm){
                if(searchTerm === nb.pathStatus) {
                    findables.push(nb)
                }
            }


            if(!nb.pathStatus) {
                nb.material.color.set(colours.breadthFirst)
            }

        }

        if(frontier.isEmpty() && findables.length) {
            //console.log("breadthFirstAsSearch (red) found ", findables, " within radius ", radius)
            break
        }
    }


    return findables



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

            if(pathObject.pathStatus === PLAIN){
                pathObject.material.color.set(colours.path)
            }

        }
    }


}

function addTileNeighbours() {
    let tiles = mapStore.gameData.tiles
    for (let[,v] of tiles ) {
        v.neighbours = getAllNeighbours(v.cpos)
        console.log(v.neighbours)
    }
}

function addMouseEvents(object, interactionManager){
    interactionManager.add(object)

    object.addEventListener('click', function(e) {
        e.stopPropagation()

        clickHandler(object)
    })
}

function clickHandler(object) {

    console.log("Clicked Object ID: ",object.uid)
    // console.log("Clicked Object: ")
    // console.log("X:",  object.position.x/12)
    // console.log("Z:",  object.position.z/12)

    if(MODE_DEBUG){
        let nb = getAllNeighbours(object.cpos)
        for(let n of nb){
            let tile = tileMapByID.get(n)
            if(tile) {

                // tile.material.color.set(colours.click)
                // console.log("Object: ", tile.position)
                // console.log("X:",  tile.position.x/12)
                // console.log("Z:",  tile.position.z/12)

            }
        }
        return
    }

    if(object.pathStatus === IMPASSABLE) {
        clearMapHandler()
        return
    }

    if(object.pathStatus === PLAIN && !origin && (MODE_FIND || MODE_WAYPOINTS)) {
        originHandler(object)
        return
    }

    if(MODE_WAYPOINTS && object.pathStatus === PLAIN && origin){
        if(waypoints.length < waypointTotal){
            waypointHandler(object)
        }

        if(waypoints.length === waypointTotal){
            let t1 = performance.now()
            weightedAStar(origin,waypoints)
            let t2 = performance.now()
            console.log("Time To Run: ", Round(t2-t1),"ms")
            return
        }

    }

    if(MODE_FIND && origin && !object.pathStatus){
        if(findables.length < findableTotal){
            findableTileHandler(object)
        }

        if(findables.length === findableTotal) {
            let t1 = performance.now()
            breadthFirstAsSearch(origin, findRadius)
            let t2 = performance.now()
            console.log("Time To Run: ", Round(t2-t1),"ms")
            return
        }
    }


}


function impassableTileHandler(object){
    object.pathStatus = IMPASSABLE

    if(!object.seedGroup){
        object.seedGroup = seedGroupCounter
        seedGroupCounter++
    }

    object.material.color.set(colours.mountain)
}

function findableTileHandler(object){
    findables.push(object)
    object.pathStatus = FINDABLE
    object.material.color.set(colours.findable)
}

function clearMapHandler() {

    if(origin) {
        origin.pathStatus = PLAIN
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

        if(obj.pathStatus === PLAIN){
            obj.material.color.set(colours.plain)
        }

        reached.delete(k)

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
    const light = new THREE.SpotLight(0xFFFFFF, 0.25);
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
    camera.position.set(1250,2250,10)

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



