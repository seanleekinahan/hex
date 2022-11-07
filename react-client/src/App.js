import { Canvas } from '@react-three/fiber'
import './App.css';
import './components/labels.css'
import './UI/ui.css'
import Hex from './components/hex'
import Box from './components/box'
import Lights from './components/lights'
import Camera from './components/camera';
import UI from './UI/ui'
import { useEffect, useState } from 'react';
import {Connect, RequestGameState} from './websockets/conn'

function App() {
  const [stateID, setStateID] = useState(-1);

  const [gameData, setGameData] = useState({});
  const [tiles, setTiles] = useState([]);
  const [tileChildren, setTileChildren] = useState([]);
  const [socket, setSocket] = useState(null);
  const [contextOne, setContextOne] = useState({})
  const [code, setCode] = useState("")

  const SECOND_MS = 1000;

  //Load Full State

  useEffect(
      () => {

        const interval = setInterval(() => {

          if(!socket){
            Connect(setSocket, setGameData, stateID, setCode)
          }

        }, SECOND_MS);
        return () => clearInterval(interval);

      },
      [socket, stateID]
  )

  useEffect(
  () => {
    const interval = setInterval(() => {

      if(socket){
        RequestGameState(socket, stateID)
      }

    }, SECOND_MS);
    return () => clearInterval(interval);
  },
  [socket, stateID]);

  //Populate Meshes
  useEffect(() => {

    //console.log("Got new State ID: ", stateID," generating new hexmap!")
    if(gameData.tiles){

      //console.log("Updating local state ID.")
      setStateID(gameData.stateID)

      let hexes = []
      let hexChildren = []
      for(let tile of gameData.tiles) {

        if(tile.onTile) {

          for(let c of Object.entries(tile.onTile)) {
            let child = c[1]
            hexChildren.push(
                < Box
                    position={[child.pos[0], child.pos[1]+1, child.pos[2]]}
                    key={child.uid}
                    uid={child.uid}
                    type={child.type}
                    cpos={tile.cpos}
                    contextSetter={setContextOne}
                />
            )
          }
        }

        hexes.push(
          < Hex 
            position={[tile.pos[0], tile.pos[1], tile.pos[2]]}
            key={tile.uid}
            uid={tile.uid}
            type={tile.type}
            cpos={tile.cpos}
            adj={tile.neighbours}
            contextSetter={setContextOne}
          />
        )
      }

      setTileChildren(hexChildren)
      setTiles(hexes)
    }
  }, [gameData, stateID])

  return (
      <div className="wrapper">

        <Canvas>
          < Lights />
          < Camera />
          {tiles}
          {tileChildren}
        </Canvas>
        <div className="ui">
          <UI ws={socket} contextOne={contextOne} code={code} setCode={setCode} key={"context1"}/>
        </div>
      </div>

  );
}

export default App;
