package main

import (
	"container/heap"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"

	. "gameserver"
	. "gameserver/internal/queuer"
)

type OutboundGameData struct {
	StateID int32   `json:"stateID"`
	Tiles   []*Tile `json:"tiles"`
}

type FetchGameData struct {
	StateID int32           `json:"stateID"`
	Tiles   map[string]Tile `json:"tiles"`
}

type StoreGameData struct {
	StateID int32           `json:"stateID"`
	Tiles   map[string]Tile `json:"tiles"`
}

type Store struct {
	StoreGameData `json:"gameData"`
}

type Fetch struct {
	FetchGameData `json:"gameData"`
}

type PlayerData struct {
	UserID     string                `json:"userID"`
	Structures map[string]*TileChild `json:"structures"`
	Units      map[string]*TileChild `json:"units"`
	Resource   int32                 `json:"resource"`
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {

	err := defaultPlayerStart()
	if err != nil {
		log.Fatal("failed to generate default player information")
	}

	e := gin.New()
	e.Use(CORSMiddleware())

	e.GET("api/gamestate", GetGameState)
	e.POST("api/gamestate", PostGameState)

	go func() {
		// Some items and their priorities.
		items := map[string]int{
			"banana": 3, "apple": 2, "pear": 4,
		}

		// Create a priority queue, put the items in it, and
		// establish the priority queue (heap) invariants.
		pq := make(PriorityQueue, len(items))
		i := 0
		for value, priority := range items {
			pq[i] = &Item{
				Value:    value,
				Priority: priority,
				Index:    i,
			}
			i++
		}
		heap.Init(&pq)

		// Insert a new item and then modify its priority.
		item := &Item{
			Value:    "orange",
			Priority: 1,
		}
		item2 := &Item{
			Value:    "blorange",
			Priority: 19,
		}
		heap.Push(&pq, item)
		heap.Push(&pq, item2)
		pq.Update(item, item.Value, 5)

		// Take the items out; they arrive in decreasing priority order.
		for pq.Len() > 0 {
			item := heap.Pop(&pq).(*Item)
			fmt.Printf("%.2d:%s ", item.Priority, item.Value)
		}
	}()

	err = e.Run()
	if err != nil {
		log.Fatal("failed to run gin engine")
	}

}

func GetGameState(c *gin.Context) {
	mapData, err := loadMapStore()
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to loadStore")
		return
	}

	out := OutboundGameData{
		StateID: mapData.StateID,
	}

	playerData, err := loadUserStore()
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to loadStore")
		return
	}

	tileMap := make(map[string]*Tile)
	for _, unit := range playerData.Units {
		if tileMap[unit.ParentID] == nil {
			parentTile := mapData.Tiles[unit.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, unit)
			tileMap[unit.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		}
	}

	for _, structure := range playerData.Structures {
		if tileMap[structure.ParentID] == nil {
			parentTile := mapData.Tiles[structure.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, structure)
			tileMap[structure.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		}
	}

	c.JSON(http.StatusOK, out)
}

func PostGameState(c *gin.Context) {
	type ReceiveGameData struct {
		StateID int32  `json:"stateID"`
		Tiles   string `json:"tiles"`
	}

	type Receive struct {
		ReceiveGameData `json:"gameData"`
	}

	var data Receive
	err := c.BindJSON(&data)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, "failed to BindJSON")
		return
	}

	fmt.Println("Received New Map State: ")
	fmt.Println("State ID: ", data.StateID)

	var tileMap map[string]Tile
	err = json.Unmarshal([]byte(data.Tiles), &tileMap)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, "failed to Unmarshal")
		return
	}

	fmt.Println("Tiles: ", len(tileMap))

	var s Store
	s.StateID = data.ReceiveGameData.StateID
	s.Tiles = tileMap

	err = writeMapStore(s.StoreGameData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to writeStore")
		return
	}

	c.Status(http.StatusCreated)
}

func defaultPlayerStart() error {
	data := PlayerData{
		UserID:     "testUser",
		Structures: make(map[string]*TileChild),
		Units:      make(map[string]*TileChild),
		Resource:   69,
	}

	structure := TileChild{
		Position: []float32{
			-72,
			2.6,
			62.34},
		ID:           "1",
		ParentID:     "65",
		Type:         "structure",
		VisionRadius: 3,
	}

	unit := TileChild{
		Position: []float32{
			54,
			2.6,
			93.51},
		ID:           "1",
		ParentID:     "124",
		Type:         "unit",
		VisionRadius: 5,
	}

	data.Structures[structure.ID] = &structure
	data.Units[unit.ID] = &unit

	return writeUserStore(data)
}

func loadMapStore() (*FetchGameData, error) {

	j, err := os.ReadFile("map.store.json")
	if err != nil {
		return nil, err
	}

	data := Fetch{}
	err = json.Unmarshal(j, &data)
	if err != nil {
		return nil, err
	}

	return &data.FetchGameData, nil
}

func loadUserStore() (*PlayerData, error) {

	j, err := os.ReadFile("user.store.json")
	if err != nil {
		return nil, err
	}

	data := PlayerData{}
	err = json.Unmarshal(j, &data)
	if err != nil {
		return nil, err
	}

	return &data, nil
}

func writeMapStore(data StoreGameData) error {

	s := Store{data}

	file, err := json.MarshalIndent(s, "", " ")
	if err != nil {
		return err
	}

	err = os.WriteFile("map.store.json", file, 0644)
	if err != nil {
		return err
	}

	return nil
}

func writeUserStore(data PlayerData) error {

	file, err := json.MarshalIndent(data, "", " ")
	if err != nil {
		return err
	}

	err = os.WriteFile("user.store.json", file, 0644)
	if err != nil {
		return err
	}

	return nil
}
