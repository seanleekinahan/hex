package main

import (
	"encoding/json"
	"fmt"
	"gameserver/internal/navigator"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"

	. "gameserver"
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

	mapData, err := loadMapStore()
	if err != nil {
		log.Fatal("failed to loadMapStore")
		return
	}

	err = defaultPlayerStart(mapData.Tiles["5"], mapData.Tiles["27"])
	if err != nil {
		log.Fatal("failed to generate default player information")
	}

	e := gin.New()
	e.Use(CORSMiddleware())

	e.GET("api/gamestate", GetGameState)
	e.POST("api/gamestate", PostGameState)

	go func() {

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

	searchMap := navigator.NewSearchMap(mapData.Tiles)
	tileMap := make(map[string]*Tile)
	for _, unit := range playerData.Units {
		fmt.Println("Finding Tiles Around Unit: ", unit.ID)
		if tileMap[unit.ParentID] == nil {
			parentTile := mapData.Tiles[unit.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, unit)
			tileMap[unit.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		} else {
			tileMap[unit.ParentID].OnTile = append(tileMap[unit.ParentID].OnTile, unit)
		}

		found := searchMap.BreadthFirstAsSearch(unit.ParentID, unit.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := mapData.Tiles[f]
				tileMap[f] = &foundTile
				out.Tiles = append(out.Tiles, &foundTile)
			}
		}
	}

	for _, structure := range playerData.Structures {
		fmt.Println("Finding Tiles Around Structure: ", structure.ID)
		if tileMap[structure.ParentID] == nil {
			parentTile := mapData.Tiles[structure.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, structure)
			tileMap[structure.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		} else {
			tileMap[structure.ParentID].OnTile = append(tileMap[structure.ParentID].OnTile, structure)
		}

		found := searchMap.BreadthFirstAsSearch(structure.ParentID, structure.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := mapData.Tiles[f]
				tileMap[f] = &foundTile
				out.Tiles = append(out.Tiles, &foundTile)
			}
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

func defaultPlayerStart(loc1 Tile, loc2 Tile) error {
	data := PlayerData{
		UserID:     "testUser",
		Structures: make(map[string]*TileChild),
		Units:      make(map[string]*TileChild),
		Resource:   69,
	}

	structure := TileChild{
		RenderPosition: []float32{
			loc1.RenderPosition[0],
			2.6,
			loc1.RenderPosition[2]},
		ID:           "1",
		ParentID:     loc1.ID,
		Type:         "structure",
		VisionRadius: 2,
	}

	unit := TileChild{
		RenderPosition: []float32{
			loc2.RenderPosition[0],
			2.6,
			loc2.RenderPosition[2]},
		ID:           "1",
		ParentID:     loc2.ID,
		Type:         "unit",
		VisionRadius: 1,
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
