import axios from 'axios'

function GetStateUpdates(stateSetter){
    axios.get("http://localhost:8080/api/gamestate/updates")
    .then(response => {
        const gameData = response.data
        stateSetter(gameData)
    })
}

export default GetStateUpdates;