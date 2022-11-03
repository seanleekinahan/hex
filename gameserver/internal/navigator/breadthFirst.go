package navigator

import (
	"container/heap"
	"fmt"
	. "gameserver"
	. "gameserver/internal/queuer"
	"math"
)

type SearchTile struct {
	TileID       string
	CubePosition []float32
	Neighbours   map[string]*Tile
	Type         string
}

type SearchMap struct { //Stores Tile information by TileID
	Tiles map[string]*SearchTile
}

func NewSearchMap(tileMap map[string]*Tile) SearchMap {

	s := SearchMap{Tiles: make(map[string]*SearchTile)}

	for _, tile := range tileMap {
		t := &SearchTile{
			TileID:       tile.ID,
			CubePosition: tile.CubePosition,
			Neighbours:   tile.Neighbours,
			Type:         tile.Type,
		}

		s.Tiles[t.TileID] = t
	}

	return s
}

func (m *SearchMap) BreadthFirstAsSearch(origin string, radius int32, searchTerm string) []string { // BreadthFirstAsSearch

	oT := m.Tiles[origin]
	//fmt.Println("BreadthFirst Search Starting At: ", oT.CubePosition, " with radius of ", radius)
	//Frontier queue - priority functionality ignored
	frontier := make(PriorityQueue, 0)
	heap.Init(&frontier)
	tile := &Item{
		Value:    origin,
		Priority: 0,
	}
	heap.Push(&frontier, tile)

	reachedTiles := make(map[string]bool)
	reachedTiles[origin] = true

	var found []string

	for frontier.Len() > 0 {

		current := heap.Pop(&frontier).(*Item)
		neighbours := m.Tiles[current.Value].Neighbours

		for _, nb := range neighbours {
			if nb.ID == "null" {
				//fmt.Println("Neighbour is out of bounds.")
				continue
			}

			if reachedTiles[nb.ID] {
				//fmt.Println("Neighbour already visited: ", nb)
				continue
			}

			t := m.Tiles[nb.ID]
			if GetCubeDistance(oT.CubePosition, t.CubePosition) > float32(radius) {
				//fmt.Println("Neighbour is out of reach: ", nb)
				continue
			}

			//handle actual searching later
			if t.Type == searchTerm || t.Type == "impassable" || t.Type == "forest" {

			}
			found = append(found, t.TileID)

			reachedTiles[nb.ID] = true
			tile = &Item{
				Value:    nb.ID,
				Priority: 0,
			}
			heap.Push(&frontier, tile)

		}

		if frontier.Len() == 0 {
			//fmt.Println("BreadthFirstSearch finished!")
			break
		}

	}

	//fmt.Println("Found ", found, " IDs!")
	return found
}

func GetCubeDistance(pointA []float32, pointB []float32) float32 {
	q := math.Abs(float64(pointA[0] - pointB[0]))
	r := math.Abs(float64(pointA[1] - pointB[1]))
	s := math.Abs(float64(pointA[2] - pointB[2]))

	return float32((q + r + s) / 2)
}

func CoordToString(coord []float32) string {
	q := fmt.Sprintf("%f", coord[0])
	r := fmt.Sprintf("%f", coord[1])
	s := fmt.Sprintf("%f", coord[2])

	return q + r + s
}

func GetViableNeighbours(tileMap map[string]Tile, origin Tile) []*Tile {

	directions := [][]float32{
		{0, -1, 1}, //Top
		{1, -1, 0}, //Top Right
		{1, 0, -1}, //Bottom Right
		{0, 1, -1}, //Bottom
		{-1, 1, 0}, //Bottom Left
		{-1, 0, 1}, //Top Left
	}

	var tiles []*Tile
	pos := origin.CubePosition
	for _, dir := range directions {
		tile := tileMap[CoordToString([]float32{pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2]})]
		tiles = append(tiles, &tile)
	}

	return tiles
}

func BreadthFirstPathfinding() {

}

//TODO: Required functionality
//Get TileMap from central point by radius.
//Find specific tile or tilechild types inside TileMap
//Path by waypoints
