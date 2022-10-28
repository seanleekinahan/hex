import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "three.interactive";
import {Vector2, Vector3} from "three";

class CCVector {
    constructor(q, r, s) {
        this.q = q,
        this.r = r,
        this.s = s
    }

    distance = function(v){
        let vec = new CCVector(this.q - v.q, this.r - v.r, this.s - v.s)
        return (Math.abs(vec.q) + Math.abs(vec.r) + Math.abs(vec.s)) / 2
    }

    toKey = function (q, r, s){
        if(!q && !r && !s){
            q = this.q.toString()
            r = this.r.toString()
            s = this.r.toString()
        } else if (q && r && s) {
            q = q.toString()
            r = r.toString()
            s = r.toString()
        }

        return q+r+s
    }
}

const DIR_TOP = 'top'
const DIR_TOPRIGHT = 'topRight'
const DIR_BOTTOMRIGHT = 'bottomRight'
const DIR_BOTTOM = 'bottom'
const DIR_BOTTOMLEFT = 'bottomLeft'
const DIR_TOPLEFT = 'topLeft'

const ORIGIN = "origin"
const DESTINATION = "destination"
const IMPASSABLE = "impassable"
let origin = null
let destination = null

const SHOWSPIRAL = false

let hexCount = 0

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
    1000
);
camera.position.set(300,250,10)

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.maxPolarAngle = degToRad(75)

const interactionManager = new InteractionManager(
    renderer,
    camera,
    renderer.domElement
)

//Tiles
hexSpiral(10)
populateScene(sceneArray)

//Lights
let sLight = spotLight()
scene.add(sLight.light)
//let sLightShadow = new THREE.CameraHelper(sLight.light.shadow.camera)
//scene.add(sLight.helper)
//scene.add(sLightShadow)

function animate() {
    let oldClick = interactionManager.lastClicked
    interactionManager.update()
    if(oldClick !== interactionManager.lastClicked) {
        console.log(interactionManager.lastClicked)
    }

    renderer.render(scene, camera);
    orbit.update();
}

function degToRad(deg){
    return (Math.PI/180) * deg
}

function round(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

function hexSpiral(radius) {
    let parent = hexMesh()
    sceneArray.push(parent)
    for(let i = 1; i <= radius; i++) {

        parent = hexMesh(parent, DIR_TOP)
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

function getHexMeshNeighbours(vector) {
    let q, r, s = 0
    let neighbours = {}

    let tKey = new CCVector(vector.q, vector.r-1, vector.s+1).toKey()
    neighbours.top = scene.getObjectByName(tileMap.get(tKey))

    let tRKey = new CCVector(vector.q+1, vector.r-1, vector.s).toKey()
    neighbours.topRight = scene.getObjectByName(tileMap.get(tRKey))

    let bRKey = new CCVector(vector.q+1, vector.r, vector.s-1).toKey()
    neighbours.bottomRight = scene.getObjectByName(tileMap.get(bRKey))

    let bKey = new CCVector(vector.q, vector.r+1, vector.s-1).toKey()
    neighbours.bottom = scene.getObjectByName(tileMap.get(bKey))

    let bLKey = new CCVector(vector.q-1, vector.r+1, vector.s).toKey()
    neighbours.bottomLeft = scene.getObjectByName(tileMap.get(bLKey))

    let tLKey = new CCVector(vector.q-1, vector.r, vector.s+1).toKey()
    neighbours.topLeft = scene.getObjectByName(tileMap.get(tLKey))

    return neighbours
}


function getViablePaths(neighbours) {
    let paths = []
    for(let i = 0; i < Object.values(neighbours).length; i++) {
        if(Object.values(neighbours)[i] && Object.values(neighbours)[i].pathStatus !== IMPASSABLE){
            paths.push(Object.values(neighbours)[i])
        }
    }

    return paths
}

function hexMesh(parent, dir) {
    let x = 0
    let y = 3
    let z = 0

    let color = 0x00ff00
    if (SHOWSPIRAL) {
        color = "#"+colorLightener(0x00ff00, hexCount)
    }
    const hoverColour = '#eb6363'
    const clickColour = '#a87c39'
    const realRadius =  12
    const geo = new THREE.CylinderGeometry(realRadius-0.8,realRadius,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: color})
    const hex = new THREE.Mesh(geo, mat)
    let name = hex.id
    hex.name = name
    hex.cubeCoords = new CCVector(0,0,0, name)

    if(parent && dir){
        let r = parent.realRadius
        let q = round(Math.sqrt(Math.pow(r,2) - Math.pow((r/2),2))); //y midway to origin of tessellated hexagon on same x
        let p = round(Math.sqrt(Math.pow(r/2, 2))); //x of the origin of a tessellated hexagon on same y
        let c = parent.cubeCoords
        let cc = new CCVector(0,0,0, name)
        hex.cubeCoords = cc

        if (dir === DIR_TOP) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z + q*2
            hex.cubeCoords = new CCVector(c.q, c.r-1, c.s+1, name)
        }

        if (dir === DIR_TOPRIGHT) {
            x = parent.position.x - p - r
            y = parent.position.y
            z = parent.position.z + q
            hex.cubeCoords = new CCVector(c.q+1, c.r-1, c.s, name)
        }

        if (dir === DIR_BOTTOMRIGHT) {
            x = parent.position.x - p - r
            y = parent.position.y
            z = parent.position.z - q
            hex.cubeCoords = new CCVector(c.q+1, c.r, c.s-1, name)
        }

        if (dir === DIR_BOTTOM) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z - q*2
            hex.cubeCoords = new CCVector(c.q, c.r+1, c.s-1, name)
        }

        if (dir === DIR_BOTTOMLEFT) {
            x = parent.position.x + p + r
            y = parent.position.y
            z = parent.position.z - q
            hex.cubeCoords = new CCVector(c.q-1, c.r+1, c.s, name)
        }

        if (dir === DIR_TOPLEFT) {
            x = parent.position.x + p + r
            y = parent.position.y
            z = parent.position.z + q
            hex.cubeCoords = new CCVector(c.q-1, c.r, c.s+1, name)
        }
    } else {
        hex.parentHex = true
    }

    tileMap.set(hex.cubeCoords.toKey(), hex.name)

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

    hex.name = hex.id
    hex.clickable = true;
    addMouseEvents(hex, interactionManager)
    hexCount++

    let rng = Math.floor(Math.random() * 100);
    if(rng > 60) {
        impassableTileHandler(hex)
    }

    return hex
}

function addMouseEvents(object, interactionManager){
    interactionManager.add(object)


    // object.addEventListener('mouseout', function() {
    //     //console.log("MouseOut of", object.name)
    //     if(object.name !== interactionManager.lastClicked) {
    //         object.material.color.set(object.baseColor)
    //     }
    //     document.body.style.cursor ='auto'
    // });
    //
    //
    // object.addEventListener('mouseover', function() {
    //     //console.log("MouseOver ", object.name)
    //     // if(object.name !== interactionManager.lastClicked) {
    //     //     object.material.color.set(object.hoverColour)
    //     // }
    //     if(object.clickCycle && object.clickStatus === 0) {
    //         object.material.color.set(object.hoverColour)
    //     }
    //
    //     if(object.clickable) {
    //         document.body.style.cursor ='pointer'
    //     }
    // });


    object.addEventListener('click', function(e) {
        e.stopPropagation()

        clickCycle(object)
        if(origin && destination) {

            let originPos = scene.getObjectByName(origin).cubeCoords
            let destPos = scene.getObjectByName(destination).cubeCoords
            let neighbours = getHexMeshNeighbours(originPos)
            let paths = getViablePaths(neighbours)
            let nextTile = getNextStep(paths)
            let distance = originPos.distance(destPos)
            let i = 0;
            let safety = 500
            while(distance > 1) {
                i++
                console.log("Safety Counter: ", i, "of maximum ",safety)
                if(i > safety) {
                    console.log("Failed to find a path!")
                    break
                }
                neighbours = getHexMeshNeighbours(nextTile.cubeCoords)
                paths = getViablePaths(neighbours)
                nextTile = getNextStep(paths)
                if(nextTile){
                    distance = nextTile.cubeCoords.distance(destPos)
                    console.log("Distance: ", distance)
                } else {
                    break
                }

            }
        }


        //console.log("Viable Steps: ", paths)






        // object.material.color.set(object.clickColour)
        //
        // let oldClick =  interactionManager.lastClicked
        // interactionManager.lastClicked = object.name
        //
        // if(oldClick !== object.name) {
        //     let old = scene.getObjectByName(oldClick)
        //     if(old) {
        //         old.material.color.set(old.baseColor)
        //     }
        // }

        // let oldObj = scene.getObjectByName(interactionManager.lastClicked)
        // console.log("Object From Click", oldObj.name)
        // if(oldObj.parentHex) {
        //     console.log("Parent: ",oldObj.parentHex)
        // }
        //
        // if(object.cubeCoords) {
        //     console.log("Object Key: ",object.cubeCoords.toKey())
        //     console.log("Object has Neighbours: ",getHexMeshNeighbours(object.cubeCoords))
        // }





    })
}

let visited = new Map()
let usedPaths = []
let backtrackCounter = 0;
function getNextStep(paths){
    let bestPath = 2000000000
    let bestPathTile = null
    if(origin && destination){

        let foundPath = false
        let destPos = scene.getObjectByName(destination).cubeCoords
        for(let i = 0; i < paths.length; i++) {
            let pos = paths[i].cubeCoords
            let distance = pos.distance(destPos)
            if(distance < bestPath &&
                !visited.get(paths[i].name) && paths[i].pathStatus !== IMPASSABLE) {
                bestPath = distance
                bestPathTile = paths[i]
                foundPath = true
            }
        }

        if(!foundPath){
            backtrackCounter++
            console.log("Backtracked ", backtrackCounter, " times.")
            bestPathTile = usedPaths[usedPaths.length-1]
            console.log("Using backtrack tile: ", bestPathTile.cubeCoords)
            usedPaths.pop()

        }
        if(foundPath){
            usedPaths.push(bestPathTile)
        }

        visited.set(bestPathTile.name, bestPathTile.name)
        if (bestPathTile.name === destination) {
            console.log("WE MADE IT!")
            return
        }

        let newColor = "#"+colorLightener(bestPathTile.pathColour, visited.size*10)
        bestPathTile.material.color.set(newColor)

    }

    return bestPathTile

}

function clickCycle(object) {

    if(object.pathStatus === IMPASSABLE) {
        clearTileHandler()
        return
    }

    if(!object.pathStatus && !origin) {
        originHandler(object)
        return
    }

    if(!object.pathStatus && origin && !destination){
        destinationHandler(object)
        return
    }


}

function impassableTileHandler(object){
    object.pathStatus = IMPASSABLE
    object.material.color.set(object.impassableColour)
}

function clearTileHandler() {

    if(origin) {
        let originObj = scene.getObjectByName(origin)
        originObj.pathStatus = null
        originObj.material.color.set(originObj.baseColour)
        origin = null
    }

    if(destination) {
        let destObj = scene.getObjectByName(destination)
        destObj.pathStatus = null
        destObj.material.color.set(destObj.baseColour)
        destination = null
    }

    for(let[k] of visited.entries()) {
        let obj = scene.getObjectByName(k)
        visited.delete(k)
        console.log("Visited Object Clearing: ",obj)
        obj.material.color.set(obj.baseColour)
        obj.pathStatus = null
    }

    backtrackCounter = 0
    usedPaths = []

}

function originHandler(object){
    origin = object.name
    object.material.color.set(object.originColour)
}

function destinationHandler(object){
    destination = object.name
    object.material.color.set(object.destinationColour)
}

function spotLight() {
    const light = new THREE.SpotLight(0xFFFFFF, 1);
    light.position.set(-350, 300, 0);
    light.castShadow = true;
    light.shadow.mapSize.x = light.shadow.mapSize.x  * shadowPerformanceFactor
    light.shadow.mapSize.y = light.shadow.mapSize.y * shadowPerformanceFactor
    light.shadow.camera.x = light.shadow.mapSize.x * 10
    light.shadow.camera.y = light.shadow.mapSize.y * 10
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

renderer.setAnimationLoop(animate);

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