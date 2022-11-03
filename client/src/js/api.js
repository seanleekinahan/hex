import axios from "axios";

function SendState(state){

    console.log(state.gameData)
    //Stringify Map for gin-gonic JSON binding
    state.gameData.tiles = JSON.stringify(Object.fromEntries(state.gameData.tiles))
    let config = {
        headers: {
            //'Content-Type': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }

    //Stringify entire state object for use with Content-Type because.. reasons.
    axios.post("http://localhost:8080/api/gamestate",  JSON.stringify(state), config)
        .catch((err) => {
            console.error(err)
        })
        .then( res => {
            console.log(res)
        })

}

export default SendState;