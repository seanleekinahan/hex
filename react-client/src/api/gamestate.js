import axios from 'axios'

function GetGamestate(stateSetter){
    axios.get("http://localhost:8080/api/gamestate")
    .then(response => {
        const gameData = response.data
        stateSetter(gameData)
    })
}

export default GetGamestate;