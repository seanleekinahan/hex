package rest

import . "gameserver"

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
