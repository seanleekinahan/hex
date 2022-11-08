package rest

import (
	"encoding/json"
	"fmt"
	. "gameserver"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"os"
	"strconv"
)

type API struct {
	engine *gin.Engine
}

func NewAPI(e *gin.Engine) (*API, error) {

	a := &API{}

	e.GET("/api/code", a.SocketHandler)
	e.POST("api/code", a.PostGameState)

	a.engine = e
	return a, nil
}

