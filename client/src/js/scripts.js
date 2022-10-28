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
}

const DIR_TOP = 1
const DIR_TOPRIGHT = 2
const DIR_BOTTOMRIGHT = 3
const DIR_BOTTOM = 4
const DIR_BOTTOMLEFT = 5
const DIR_TOPLEFT = 6


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
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.maxPolarAngle = degToRad(75)
camera.position.set(250,400,0)

const interactionManager = new InteractionManager(
    renderer,
    camera,
    renderer.domElement
)

//Tiles
hexSpiral(5)
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
        //dummy direction 0 (top)
        let dummyHex = hexMesh(parent, DIR_TOP)
        parent = dummyHex
        console.log("Created Dummy Hex")

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOMRIGHT)
            parent = hex
            sceneArray.push(hex)
        }
        //direction 2 (bottom)
        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOM)
            parent = hex
            sceneArray.push(hex)
        }
        //direction 3 (bottom left)
        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_BOTTOMLEFT)
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOPLEFT)
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOP)
            parent = hex
            sceneArray.push(hex)
        }

        for(let j = 0; j < i; j++) {
            let hex = hexMesh(parent, DIR_TOPRIGHT)
            parent = hex
            sceneArray.push(hex)
        }
    }
}

function hexMesh(parent, dir) {
    let x = 0
    let y = 3
    let z = 0

    const color = 0x00ff00
    const hoverColour = '#eb6363'
    const clickColour = '#a87c39'
    const realRadius =  12
    const geo = new THREE.CylinderGeometry(realRadius-0.8,realRadius,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: color})
    const hex = new THREE.Mesh(geo, mat)
    hex.cubeCoords = new CCVector(0,0,0)

    if(parent && dir){
        let r = parent.realRadius
        let q = round(Math.sqrt(Math.pow(r,2) - Math.pow((r/2),2))); //y midway to origin of tessellated hexagon on same x
        let p = round(Math.sqrt(Math.pow(r/2, 2))); //x of the origin of a tessellated hexagon on same y
        let c = parent.cubeCoords
        let cc = new CCVector(0,0,0)
        hex.cubeCoords = cc

        if (dir === DIR_TOP) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z + q*2
            hex.cubeCoords = new CCVector(c.q, c.r-1, c.s+1)
        }

        if (dir === DIR_TOPRIGHT) {
            x = parent.position.x + p + r
            y = parent.position.y
            z = parent.position.z + q
            hex.cubeCoords = new CCVector(c.q+1, c.r-1, c.s)
        }

        if (dir === DIR_BOTTOMRIGHT) {
            x = parent.position.x + p +r
            y = parent.position.y
            z = parent.position.z - q
            hex.cubeCoords = new CCVector(c.q+1, c.r, c.s-1)
        }

        if (dir === DIR_BOTTOM) {
            x = parent.position.x
            y = parent.position.y
            z = parent.position.z - q*2
            hex.cubeCoords = new CCVector(c.q, c.r+1, c.s-1)
        }

        if (dir === DIR_BOTTOMLEFT) {
            x = parent.position.x - p -r
            y = parent.position.y
            z = parent.position.z - q
            hex.cubeCoords = new CCVector(c.q-1, c.r+1, c.s)
        }

        if (dir === DIR_TOPLEFT) {
            x = parent.position.x - p -r
            y = parent.position.y
            z = parent.position.z + q
            hex.cubeCoords = new CCVector(c.q-1, c.r-1, c.s+1)
        }
    } else {
        hex.parentHex = true
    }

    console.log("Created Hex At: ", hex.cubeCoords)
    console.log("Moved in Dir: ", dir)

    hex.rotation.set(0, degToRad(30),0)
    hex.position.set(x, y, z)
    hex.realRadius = realRadius

    //lighting
    hex.castShadow = true
    hex.receiveShadow = true

    //mouseEvents
    hex.baseColor = color
    hex.hoverColour = hoverColour
    hex.clickColour = clickColour

    hex.name = hex.id
    hex.clickable = true;
    addMouseEvents(hex, interactionManager)

    return hex
}

function addMouseEvents(object, interactionManager){
    interactionManager.add(object)
    object.addEventListener('mouseout', function() {
        //console.log("MouseOut of", object.name)
        if(object.name !== interactionManager.lastClicked) {
            object.material.color.set(object.baseColor)
        }
        document.body.style.cursor ='auto'
    });
    object.addEventListener('mouseover', function() {
        //console.log("MouseOver ", object.name)
        if(object.name !== interactionManager.lastClicked) {
            object.material.color.set(object.hoverColour)
        }
        if(object.clickable) {
            document.body.style.cursor ='pointer'
        }
    });
    object.addEventListener('click', function(e) {
        e.stopPropagation()
        object.material.color.set(object.clickColour)

        let oldClick =  interactionManager.lastClicked
        interactionManager.lastClicked = object.name

        let oldObj = scene.getObjectByName(interactionManager.lastClicked)
        console.log("Last Clicked", oldObj.cubeCoords)
        if(oldObj.parentHex) {
            console.log("Parent: ",oldObj.parentHex)
        }


        if(oldClick !== object.name) {
            let old = scene.getObjectByName(oldClick)
            if(old) {
                old.material.color.set(old.baseColor)
            }
        }


    })
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