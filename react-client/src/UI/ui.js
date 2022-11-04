import './buttons.css'
import {useEffect, useState} from "react";

function UI(props){
    const [oneInfo, setOneInfo] = useState("Selection Information Shows Here!")


    useEffect(
        () => {
            if(props.contextOne.uid){
                let obj = props.contextOne
                setOneInfo(
                    "ID: " + obj.uid + "\n" +
                    "Pos: " + obj.cpos[0] + ", " +
                    obj.cpos[1] + ", " + obj.cpos[2] + "\n" +
                    "Type: " + obj.type + "\n"
                )
            }

        },
        [props]
    )

    return (
        <div className="ui">
            <div className="ui-topbar">
                <button className="ui-topbar-button" >
                    INFO 1
                </button>
                <button className="ui-topbar-button" >
                    INFO 2
                </button>
                <button className="ui-topbar-button" >
                    INFO 3
                </button>
                <button className="ui-topbar-button" >
                    INFO 4
                </button>
                <button className="ui-topbar-button" >
                    INFO 5
                </button>
            </div>
            <div className="ui-bottombar">
                <button className="ui-context" >
                    {oneInfo}
                </button>
                <button className="ui-context" >
                    CONTEXT ACTIONS?
                </button>
                <button className="ui-context" >
                    CONTEXT INVENTORY?
                </button>
            </div>
        </div>
    )
}

export default UI;