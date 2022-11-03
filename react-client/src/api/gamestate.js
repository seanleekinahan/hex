import axios from 'axios'

function GetGamestate(currentState, gameStateSetter){
    axios.get("http://localhost:8080/api/gamestate/"+currentState)
    .then(response => {
        if(response.status === 204) {
            //console.log("?")
        }

        const gameData = response.data
        //console.log("GetGamestate got gameData with state ID: ", gameData.stateID)
        gameStateSetter(gameData)
    })
}

export default GetGamestate;