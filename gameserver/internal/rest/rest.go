package rest

import (
	"encoding/json"
	"fmt"
	. "gameserver"
	"gameserver/internal/cache"
	"gameserver/internal/manipulator"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

	e.GET("/api/websocket", a.SocketHandler)
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

func (a API) SocketHandler(c *gin.Context) {

	fmt.Println("Received request to open WS")

	u := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := u.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("Failed to set websocket upgrade:", err)
		return
	}

	fmt.Println("WS Connected on: ", conn.LocalAddr())

	for {
		t, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Websocket ReadMessage error:", err)
			return
		}

		receive := struct {
			StateID int32 `json:"stateID"`
		}{}

		err = json.Unmarshal(msg, &receive)
		if err != nil {
			fmt.Println("failed to unmarshal ws message")
		}

		fmt.Println("Got message with state ID: ", receive.StateID)
		if receive.StateID == a.cache.StateID {
			out := struct {
				StateID int32 `json:"stateID"`
			}{
				StateID: -1,
			}

			j, err := json.Marshal(out)
			if err != nil {
				log.Println("failed to Marshal ws reply")
			}

			err = conn.WriteMessage(t, j)
			if err != nil {
				fmt.Println("Websocket WriteMessage error:", err)
				return
			}
		} else {
			out, err := a.cache.GetGameState("user")
			if err != nil {
				log.Println("failed to GetGameState for ws user")
			}

			j, err := json.Marshal(out)
			if err != nil {
				log.Println("failed to Marshal ws reply")
			}

			err = conn.WriteMessage(t, j)
			if err != nil {
				fmt.Println("Websocket WriteMessage error:", err)
				return
			}
		}

	}
}

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
