import * as THREE from "three";

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
