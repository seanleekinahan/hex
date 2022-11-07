package manipulator

import (
	"errors"
	"fmt"
	. "gameserver"
	"gameserver/internal/cache"
	"sort"
)

var (
	INTENT_MOVE    = "move"
	INTENT_HARVEST = "harvest"
	INTENT_DEPOSIT = "deposit"
	INTENT_SPAWN   = "deposit"
	INTENT_CRAFT   = "craft"

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

	ExpectedUserSet map[string]*int //int value describes how performant the user script was
	NewUsers        map[string]*int

	QueuedIntents map[string]*map[string]*Intent //map[userID]*[actorID]*Intent

}

type Intent struct {
	User         string  `json:"user"`
	IntentType   string  `json:"type"`
	Actor        string  `json:"actor"`
	ActorParent  *string `json:"actorParent"`
	Target       string  `json:"target"`
	TargetParent *string `json:"targetParent"`
	TicksLeft    *int
}

func NewManipulator(c *cache.Cache) Manipulator {
	return Manipulator{cache: c}
}

func (m Manipulator) ReceiveUserIntents(intentMap map[string]*Intent, userID string) {
	userIntents := *m.QueuedIntents[userID]
	if userIntents == nil {
		m.QueuedIntents[userID] = &intentMap
	} else {
		for actorKey, actorValue := range intentMap {
			if userIntents[actorKey] == nil {
				userIntents[actorKey] = actorValue
			}
		}
	}

	if len(m.QueuedIntents) == len(m.ExpectedUserSet) {

	}
}

func (m Manipulator) HandleFailedUserScript(userID string) {
	delete(m.ExpectedUserSet, userID)
}

func (m Manipulator) HandleNewUserScript(userID string, weight int) {
	m.ExpectedUserSet[userID] = &weight
}

func (m Manipulator) SortExistingUsersByWeight() []string {

	users := m.ExpectedUserSet
	keys := make([]string, 0, len(users))

	for key := range users {
		keys = append(keys, key)
	}

	sort.SliceStable(keys, func(i, j int) bool {
		return *users[keys[i]] < *users[keys[j]]
	})

	return keys
}

func (m Manipulator) ExecuteIntents() {

	users := m.SortExistingUsersByWeight()
	for _, user := range users {

		actorIntents := m.QueuedIntents[user]
		for _, intent := range *actorIntents {
			err := m.Router(*intent)
			if err != nil {
				fmt.Println("Error executing intent: ", err)
			}
		}

	}

	for key, value := range m.NewUsers {
		m.ExpectedUserSet[key] = value
	}

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
