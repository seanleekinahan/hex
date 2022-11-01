import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import './App.css';
import Hex from './components/hex'
import Box from './components/box'
import Lights from './components/lights'
import Camera from './components/camera';
import { useEffect, useState } from 'react';

import GetGamestate from './api/gamestate';
import GetStateUpdates from './api/updatestate';

function App() {

  const [stateID, setStateID] = useState(0)

  const [gameData, setGameData] = useState({});
  const [tiles, setTiles] = useState([]);
  const [tileChildren, setTileChildren] = useState([]);
  const [updateData, setUpdateData] = useState({});

  const MINUTE_MS = 60000;
  const SECOND_MS = 1000;

  //Load Full State
  useEffect(() => {
    const interval = setInterval(() => {
      GetGamestate(setGameData)
    }, SECOND_MS);
    return () => clearInterval(interval);
  }, []);

  //Populate Meshes
  useEffect(() => {
    if(gameData.stateID && gameData.stateID !== stateID){
      setStateID(gameData.stateID)
    } else {
      return
    }

    console.log("Got new State ID, generating new hexmap!")
    if(gameData.tiles){

      let hexes = []
      let hexChildren = []
      for(let tile of gameData.tiles) {

        if(tile.onTile) {
          for(let child of tile.onTile) {

            console.log("Created a tile child: ",child)
            hexChildren.push(
                < Box
                    position={[child.pos[0], child.pos[1], child.pos[2]]}
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
  }, [gameData])

  return (
    <Canvas>
      < Lights />
      < Camera />
      
      {tiles}
      {tileChildren}

    </Canvas>
  );
}

export default App;
