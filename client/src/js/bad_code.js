import * as THREE from "three";
import Queue from "./queue.js";
import PriorityQueue from "./priorityqueue.js";

function worldPlane() {
    const color = "#e0eeef"
    const hoverColour = '#e0eeef'
    const clickColour = '#e0eeef'
    const geo = new THREE.PlaneGeometry(500,500)
    const mat = new THREE.MeshLambertMaterial({color: "#e0eeef"})
    const plane = new THREE.Mesh(geo, mat)
    plane.rotation.set(degToRad(270),degToRad(0),degToRad(0))
    plane.position.set(0,-1,0)
    plane.receiveShadow = true;
    plane.baseColor = color;
    plane.hoverColour = hoverColour
    plane.clickColour = clickColour
    plane.name = plane.id
    addMouseEvents(plane, interactionManager)
    return plane
}

function hexMeshOriginMarker(parent) {
    const color = 0x00ff00
    const realRadius =  2
    const geo = new THREE.CylinderGeometry(realRadius,realRadius,1,6,2)
    const mat = new THREE.MeshStandardMaterial({color: color})
    const hex = new THREE.Mesh(geo, mat)
    hex.position.set(parent.position.x, parent.position.y, parent.position.z)
    hex.scale.set(0.1,5,0.1)
    return hex
}

function ambientLight() {
    const a = new THREE.AmbientLight(0x333333, 0)
    return a
}

function directionalLight() {
    const light = new THREE.DirectionalLight(0x333333, 3)
    light.position.set(0,100,0)
    light.castShadow = true;
    light.shadow.camera.left = light.shadow.camera.left * shadowPerformanceFactor;
    light.shadow.camera.right = light.shadow.camera.right * shadowPerformanceFactor;
    light.shadow.camera.top = light.shadow.camera.top * shadowPerformanceFactor;
    light.shadow.camera.bottom = light.shadow.camera.bottom * shadowPerformanceFactor;
    light.shadow.mapSize.x = 128  * shadowPerformanceFactor
    light.shadow.mapSize.y = 128 * shadowPerformanceFactor
    const helper = new THREE.DirectionalLightHelper(light, 10)
    helper.position.set(0,20,0)
    const shadowHelper = new THREE.CameraHelper(light.shadow.camera)
    return {light, helper, shadowHelper}
}

let usedPaths = []
let backtrackCounter = 0;
function myPathfinder(origin, destination){

    let cameFrom = new Map()
    let current = origin
    function bestTile(current){
        let bestPath = 2000000000
        let bestPathTile = null
        let paths = getViableNeighbours(current.cubeCoords)
        let foundPath = false
        let destPos = destination.cubeCoords
        for(let i = 0; i < paths.length; i++) {
            let pos = paths[i].cubeCoords
            let distance = pos.distance(destPos)
            if(distance > bestPath) {
                console.log("Distance of ",distance, " is larger than best path of: ", bestPath)
                continue
            }
            if(paths[i].pathStatus === IMPASSABLE) {
                console.log("Path is impassable.")
                continue
            }
            if(cameFrom.get(paths[i].name)){
                console.log("Path already visited.")
                continue
            }

            bestPath = distance
            bestPathTile = paths[i]
            cameFrom.set(paths[i].name, current.name)
            let newColor = "#"+colorLightener(bestPathTile.pathColour, 100)
            bestPathTile.material.color.set(newColor)
            usedPaths.push(bestPathTile)
            foundPath = true
        }

        if(!foundPath){
            backtrackCounter++
            console.log("Backtracked ", backtrackCounter, " times.")
            cameFrom.set(usedPaths[usedPaths.length-1].name, current.name)
            bestPathTile = usedPaths[usedPaths.length-1]
            console.log("Using backtrack tile: ", bestPathTile.cubeCoords)
            usedPaths.pop()

        }

        return bestPathTile
    }

    let tile = bestTile(current)

    let iterations = 0
    while(tile.cubeCoords.distance(destination.cubeCoords) > 1){
        iterations++
        tile = bestTile(tile)
        if(tile.cubeCoords.distance(destination.cubeCoords) === 1) {
            console.log(" myPathfinder Found the destination after ",iterations, "iterations.")
            break
        }
    }


    let check = cameFrom.get(destination.name)
    console.log(cameFrom)
    let path = []
    while(check !== origin.name) {
        path.push(check)
        check = cameFrom.get(check)
    }

    for(let i = 0; i < path.length; i++){
        let pathObject = scene.getObjectByName(path[i])
        pathObject.material.color.set(pathObject.clickColour)
    }

    console.log("myPathfinder PathLength: ", path.length)

}

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
            if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== WAYPOINT) {
                neighbours[i].material.color.set(colours.breadthFirst)
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
            pathObject.material.color.set(colours.path)
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
                        neighbours[i].material.color.set(colours.uniformCost)
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
        pathObject.material.color.set(colours.path)
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


            if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== WAYPOINT) {
                neighbours[i].material.color.set(colours.greedyDepthFirst)
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
            pathObject.material.color.set(colours.path)
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
                if(neighbours[i].pathStatus !== ORIGIN && neighbours[i].pathStatus !== WAYPOINT) {
                    neighbours[i].material.color.set(colours.aStar)
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
            pathObject.material.color.set(colours.path)
        }

    }
}

function clearTileHandler(object) {
    object.material.color.set(colours.plain)
    object.pathStatus = null
}