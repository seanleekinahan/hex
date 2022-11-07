export function Connect(setSocket, setGameData, stateID, setCode){
    let ws = new WebSocket("ws://localhost:8080/api/websocket")

    ws.onopen = () => {
        setSocket(ws)
        RequestGameState(ws, stateID)
    }

    ws.onmessage = (e) => {

        let response = JSON.parse(e.data)

        if(response.stateID > stateID){
            console.log("Server has new gamestate: ",response.stateID)
            setGameData(response)
        }

        if(response.stateID < 0){
            //console.log("Server has no updated gamestate.")
        }

        if(response.spoof){
            setCode(response.spoof)
        }

    }

    ws.onclose = (e) => {
        console.log("Websocket closed: ", e)
        setSocket(undefined)
    }

    ws.onerror = (e) => {
        console.log("Websocket error: ", e)
        setSocket(undefined)
    }

    return ws
}

export function RequestGameState(socket, stateID){

    let req = {
        type: "state",
        stateID: stateID,
    }

    //console.log("Requesting state with object: ", req)
    socket.send(JSON.stringify(req))
}

export function RequestMoveIntent(socket, intent){

    let req = {
        type: "intent",
        intent: {
            user: "user",
            type: "move",
            actor: intent.actor,
            actorParent: intent.actorParent,
            target: intent.target
        }
    }


    socket.send(JSON.stringify(req))
}

export function RequestCode(socket) {

    let req = {
        spoof: true
    }

    if(socket){
        console.log("sending  ", req)

        socket.send(JSON.stringify(req))
    }

}