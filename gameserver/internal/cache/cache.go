package cache

import (
	"encoding/json"
	"fmt"
	. "gameserver"
	"gameserver/internal/navigator"
	"log"
	"os"
)

type Cache struct {
	Data    FetchGameData
	StateID int32
}

func NewCache() (*Cache, error) {

	var c Cache

	mapData, err := loadMapStore()
	if err != nil {
		log.Fatal("failed to loadMapStore", err)
		return nil, err
	}
	fmt.Println("Loaded stored map data.")

	err = defaultPlayerStart(*mapData.Tiles["t-5"], *mapData.Tiles["t-27"])
	if err != nil {
		log.Fatal("failed to generate default player information")
		return nil, err
	}
	fmt.Println("Spoofed player data.")

	c.Data = *mapData
	c.StateID = 0

	return &c, nil
}

func (c *Cache) GetGameState(userID string) (*OutboundGameData, error) {
	out := OutboundGameData{
		StateID: c.StateID,
	}

	playerData, err := loadUserStore(userID)
	if err != nil {
		return nil, err
	}

	searchMap := navigator.NewSearchMap(c.Data.Tiles)
	tileMap := make(map[string]*Tile)
	for _, unit := range playerData.Units {

		if tileMap[unit.ParentID] == nil {
			parentTile := c.Data.Tiles[unit.ParentID]

			if parentTile.OnTile == nil {
				parentTile.OnTile = make(map[string]*TileChild)
			}
			parentTile.OnTile[unit.ID] = unit

			tileMap[unit.ParentID] = parentTile
			out.Tiles = append(out.Tiles, parentTile)
		} else {
			tileMap[unit.ParentID].OnTile[unit.ID] = unit
		}

		found := searchMap.BreadthFirstAsSearch(unit.ParentID, unit.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := c.Data.Tiles[f]
				tileMap[f] = foundTile
				out.Tiles = append(out.Tiles, foundTile)
			}
		}
	}

	for _, structure := range playerData.Structures {
		if tileMap[structure.ParentID] == nil {
			parentTile := c.Data.Tiles[structure.ParentID]
			if parentTile.OnTile == nil {
				parentTile.OnTile = make(map[string]*TileChild)
			}
			parentTile.OnTile[structure.ID] = structure
			tileMap[structure.ParentID] = parentTile
			out.Tiles = append(out.Tiles, parentTile)
		} else {
			tileMap[structure.ParentID].OnTile[structure.ID] = structure
		}

		found := searchMap.BreadthFirstAsSearch(structure.ParentID, structure.VisionRadius, "plain")
		for _, f := range found {
			if tileMap[f] == nil {
				foundTile := c.Data.Tiles[f]
				tileMap[f] = foundTile
				out.Tiles = append(out.Tiles, foundTile)
			}
		}
	}

	return &out, nil
}

func (c *Cache) StoreGameState(tiles map[string]*Tile) error {

	var s Store

	s.Tiles = tiles

	err := writeMapStore(s.StoreGameData)
	if err != nil {
		return err
	}

	c.Data.Tiles = s.Tiles
	c.StateID++

	return nil
}

func (c *Cache) UpdateTileChildPosition(intent UpdateIntent) {
	current := c.Data.Tiles[*intent.ActorParent]
	actor := current.OnTile[intent.Actor]
	delete(current.OnTile, intent.Actor)

	next := c.Data.Tiles[intent.Target]
	actor.ParentID = next.ID
	actor.RenderPosition = next.RenderPosition
	next.OnTile[intent.Actor] = actor
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

func loadUserStore(userID string) (*PlayerData, error) {

	userID = "user"
	j, err := os.ReadFile(userID + ".store.json")
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
		ID:           "s-1",
		ParentID:     loc1.ID,
		Type:         "structure",
		VisionRadius: 2,
	}

	unit := TileChild{
		RenderPosition: []float32{
			loc2.RenderPosition[0],
			2.6,
			loc2.RenderPosition[2]},
		ID:           "u-1",
		ParentID:     loc2.ID,
		Type:         "unit",
		VisionRadius: 40,
	}

	data.Structures[structure.ID] = &structure
	data.Units[unit.ID] = &unit

	return writeUserStore(data)
}
