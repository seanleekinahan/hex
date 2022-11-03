package gameserver

type Tile struct {
	RenderPosition []float32             `json:"pos"`
	ID             string                `json:"uid"`
	Type           string                `json:"type"`
	OnTile         map[string]*TileChild `json:"onTile"`

	Neighbours   map[string]*Tile `json:"neighbours"`
	CubePosition []float32        `json:"cpos"`
}

type TileChild struct {
	Owner          string    `json:"owner"`
	RenderPosition []float32 `json:"pos"`
	ID             string    `json:"uid"`
	ParentID       string    `json:"pid"`
	Type           string    `json:"type"`
	VisionRadius   int32     `json:"visionRadius"`
}
