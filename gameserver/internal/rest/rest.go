package rest

import (
	"encoding/json"
	"fmt"
	. "gameserver"
	"gameserver/internal/cache"
	"gameserver/internal/manipulator"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"strconv"
)

type API struct {
	cache       *cache.Cache
	engine      *gin.Engine
	manipulator *manipulator.Manipulator
}

func NewAPI(e *gin.Engine, c *cache.Cache, m *manipulator.Manipulator) (*API, error) {

	a := &API{
		cache:       c,
		manipulator: m,
	}

	e.GET("api/gamestate/:LastState", a.GetGameState)
	e.POST("api/gamestate", a.PostGameState)

	a.cache = c
	a.engine = e
	return a, nil
}

//func BetterUnmarshalJSON(b []byte) error {
//
//	var f interface{}
//	err := json.Unmarshal(b, &f)
//	if err != nil {
//		return errors.New("failed to do a thing")
//	}
//
//	type tempGameData struct {
//
//	}
//
//	type tempContainer struct {
//		gameData interface{}
//	}
//
//	m := f.(map[string]interface{})
//
//	foomap := m["foo"]
//	v := foomap.(map[string]interface{})
//
//	a.FooBar = v["bar"].(string)
//	a.FooBaz = v["baz"].(string)
//	a.More = m["more"].(string)
//
//	return nil
//}

func (a API) GetGameState(c *gin.Context) {

	lastState := c.Param("LastState")
	if lastState == strconv.Itoa(int(a.cache.StateID)) {
		c.Status(http.StatusNoContent)
		return
	}

	out, err := a.cache.GetGameState("user")
	if err != nil {
		c.Status(http.StatusInternalServerError)
	}

	c.JSON(http.StatusOK, out)
}

func (a API) PostGameState(c *gin.Context) {
	type ReceiveGameData struct {
		StateID int32  `json:"stateID"`
		Tiles   string `json:"tiles"`
	}

	type Receive struct {
		ReceiveGameData `json:"gameData"`
	}

	type ReceiveTiles struct {
		RenderPosition []float32 `json:"pos"`
		ID             string    `json:"uid"`
		Type           string    `json:"type"`
		Neighbours     string    `json:"neighbours"`
		CubePosition   []float32 `json:"cpos"`
	}

	var data Receive
	err := c.BindJSON(&data)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, "failed to BindJSON")
		return
	}

	var receiveTileMap map[string]*ReceiveTiles
	err = json.Unmarshal([]byte(data.Tiles), &receiveTileMap)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, "failed to Unmarshal")
		return
	}

	tileMap := make(map[string]*Tile)
	for _, r := range receiveTileMap {
		tile := Tile{
			RenderPosition: r.RenderPosition,
			ID:             r.ID,
			Type:           r.Type,
			CubePosition:   r.CubePosition,
			Neighbours:     make(map[string]*Tile),
			OnTile:         make(map[string]*TileChild),
		}

		err = json.Unmarshal([]byte(r.Neighbours), &tile.Neighbours)
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusInternalServerError, "failed to Unmarshal neighbours")
			return
		}

		tileMap[tile.ID] = &tile
	}

	err = a.cache.StoreGameState(tileMap)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, "failed to StoreGameState")
		return
	}

	fmt.Println("Received New Map State: ")
	fmt.Println("State ID: ", a.cache.StateID)
	fmt.Println("Stored ", len(tileMap), " tiles.")

	c.Status(http.StatusCreated)
}
