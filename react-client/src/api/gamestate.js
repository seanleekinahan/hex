import axios from 'axios'

function GetGamestate(gameStateSetter){
    axios.get("http://localhost:8080/api/gamestate")
    .then(response => {
        const gameData = response.data
        console.log("GetGamestate got gameData with state ID: ", gameData.stateID)
        gameStateSetter(gameData)
    })
}

export default GetGamestate;