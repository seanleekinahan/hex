import { Canvas } from '@react-three/fiber'
import './App.css';
import Hex from './components/hex'
import Box from './components/box'
import Lights from './components/lights'
import Camera from './components/camera';
import { useEffect, useState } from 'react';
import {Connect, RequestGameState} from './websockets/conn'


import GetGamestate from './api/gamestate';

function App() {
  const [stateID, setStateID] = useState(-1)

  const [gameData, setGameData] = useState({});
  const [initialLoad, setInitialLoad] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [tileChildren, setTileChildren] = useState([]);
  const [socket, setSocket] = useState(null);

  const SECOND_MS = 1000;

  //Load Full State

  useEffect(
      () => {
        Connect(setSocket, setGameData, setStateID)
      },
      []
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
    if(gameData.stateID !== stateID || !initialLoad){
      //console.log("Updating local state ID.")
      setStateID(gameData.stateID)
    } else {
      //console.log("Passing on mesh updates.")
      return
    }

    //console.log("Got new State ID: ", stateID," generating new hexmap!")
    if(gameData.tiles){

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
                />
            )
          }
        }

        hexes.push(
          < Hex 
            position={[tile.pos[0], tile.pos[1], tile.pos[2]]}
            key={tile.uid}
            uid={tile.uid}
            type={tile.type}            />
        )
      }

      setTileChildren(hexChildren)
      setTiles(hexes)
    }
  }, [gameData, stateID])

  return (
      <>
        <Canvas>
          < Lights />
          < Camera />
          {tiles}
          {tileChildren}
        </Canvas>
        <button>
          TestText
        </button>
      </>

  );
}

export default App;
