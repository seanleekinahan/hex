package main

import (
	"gameserver/internal/cache"
	"gameserver/internal/manipulator"
	"gameserver/internal/rest"
	"github.com/gin-gonic/gin"
	"log"
)

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

	c, err := cache.NewCache()
	if err != nil {
		log.Fatal("failed to initiate cache")
	}

	m := manipulator.NewManipulator(c)

	_, err = rest.NewAPI(e, c, &m)
	if err != nil {
		log.Fatal("failed to run rest api")
	}

	err = e.Run()
	if err != nil {
		log.Fatal("failed to run gin engine")
	}
}
