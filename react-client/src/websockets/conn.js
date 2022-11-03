export function Connect(setSocket, setGameData){
    let ws = new WebSocket("ws://localhost:8080/api/websocket")

    ws.onopen = () => {
        setSocket(ws)
        RequestGameState(ws)
    }

    ws.onmessage = (e) => {

        let response = JSON.parse(e.data)

        if(response.stateID >= 0){
            console.log("Received WS Message: ",response.stateID)
            setGameData(response)
        }

        if(response.stateID < 0){
            console.log("Server has no updated gamestate.")
        }


    }

    ws.onclose = () => {
        console.log("Closed WS")
    }

    ws.onerror = (e) => {

    }

    return ws
}

export function RequestGameState(socket, stateID){

    let testObj = {
        stateID: stateID,
    }

    console.log("Requesting state with object: ", testObj)

    socket.send(JSON.stringify(testObj))
}