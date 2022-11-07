import './buttons.css'
import {useEffect, useState} from "react";

import AceEditor from "react-ace";
import {RequestCode, RequestGameState} from "../websockets/conn";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-cobalt";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/webpack-resolver";

function UI(props){
    const [oneInfo, setOneInfo] = useState("Selection Information Shows Here!")
    const [codeModalShow, setCodeModalShow] = useState(false)
    const [codeModal, setCodeModal] = useState()

    useEffect(
        () => {
            const interval = setInterval(() => {
                if(!props.code){
                    RequestCode(props.ws)
                }


            }, 1000);
            return () => clearInterval(interval);
        }
        ,
        [props.ws, props.code]
    )


    function CodeModal(){
        if(codeModalShow){
            if(!codeModal){

                return (
                    <div className="editor-wrapper">
                        <AceEditor
                            className={"editor"}
                            mode="javascript"
                            theme="cobalt"
                            //onChange={}
                            name="editor"
                            editorProps={{ $blockScrolling: true }}
                            defaultValue={props.code}
                            commands={[{
                                name: "save",
                                bindKey: {win: "Ctrl-S", "mac": "Cmd-S"},
                                exec: function(editor) {
                                    props.setCode(editor.session.getValue())
                                }
                            }]}
                        />
                    </div>
                )

            } else {
                return codeModal
            }
        }
    }


    useEffect(
        () => {
            if(props.contextOne.uid){
                let obj = props.contextOne

                let basicInfo =
                    "ID: " + obj.uid + "\n" +
                    "Pos: " + obj.cpos[0] + ", " +
                    obj.cpos[1] + ", " + obj.cpos[2] + "\n" +
                    "Type: " + obj.type + "\n"

                if(obj.adj) {
                    basicInfo += "Neighbours: \n"
                    for(let [k,v] of Object.entries(obj.adj)) {
                        basicInfo += k + ": " + v.type + "\n"
                    }
                }

                setOneInfo(
                    basicInfo
                )
            }

        },
        [props]
    )

    return (
        <div className="ui">
            <div className="ui-topbar">
                <button className="ui-topbar-button" onClick={() => {
                    setCodeModalShow(!codeModalShow)
                }}>
                    CODE
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

            <CodeModal />


            <div className="ui-bottombar">
                <button className="ui-context" >
                    {oneInfo}
                </button>
                <button className="ui-context" >

                </button>

                <button className="ui-context" >
                    CONTEXT INVENTORY?
                </button>
            </div>
        </div>
    )
}

export default UI;