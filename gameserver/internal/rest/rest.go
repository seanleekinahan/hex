package rest

import (
	"encoding/json"
	"fmt"
	. "gameserver"
	"gameserver/internal/navigator"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
	"strconv"
)

type API struct {
	cache  FetchGameData
	engine gin.Engine
}

func NewAPI(e gin.Engine) (*API, error) {

	a := &API{}

	mapData, err := loadMapStore()
	if err != nil {
		log.Fatal("failed to loadMapStore", err)
		return nil, err
	}

	err = defaultPlayerStart(mapData.Tiles["5"], mapData.Tiles["27"])
	if err != nil {
		log.Fatal("failed to generate default player information")
		return nil, err
	}

	e.GET("api/gamestate/:LastState", a.GetGameState)
	e.POST("api/gamestate", PostGameState)

	a.cache = *mapData

	a.engine = e
	return a, nil
}

func (a *API) GetGameState(c *gin.Context) {

	lastState := c.Param("LastState")
	if lastState == strconv.Itoa(int(a.cache.StateID)) {
		c.Status(http.StatusNoContent)
	}

	out := OutboundGameData{
		StateID: a.cache.StateID,
	}

	playerData, err := loadUserStore()
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to loadStore")
		return
	}

	searchMap := navigator.NewSearchMap(a.cache.Tiles)
	tileMap := make(map[string]*Tile)
	for _, unit := range playerData.Units {
		if tileMap[unit.ParentID] == nil {
			parentTile := a.cache.Tiles[unit.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, unit)
			tileMap[unit.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		} else {
			tileMap[unit.ParentID].OnTile = append(tileMap[unit.ParentID].OnTile, unit)
		}

		found := searchMap.BreadthFirstAsSearch(unit.ParentID, unit.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := a.cache.Tiles[f]
				tileMap[f] = &foundTile
				out.Tiles = append(out.Tiles, &foundTile)
			}
		}
	}

	for _, structure := range playerData.Structures {
		if tileMap[structure.ParentID] == nil {
			parentTile := a.cache.Tiles[structure.ParentID]
			parentTile.OnTile = append(parentTile.OnTile, structure)
			tileMap[structure.ParentID] = &parentTile
			out.Tiles = append(out.Tiles, &parentTile)
		} else {
			tileMap[structure.ParentID].OnTile = append(tileMap[structure.ParentID].OnTile, structure)
		}

		found := searchMap.BreadthFirstAsSearch(structure.ParentID, structure.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := a.cache.Tiles[f]
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
		ID:           "s1",
		ParentID:     loc1.ID,
		Type:         "structure",
		VisionRadius: 2,
	}

	unit := TileChild{
		RenderPosition: []float32{
			loc2.RenderPosition[0],
			2.6,
			loc2.RenderPosition[2]},
		ID:           "u1",
		ParentID:     loc2.ID,
		Type:         "unit",
		VisionRadius: 5,
	}

	data.Structures[structure.ID] = &structure
	data.Units[unit.ID] = &unit

	return writeUserStore(data)
}
