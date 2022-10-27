package main

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/rpc"
)

type Cache struct {
	Data map[string]*string
}

type InputObject struct {
	Key   string `js:"key"`
	Value string `js:"value"`
}

type OutputObject struct {
	Success bool    `js:"success"`
	Value   *string `js:"value"`
}

func NewCache() Cache {
	return Cache{make(map[string]*string)}
}

func (c *Cache) Set(input *InputObject, output *OutputObject) error {
	c.Data[input.Key] = &input.Value
	output.Success = true
	return nil
}

func (c *Cache) Get(object *InputObject, output *OutputObject) error {
	v := c.Data[object.Key]

	if v == nil {
		output.Success = false
	}

	output.Success = true
	output.Value = v
	return nil
}

func main() {
	buf := &bytes.Buffer{}
	g := gob.NewEncoder(buf)

	cache := NewCache()
	err := g.Encode(cache)
	if err != nil {
		log.Fatal("failed to e.Encode: ", err)
	}

	err = rpc.Register(&cache)
	if err != nil {
		log.Fatal("failed to rpc.Register: ", err)
	}

	rpc.HandleHTTP()
	l, e := net.Listen("tcp", ":1234")
	if e != nil {
		log.Fatal("listen error:", e)
	}

	fmt.Println("Serving HTTP/tcp on port 1234")
	err = http.Serve(l, nil)
	if err != nil {
		log.Fatal("Serve error:", e)
	}

}
