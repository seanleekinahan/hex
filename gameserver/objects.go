package gameserver

type Tile struct {
	Position     []float32    `json:"pos"`
	CubePosition []float32    `json:"cpos"`
	ID           string       `json:"uid"`
	Type         string       `json:"type"`
	OnTile       []*TileChild `json:"onTile"`
}

type TileChild struct {
	Position     []float32 `json:"pos"`
	ID           string    `json:"uid"`
	ParentID     string    `json:"pid"`
	Type         string    `json:"type"`
	VisionRadius int32     `json:"visionRadius"`
}
