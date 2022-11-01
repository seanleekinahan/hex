package navigator

import (
	"container/heap"
	"fmt"
	. "gameserver"
	. "gameserver/internal/queuer"
	"math"
)

// BreadthFirstAsSearch
// The tileMap uses stringified cubic co-ordinates as keys
func BreadthFirstAsSearch(tileMap map[string]Tile, origin Tile, radius int32, searchTerm string) []*Tile {

	//Frontier queue - priority functionality ignored
	frontier := make(PriorityQueue, 0)
	heap.Init(&frontier)
	tile := &Item{
		Value:    origin.ID,
		Priority: 0,
	}
	heap.Push(&frontier, tile)

	reachedTiles := make(map[string]bool)
	reachedTiles[origin.ID] = true

	var found []*Tile

	for frontier.Len() > 0 {

		current := heap.Pop(&frontier).(*Item)
		neighbours := GetViableNeighbours(tileMap, current.Value)

		for _, nb := range neighbours {
			if reachedTiles[nb.ID] {
				fmt.Println("Neighbour already visited: ", nb.ID)
				continue
			}

			t := tileMap[nb.ID]
			if GetCubeDistance(origin.CubePosition, t.CubePosition) > float32(radius) {
				fmt.Println("Neighbour is out of reach: ", nb.ID)
				continue
			}

			if nb.Type == searchTerm {
				found = append(found, nb)
			}

			reachedTiles[nb.ID] = true
			tile = &Item{
				Value:    nb.ID,
				Priority: 0,
			}
			heap.Push(&frontier, tile)

		}

		if frontier.Len() == 0 {
			fmt.Println("BreadthFirstSearch finished!")
			break
		}

	}

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
