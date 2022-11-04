export function Connect(setSocket, setGameData, stateID){
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

    let testObj = {
        stateID: stateID,
    }

    //console.log("Requesting state with object: ", testObj)

    socket.send(JSON.stringify(testObj))
}