import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "three.interactive";
import {Vector2, Vector3} from "three";
import Queue from './queue'
import PriorityQueue from './priorityqueue'
import axios from 'axios'

function distance(a, b) {
    let q = a[0] - b[0]
    let r = a[1] - b[1]
    let s = a[2] - b[2]

    return (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2
}

function toKey (c){
    let q = c[0].toString()
    let r = c[1].toString()
    let s = c[2].toString()
    return q+r+s
}



let mapStore = {
    gameData: {
        stateID: 5,
        tiles: new Map()
    }
}
function sendState(state){

    state.gameData.tiles = JSON.stringify(Object.fromEntries(state.gameData.tiles))
    let config = {
        headers: {
           //'Content-Type': 'application/json',
           'Content-Type': 'application/x-www-form-urlencoded'
        }
   }
    axios.post("http://localhost:8080/api/gamestate",  JSON.stringify(state), config)
    .catch((err) => {
        console.error(err)
    })
    .then( res => {
        console.log(res)
    })

}

const DIR_TOP = 'top'
const DIR_TOPRIGHT = 'topRight'
const DIR_BOTTOMRIGHT = 'bottomRight'
const DIR_BOTTOM = 'bottom'
const DIR_BOTTOMLEFT = 'bottomLeft'
const DIR_TOPLEFT = 'topLeft'

const IMPASSABLE = "impassable"
const ORIGIN = "origin"
const TARGET = "target"
const FINDABLE = "findable"
let origin = null
let destinationTotal = 2
let destinations = []


const shadowPerformanceFactor = 5

const renderer = getRenderer()
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
let sceneArray = new Array();
let tileMap = new Map();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth/window.innerHeight,
    0.1,
    10000
);
camera.position.set(600,2000,10)

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.maxPolarAngle = degToRad(75)

const interactionManager = new InteractionManager(
    renderer,
    camera,
    renderer.domElement
)

//Tiles
let hexCount = 0
hexSpiral(10)
addTileNeighbours()
populateScene(sceneArray)
sendState(mapStore)
//Lights
let sLight = spotLight()
scene.add(sLight.light)


function animate() {
    renderer.render(scene, camera);
    orbit.update();
}
renderer.setAnimationLoop(animate);

function hexSpiral(radius) {
    let parent = hexMesh()
    sceneArray.push(parent)
    for(let i = 1; i <= radius; i++) {

        parent = hexMesh(parent, DIR_TOP, true)
        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOMRIGHT)
            hex.originDir = DIR_BOTTOMRIGHT
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOM)
            hex.originDir = DIR_BOTTOM
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOMLEFT)
            hex.originDir = DIR_BOTTOMLEFT
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOPLEFT)
            hex.originDir = DIR_TOPLEFT
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOP)
            hex.originDir = DIR_TOP
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOPRIGHT)
            hex.originDir = DIR_TOPRIGHT
            parent = hex
            sceneArray.push(hex)
        }
    }
}

function getViableNeighbours(c) {
    let neighbours = []

    let tKey = toKey([c[0], c[1]-1, c[1]+1])
    neighbours.push(tileMap.get(tKey).uid)

    let tRKey = toKey([c[0]+1, c[1]-1, c[2]])
    neighbours.push(tileMap.get(tRKey).uid)

    let bRKey = toKey([c[0]+1, c[1], c[2]-1])
    neighbours.push(tileMap.get(bRKey).uid)

    let bKey = toKey([c[0], c[1]+1, c[2]-1])
    neighbours.push(tileMap.get(bKey).uid)

    let bLKey = toKey([c[0]-1, c[1]+1, c[2]])
    neighbours.push(tileMap.get(bLKey).uid)

    let tLKey = toKey([c[0]-1, c[1], c[2]+1])
    neighbours.push(tileMap.get(tLKey).uid)

    for(let i = 0; i < neighbours.length; i++) {
        if(!neighbours[i]){
            //console.log("Position is out of bounds.")
            continue
        }
        //console.log("Neighbour viable!")
    }

    return neighbours
}


function getAllNeighbours(c) {
    let neighbours = []

    let tKey = toKey([c[0], c[1]-1, c[1]+1])
    if(!tileMap.get(tKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(tKey).uid.toString())
    }

    let tRKey = toKey([c[0]+1, c[1]-1, c[2]])
    if(!tileMap.get(tRKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(tRKey).uid.toString())
    }

    let bRKey = toKey([c[0]+1, c[1], c[2]-1])
    if(!tileMap.get(bRKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(bRKey).uid.toString())
    }

    let bKey = toKey([c[0], c[1]+1, c[2]-1])
    if(!tileMap.get(bKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(bKey).uid.toString())
    }

    let bLKey = toKey([c[0]-1, c[1]+1, c[2]])
    if(!tileMap.get(bLKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(bLKey).uid.toString())
    }

    let tLKey = toKey([c[0]-1, c[1], c[2]+1])
    if(!tileMap.get(tLKey)) {
        neighbours.push("null")
    } else {
        neighbours.push(tileMap.get(tLKey).uid.toString())
    }

    return neighbours
}

let reached = new Map()
let aStarColour = "#ffe600"
let floodFillColour= "#e31010"
let uniformCostColour  ="#10a0e3"
let greedyColour = "#d810e3"

function breadthFirst(origin, destination) {
    let frontier = new Queue()
    let cameFrom = new Map()
    let queueable = origin.cubeCoords
    queueable.name = origin.name
    frontier.enqueue(queueable)
    reached.set(origin.name, origin.name)
    //console.log("Created Frontier Queue and Reached Map: ")


    let found = false
    let iterations = 0;
    while(!frontier.isEmpty()){
        iterations++
        let current = frontier.dequeue()
        let neighbours = getViableNeighbours(current, reached)

        for(let i = 0; i < neighbours.length; i++) {
            if(cameFrom.get(neighbours[i].name)){
                //console.log("Neighbour has already been visited.")
                continue
            }


            reached.set(neighbours[i].name, neighbours[i].name)
            cameFrom.set(neighbours[i].name, current.name)

            if(neighbours[i].name === destination.name){
                console.log("breadthFirst (red, overshadowed by uniFormCost) Found the destination after ",iterations, "iterations.")
                found = true
                frontier.flush()
                break
            }


            queueable = neighbours[i].cubeCoords
            queueable.name = neighbours[i].name
            frontier.enqueue(queueable)
            if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== TARGET) {
                neighbours[i].material.color.set(floodFillColour)
            }
        }

        if(frontier.isEmpty() && found === false) {
            console.log("No Path Found!")
            break
        }
    }

    if(found) {
        let check = cameFrom.get(destination.name)
        let path = []
        while(check !== origin.name) {
            path.push(check)
            check = cameFrom.get(check)
        }


        for(let i = 0; i < path.length; i++){
            let pathObject = scene.getObjectByName(path[i])
            pathObject.material.color.set(pathObject.clickColour)
        }

    }

}

function uniformCost(origin, destinations) {

    if(destinations && !destinations.length) {
        destinations = [destinations]
    }
    let pathBroken = false
    let path = []
    for(let d = 0;d  < destinations.length; d++) {

        if(pathBroken){
            break
        }

        if(d !== 0) {
            origin = destinations[d-1]
        }

        let cameFrom = new Map()
        let frontier = new PriorityQueue()
        frontier.enqueue(origin, 0)
        let costSoFar = new Map()
        costSoFar.set(origin.name, 0)

        reached.set(origin.name, origin.name)
    

        let found = false
        let iterations = 0;
        while(!frontier.isEmpty()){
            iterations++
            let current = frontier.dequeue().element
            let neighbours = getViableNeighbours(current.cubeCoords, reached)

            console.log
    
            for(let i = 0; i < neighbours.length; i++) {
                if(cameFrom.get(neighbours[i].name)){
                    console.log("Neighbour has already been visited.")
                    continue
                }
    
                let newCost = costSoFar.get(current.name) + current.cubeCoords.distance(neighbours[i].cubeCoords)
    
                if(!costSoFar.get(neighbours[i].name) || newCost < costSoFar.get(neighbours[i].name))  {
                    costSoFar.set(neighbours[i].name, newCost)
                    let priority = newCost
    
                    reached.set(neighbours[i].name, neighbours[i].name)
                    cameFrom.set(neighbours[i].name, current.name)

                    frontier.enqueue(neighbours[i], priority)
                    if(!neighbours[i].pathStatus) {
                        neighbours[i].material.color.set(uniformCostColour)
                    }
    
                }
    
    
                if(neighbours[i].name === destinations[d].name){
                    console.log("uniformCost (blue) Found the destination after ",iterations, "iterations.")
                    found = true;
                    frontier.flush()
                    break
                }
    
            }
    
            if(frontier.isEmpty() && found === false) {
                console.log("No Path Found!")
                pathBroken = true
                break
            }
        }

        let check = cameFrom.get(destinations[d].name)
        while(check !== origin.name) {
            path.push(check)
            check = cameFrom.get(check)
        }
    
    
    }
    


    for(let i = 0; i < path.length; i++){
        let pathObject = scene.getObjectByName(path[i])
        pathObject.material.color.set(pathObject.clickColour)
    }
}

function breadthFirstAsSearch(origin, radius) {
      
    let frontier = new PriorityQueue()
    frontier.enqueue(origin, 0)
    reached.set(origin.name, origin.name)

    let findables = 0
    let iterations = 0;
    while(!frontier.isEmpty()){
        iterations++
        let current = frontier.dequeue().element
        let neighbours = getViableNeighbours(current.cubeCoords)

        for(let i = 0; i < neighbours.length; i++) {
            let nb = tileMap[neighbours[i]]

            if(reached.get(nb.name)){
                //console.log("Neighbour has already been visited.")
                continue
            }

            if(neighbours[i].cubeCoords.distance(origin.cubeCoords) > radius){
                console.log("Neighbour is out of reach.")
                continue
            }

            reached.set(neighbours[i].name, neighbours[i].name)
            frontier.enqueue(neighbours[i], 0)

            if(neighbours[i].pathStatus === FINDABLE){
                findables++
            }

            if(!neighbours[i].pathStatus) {
                neighbours[i].material.color.set(floodFillColour)
            }

        }

        if(frontier.isEmpty()) {
            console.log("breadthFirstasSearch (red) found ", findables, " within radius ", radius)
            break
        }
    }


 
}

function greedyDepthFirst(origin, destination) {
    let frontier = new PriorityQueue()
    frontier.enqueue(origin, 0)
    let cameFrom = new Map()
    reached.set(origin.name, origin.name)

    let found = false
    let iterations = 0;
    while(!frontier.isEmpty()){
        iterations++
        let current = frontier.dequeue().element
        let neighbours = getViableNeighbours(current.cubeCoords, reached)

        for(let i = 0; i < neighbours.length; i++) {
            if(cameFrom.get(neighbours[i].name)){
                //console.log("Neighbour has already been visited.")
                continue
            }

                let priority = destination.cubeCoords.distance(neighbours[i].cubeCoords)
                reached.set(neighbours[i].name, neighbours[i].name)
                cameFrom.set(neighbours[i].name, current.name)
                frontier.enqueue(neighbours[i], priority)


            if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== TARGET) {
                neighbours[i].material.color.set(greedyColour)
            }


            if(neighbours[i].name === destination.name){
                console.log("greedyDepthFirst (purple) Found the destination after ",iterations, "iterations.")
                found = true;
                frontier.flush()
                break
            }

        }

        if(frontier.isEmpty() && found === false) {
            console.log("No Path Found!")
            break
        }
    }

    if(found) {
        let check = cameFrom.get(destination.name)
        let path = []
        while(check !== origin.name) {
            path.push(check)
            check = cameFrom.get(check)
        }


        for(let i = 0; i < path.length; i++){
            let pathObject = scene.getObjectByName(path[i])
            pathObject.material.color.set(pathObject.clickColour)
        }

    }
}

function aStar(origin, destination) {
    let frontier = new PriorityQueue()
    frontier.enqueue(origin, 0)
    let costSoFar = new Map()
    costSoFar.set(origin.name, 0)
    let cameFrom = new Map()
    reached.set(origin.name, origin.name)

    let found = false
    let iterations = 0;
    while(!frontier.isEmpty()){
        iterations++
        let current = frontier.dequeue().element
        let neighbours = getViableNeighbours(current.cubeCoords, reached)

        for(let i = 0; i < neighbours.length; i++) {
            if(cameFrom.get(neighbours[i].name)){
                //console.log("Neighbour has already been visited.")
                continue
            }

            let newCost = costSoFar.get(current.name) + current.cubeCoords.distance(neighbours[i].cubeCoords)

            if(!costSoFar.get(neighbours[i].name) || newCost < costSoFar.get(neighbours[i].name))  {
                costSoFar.set(neighbours[i].name, newCost)
                let priority = newCost + destination.cubeCoords.distance(neighbours[i].cubeCoords)


                reached.set(neighbours[i].name, neighbours[i].name)
                cameFrom.set(neighbours[i].name, current.name)



                frontier.enqueue(neighbours[i], priority)
                if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== TARGET) {
                    neighbours[i].material.color.set(aStarColour)
                }


            }


            if(neighbours[i].name === destination.name){
                console.log("aStar (yellow) Found the destination after ",iterations, "iterations.")
                found = true;
                frontier.flush()
                break
            }

        }

        if(frontier.isEmpty() && found === false) {
            console.log("No Path Found!")
            break
        }
    }

    if(found) {
        let check = cameFrom.get(destination.name)
        let path = []
        while(check !== origin.name) {
            path.push(check)
            check = cameFrom.get(check)
        }


        for(let i = 0; i < path.length; i++){
            let pathObject = scene.getObjectByName(path[i])
            pathObject.material.color.set(pathObject.clickColour)
        }

    }
}

function weightedAStar(origin, destinations) {

    if(destinations && !destinations.length) {
        destinations = [destinations]
    }
    let pathBroken = false
    let path = []
    let found = false

    for(let d = 0;d  < destinations.length; d++) {

        if(pathBroken){
            break
        }

        if(d !== 0) {
            origin = destinations[d-1]
        }

        let frontier = new PriorityQueue()
        frontier.enqueue(origin, 0)
        let costSoFar = new Map()
        costSoFar.set(origin.name, 0)
        let cameFrom = new Map()
        reached.set(origin.name, origin.name)
    

        let iterations = 0;
        while(!frontier.isEmpty()){
            iterations++
            let current = frontier.dequeue().element
            console.log(current.neighbours)
            let neighbours = current.neighbours//getViableNeighbours(current.cubeCoords, reached)

            if(neighbours.length) {
                for(let i = 0; i < neighbours.length; i++) {
                    if(cameFrom.get(neighbours[i].name)){
                        console.log("Neighbour has already been visited.")
                        continue
                    }

                    let newCost = costSoFar.get(current.name) + current.cubeCoords.distance(neighbours[i].cubeCoords)
                    newCost = newCost * neighbours[i].cost


                    if(!costSoFar.get(neighbours[i].name) || newCost < costSoFar.get(neighbours[i].name))  {
                        costSoFar.set(neighbours[i].name, newCost)
                        let priority = newCost + destinations[d].cubeCoords.distance(neighbours[i].cubeCoords)


                        reached.set(neighbours[i].name, neighbours[i].name)
                        cameFrom.set(neighbours[i].name, current.name)



                        frontier.enqueue(neighbours[i], priority)
                        if(!neighbours[i].pathStatus) {
                            neighbours[i].material.color.set(aStarColour)
                        }


                    }


                    if(neighbours[i].name === destinations[d].name){
                        console.log("aStar (yellow) Found the destination after ",iterations, "iterations.")
                        found = true;
                        frontier.flush()
                        break
                    }

                }
            }

    
            if(frontier.isEmpty() && found === false) {
                console.log("No Path Found!")
                break
            }
    

        }

        if(found) {
            let check = cameFrom.get(destinations[d].name)
            while(check !== origin.name) {
                path.push(check)
                check = cameFrom.get(check)
            }
        }


    }

    if(found){
        for(let i = 0; i < path.length; i++){
            let pathObject = scene.getObjectByName(path[i])
            pathObject.material.color.set(pathObject.clickColour)
        }
    }


}

function hexMesh(parent, dir, isDummy) {
    let x = 0
    let y = 0
    let z = 0

    let color = 0x00ff00

    const hoverColour = '#eb6363'
    const clickColour = '#a87c39'
    const realRadius =  12
    const geo = new THREE.CylinderGeometry(realRadius-0.8,realRadius,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: color})
    const hex = new THREE.Mesh(geo, mat)
    let name = hex.id
    hex.uid = hexCount
    hex.name = name
    hex.cpos = [0,0,0]

    if(parent && dir){
        let r = parent.realRadius
        let q = round(Math.sqrt(Math.pow(r,2) - Math.pow((r/2),2))); //y midway to origin of tessellated hexagon on same x
        let p = round(Math.sqrt(Math.pow(r/2, 2))); //x of the origin of a tessellated hexagon on same y
        let c = parent.cpos
        hex.cpos = [0,0,0]

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
    } else {
        hex.parentHex = true
    }

    if(!isDummy) {
        tileMap.set(toKey(hex.cpos), hex)
    }

    hex.rotation.set(0, degToRad(30),0)
    hex.position.set(x, y, z)
    hex.realRadius = realRadius

    //lighting
    hex.castShadow = true
    hex.receiveShadow = true

    //mouseEvents
    hex.baseColour = color
    hex.hoverColour = hoverColour
    hex.clickColour = clickColour

    hex.originColour = "#2d5afc"
    hex.destinationColour = "#11f2f2"
    hex.impassableColour = "#202430"
    hex.pathColour = "#e88858"
    hex.findableColour = "#ff0000"

    hex.cost = 1
    hex.name = hex.id
    hex.clickable = true;
    addMouseEvents(hex, interactionManager)

    let rng = Math.floor(Math.random() * 100);
    if(rng > 50) {
        impassableTileHandler(hex)
    }
    if(rng > 98) {
        hex.cost = 10
        findableTileHandler(hex)
    }

    if(!isDummy) {

        let tile = {
            pos: [x,y,z],
            type: (hex.pathStatus === IMPASSABLE ? "mountain" : "plain"),
            uid: hexCount.toString(),
            cpos: hex.cpos,
        }

        mapStore.gameData.tiles.set(tile.uid, tile)
        hexCount++
    }
    return hex
}

function addTileNeighbours() {
    let tiles = mapStore.gameData.tiles
    console.log("Tile Array: ", tiles.size)

    for (let[k,v] of tiles ) {
        console.log("Looking for Neighbours of: ",k)
        console.log("Using: ", v.cpos)

        let neighbours = getAllNeighbours(v.cpos)
        console.log("Found: ", neighbours)
        v.neighbours = neighbours
    }
}

function addMouseEvents(object, interactionManager){
    interactionManager.add(object)

    object.addEventListener('click', function(e) {
        e.stopPropagation()

        console.log(object.uid)
        console.log(object.position)

        // clickHandler(object)
        // if(origin && destinations.length === destinationTotal) {
        //
        //     // let t1 = performance.now()
        //     // weightedAStar(origin,destinations)
        //     // let t2 = performance.now()
        //     // console.log("Time To Run: ", round(t2-t1),"ms, total memory usage: ", round(performance.memory.usedJSHeapSize/1000000), "Mb")
        //
        // }

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

    if(!object.pathStatus && origin && destinations.length < destinationTotal){
        destinationHandler(object)
        return
    }
}

function impassableTileHandler(object){
    object.pathStatus = IMPASSABLE
    object.material.color.set(object.impassableColour)
}

function findableTileHandler(object){
    object.pathStatus = FINDABLE
    object.material.color.set(object.findableColour)
}


function clearTileHandler(object) {
    object.material.color.set(object.baseColour)
    object.pathStatus = null
}

function badTileHandler(object) {
    object.material.color.set("#fa1100")
    object.pathStatus = null
}

function clearMapHandler() {

    if(origin) {
        origin.pathStatus = null
        origin.material.color.set(origin.baseColour)
        origin = null
    }

    if(destinations.length) {
        for(let i = 0; i < destinations.length; i++) {
            let destObj = destinations[i]
            destObj.pathStatus = null
            destObj.material.color.set(destObj.baseColour)
            
        }
        destinations = []
        
    }

    for(let[k] of reached.entries()) {
        let obj = scene.getObjectByName(k)

        if(obj.pathStatus){
            if(obj.pathStatus === FINDABLE) {
                obj.material.color.set(obj.findableColour)
            }

          continue
        }

        reached.delete(k)
        obj.material.color.set(obj.baseColour)
        obj.pathStatus = null
    }

}

function originHandler(object){
    origin = object
    object.pathStatus = ORIGIN
    object.material.color.set(object.destinationColour)
}

function destinationHandler(object){
    destinations.push(object)
    object.pathStatus = TARGET
    object.material.color.set(object.destinationColour)
}

function spotLight() {
    const light = new THREE.SpotLight(0xFFFFFF, 0.5);
    light.position.set(0, 1000, 0);
    light.rotation.set(degToRad(180),0,0)
    light.castShadow = true;
    light.shadow.mapSize.x = light.shadow.mapSize.x  * shadowPerformanceFactor
    light.shadow.mapSize.y = light.shadow.mapSize.y * shadowPerformanceFactor
    light.shadow.camera.x = light.shadow.mapSize.x * 20
    light.shadow.camera.y = light.shadow.mapSize.y * 20
    light.shadow.camera.far *= 2
    light.angle = 1;
    const helper = new THREE.SpotLightHelper(light);
    return {light, helper}
}

function getRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true;
    return renderer
}

function populateScene(meshArray) {
    for(let i = 0; i < meshArray.length; i++){
        scene.add(meshArray[i])
    }
}


function colorLightener(color, percent) {
    var num = parseInt(color,16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt*3,
        B = (num >> 8 & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt*2;

    return (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
};


function sleep(milliseconds) {
    let start = new Date().getTime();
    for (let i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

function degToRad(deg){
    return (Math.PI/180) * deg
}

function round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}
