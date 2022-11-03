package manipulator

import (
	"errors"
	. "gameserver"
	"gameserver/internal/cache"
)

var (
	INTENT_MOVE    = "move"
	INTENT_HARVEST = "harvest"
	INTENT_DEPOSIT = "deposit"
	INTENT_SPAWN   = "deposit"

	TILE_PLAIN    = "plain"
	TILE_MOUNTAIN = "mountain"
	TILE_WATER    = "water"
	TILE_FOREST   = "forest"

	TYPE_TILE      = "t"
	TYPE_UNIT      = "u"
	TYPE_STRUCTURE = "s"
	TYPE_RESOURCE  = "r"
	TYPE_ITEM      = "i"

	ERR_MOVEIMPASSIBLE  = errors.New("target tile is impassible")
	ERR_MOVENOTVALID    = errors.New("target tile is not a valid neighbour")
	ERR_INVALIDINTENT   = errors.New("requested operation is invalid for actor")
	ERR_ACTORNOTPRESENT = errors.New("supplied actor is not on supplied parent tile")
	ERR_INVALIDTARGET   = errors.New("none found with target ID")
)

type Manipulator struct {
	cache *cache.Cache
}

type Intent struct {
	User         string
	IntentType   string
	Actor        string
	ActorParent  *string
	Target       string
	TargetParent *string
}

func NewManipulator(c *cache.Cache) Manipulator {
	return Manipulator{c}
}

func (m Manipulator) Router(intent Intent) error {
	if intent.IntentType == INTENT_MOVE {
		return m.MoveInDirection(intent)
	}

	return nil
}

func (m Manipulator) GetTileInformation(tileID string) *Tile {
	return m.cache.Data.Tiles[tileID]
}

func (m Manipulator) MoveInDirection(intent Intent) error {

	if intent.Actor[:1] != TYPE_UNIT {
		return ERR_INVALIDINTENT
	}

	if intent.Target[:1] != TILE_PLAIN {
		return ERR_MOVEIMPASSIBLE
	}

	currentTile := m.GetTileInformation(*intent.ActorParent)
	if currentTile.Neighbours[*intent.TargetParent] == nil {
		return ERR_MOVENOTVALID
	}

	targetTile := m.GetTileInformation(intent.Target)
	if targetTile == nil {
		return ERR_ACTORNOTPRESENT
	}

	cacheIntent := cache.UpdateIntent{
		Actor:        intent.Actor,
		ActorParent:  intent.ActorParent,
		Target:       intent.Target,
		TargetParent: intent.TargetParent,
	}

	m.cache.UpdateTileChildPosition(cacheIntent)
	return nil
}
