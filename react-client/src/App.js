import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import './App.css';
import Hex from './components/hex'
import Lights from './components/lights'
import { useEffect, useState } from 'react';

function App() {

  const [gameData, setGameData] = useState({});
  const [tiles, setTiles] = useState([]);


  //dummy - replace with api call
  useEffect(() => {
    let data = {}
    data.tiles = [
      { 
        pos: [0,0,0],
        name: 1,
        colour: '#b9f542'
      },
      { 
        pos: [0,0,2],
        name: 2,
        colour: '#b14400'
      }
    ]

    setGameData(data)
  }, [])

  useEffect(() => {
    if(gameData.tiles){

      let hexes = []
      for(let tile of gameData.tiles) {
        hexes.push(
          < Hex 
            position={[tile.pos[0], tile.pos[1], tile.pos[2]]}
            key={tile.name}
            colour={tile.colour}            />
        )
      }
  
      setTiles(hexes)
    }
  }, [gameData]) 



  return (
    <Canvas>
      < Lights />
      < PerspectiveCamera makeDefault position={[0,0,10]}/>
      
      {tiles}
      <OrbitControls/>
    </Canvas>
  );
}

export default App;
