import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import './App.css';
import Hex from './components/hex'
import Lights from './components/lights'
import Camera from './components/camera';
import { useEffect, useState } from 'react';

import GetGamestate from './api/gamestate';
import GetStateUpdates from './api/updatestate';

function App() {

  const [gameData, setGameData] = useState({});
  const [tiles, setTiles] = useState([]);
  const [updateData, setUpdateData] = useState({});

  const MINUTE_MS = 60000;
  const SECOND_MS = 1000;

  //Load Full State on Client Load
  useEffect(() => {
      console.log("Setting Game State!")
      GetGamestate(setGameData)
  }, [])

  //Populate Meshes
  useEffect(() => {
    if(gameData.tiles){

      let hexes = []
      for(let tile of gameData.tiles) {
        hexes.push(
          < Hex 
            position={[tile.pos[0], tile.pos[1], tile.pos[2]]}
            key={tile.hexid}
            hexid={tile.hexid}
            type={tile.type}            />
        )
      }
  
      setTiles(hexes)
    }
  }, [gameData]) 


  return (
    <Canvas>
      < Lights />
      < Camera />
      
      {tiles}

    </Canvas>
  );
}

export default App;
