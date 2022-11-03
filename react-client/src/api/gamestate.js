import axios from 'axios'

function GetGamestate(currentState, gameStateSetter){
    axios.get("http://localhost:8080/api/gamestate/"+currentState)
    .then(response => {
        if(response.status === 204) {
            //console.log("Found same state on server.")
        }

        if(response.status === 200) {
            const gameData = response.data
            //console.log("Found new state with state ID: ", gameData.stateID)
            gameStateSetter(gameData)
        }
    })
}

export default GetGamestate;