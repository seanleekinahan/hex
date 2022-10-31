package main

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
)

type Tile struct {
	Position []float32 `json:"pos"`
	ID       int32     `json:"hexid"`
	Type     string    `json:"type"`
}

type gameData struct {
	Tiles []*Tile `json:"tiles"`
}

type store struct {
	gameData `json:"gameData"`
}

func loadStore() (*gameData, error) {

	j, err := os.ReadFile("store.json")
	if err != nil {
		return nil, err
	}

	data := store{}
	err = json.Unmarshal(j, &data)
	if err != nil {
		return nil, err
	}

	return &data.gameData, nil
}

func writeStore(data gameData) error {

	s := store{data}

	file, err := json.MarshalIndent(s, "", " ")
	if err != nil {
		return err
	}

	err = os.WriteFile("store.json", file, 0644)
	if err != nil {
		return err
	}

	return nil
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

	e := gin.New()
	e.Use(CORSMiddleware())

	e.GET("api/gamestate", GetGameState)
	e.POST("api/gamestate", PostGameState)

	err := e.Run()
	if err != nil {
		log.Fatal("failed to run gin engine")
	}

}

func GetGameState(c *gin.Context) {
	data, err := loadStore()
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to loadStore")
		return
	}

	c.JSON(http.StatusOK, data)
}

func PostGameState(c *gin.Context) {
	var data store
	err := c.BindJSON(&data)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, "failed to BindJSON")
		return
	}

	fmt.Println(c.GetRawData())

	err = writeStore(data.gameData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, "failed to writeStore")
		return
	}

	c.Status(http.StatusCreated)
}
