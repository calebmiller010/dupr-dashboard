# DUPR Match History API Schema Specification

## Overview

This data represents a **paginated response from the DUPR (Dynamic Universal Pickleball Rating) API** containing match history for a specific user. DUPR is a rating system for pickleball that tracks player performance across matches.

### Primary Entities
1. **APIResponse** — Root wrapper with status and paginated results
2. **Match** — A completed pickleball match with metadata, teams, and scoring
3. **Team** — A team within a match (1-2 players depending on singles/doubles)
4. **Player** — An individual player with DUPR ID and ratings
5. **ScoreFormat** — Configuration defining match scoring rules
6. **RatingImpact** — Pre-match ratings and calculated rating changes

### Structure Summary
```
APIResponse
└── result (PaginatedResult)
    └── hits[] (Match[])
        ├── scoreFormat (ScoreFormat)
        └── teams[] (Team[2])
            ├── player1 (Player)
            ├── player2 (Player) — nullable for singles
            └── preMatchRatingAndImpact (RatingImpact)
```

---

## Entity Definitions

### APIResponse
Root response wrapper from the DUPR API.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `status` | string | ✅ Yes | Enum: `SUCCESS`, likely `ERROR` | API call result status |
| `result` | PaginatedResult | ✅ Yes | Object | Container for paginated match data |

---

### PaginatedResult
Pagination wrapper containing match records.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `offset` | integer | ✅ Yes | ≥ 0 | Starting index for pagination |
| `limit` | integer | ✅ Yes | Observed: 10 | Max records per page |
| `total` | integer | ✅ Yes | ≥ 0 | Total matching records available |
| `hits` | Match[] | ✅ Yes | Array | Array of match records |
| `totalValueRelation` | string \| null | ✅ Yes | Always null in sample | Elasticsearch-style relation indicator |
| `empty` | boolean | ✅ Yes | — | True if hits array is empty |
| `hasPrevious` | boolean | ✅ Yes | — | True if previous page exists (offset > 0) |
| `hasMore` | boolean | ✅ Yes | — | True if more pages exist |

**Pagination Logic:**
- `hasPrevious` = `offset > 0`
- `hasMore` = `offset + limit < total`

---

### Match
A single pickleball match record with full details.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `id` | integer | ✅ Yes | 10-digit, e.g., `7082724973` | Primary unique match identifier |
| `matchId` | integer | ✅ Yes | Same as `id` | Duplicate of id (legacy/compatibility) |
| `userId` | integer | ✅ Yes | 10-digit | ID of user whose history this appears in |
| `displayIdentity` | string | ✅ Yes | 9 chars, alphanumeric, e.g., `V7P70EEOP` | Human-readable match reference code |
| `venue` | string | ✅ Yes | Can be empty `""` | Physical venue name |
| `location` | string | ✅ Yes | Can be empty `""` | Location/address details |
| `matchScoreAdded` | boolean | ✅ Yes | — | Whether scores have been recorded |
| `tournament` | string | ✅ Yes | Can be empty `""` | Tournament name if part of tournament |
| `league` | string | ✅ Yes | — | League/event name with bracket info |
| `eventDate` | string | ✅ Yes | ISO 8601 date: `YYYY-MM-DD` | Date match was played |
| `eventFormat` | string | ✅ Yes | Enum: `DOUBLES`, `SINGLES` | Match format type |
| `scoreFormat` | ScoreFormat | ✅ Yes | Object | Scoring configuration |
| `confirmed` | boolean | ✅ Yes | — | Whether match is confirmed by all parties |
| `teams` | Team[] | ✅ Yes | Exactly 2 elements | The two competing teams |
| `created` | string | ✅ Yes | ISO 8601 datetime with Z: `YYYY-MM-DDTHH:mm:ss.SSSSSSZ` | Record creation timestamp |
| `modified` | string | ✅ Yes | ISO 8601 datetime with Z | Last modification timestamp |
| `eventName` | string | ✅ Yes | — | Event name (often same as league) |
| `matchSource` | string | ✅ Yes | Enum: `CLUB`, `TOURNAMENT`, `REC` | Source/context of the match |
| `clubId` | integer | ✅ Yes | 10-digit | ID of organizing club |
| `noOfGames` | integer | ✅ Yes | 1, 3, or 5 typically | Number of games in match |
| `status` | string | ✅ Yes | Enum: `ACTIVE`, `DELETED`, `PENDING` | Match record status |
| `matchType` | string | ✅ Yes | Enum: `SIDE_ONLY`, `RALLY` | Scoring type |
| `eloCalculated` | boolean | ✅ Yes | — | Whether ratings have been calculated |
| `initialization` | boolean | ✅ Yes | — | Whether this is an initialization match |
| `clubName` | string | ✅ Yes | — | Name of organizing club |

**Relationships:**
- `userId` references the Player whose match history is being queried
- `clubId` references an external Club entity
- `teams[].player1.id` and `teams[].player2.id` reference Player entities

---

### ScoreFormat
Defines the scoring rules for a match.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `id` | integer | ✅ Yes | 10-digit | Score format configuration ID |
| `format` | string | ✅ Yes | Human-readable, e.g., `"1 Game to 11"` | Display description of format |
| `games` | integer | ✅ Yes | 1, 2, 3, or 5 | Number of games in match |
| `winningScore` | integer | ✅ Yes | Typically 11, 15, or 21 | Points needed to win a game |

---

### Team
A team participating in a match (one side).

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `id` | integer | ✅ Yes | 10-digit | Unique team-in-match identifier |
| `serial` | integer | ✅ Yes | Enum: `1`, `2` | Team position (1=first listed, 2=second) |
| `player1` | Player | ✅ Yes | Object | First/primary player |
| `player2` | Player | ⚠️ Conditional | Object \| null | Second player (null for singles) |
| `game1` | integer | ✅ Yes | 0-21+, or `-1` if not played | Score in game 1 |
| `game2` | integer | ✅ Yes | 0-21+, or `-1` if not played | Score in game 2 |
| `game3` | integer | ✅ Yes | 0-21+, or `-1` if not played | Score in game 3 |
| `game4` | integer | ✅ Yes | 0-21+, or `-1` if not played | Score in game 4 |
| `game5` | integer | ✅ Yes | 0-21+, or `-1` if not played | Score in game 5 |
| `winner` | boolean | ✅ Yes | — | True if this team won the match |
| `delta` | string | ✅ Yes | Empty `""` or numeric string | Rating change display (often empty) |
| `teamRating` | string | ✅ Yes | Empty `""` or numeric string | Combined team rating (often empty) |
| `preMatchRatingAndImpact` | RatingImpact | ✅ Yes | Object | Detailed rating data |

**Score Interpretation:**
- `-1` = Game was not played (match ended before this game)
- `0-21+` = Actual score for that game
- Winner determined by best-of-N games or single game result

---

### Player
An individual pickleball player.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `id` | integer | ✅ Yes | 10-digit | Unique DUPR player ID |
| `fullName` | string | ✅ Yes | Non-empty | Player's display name |
| `duprId` | string | ✅ Yes | 6 chars, uppercase alphanumeric, e.g., `QJKRDD` | Public DUPR identifier |
| `imageUrl` | string \| null | ✅ Yes | S3 URL or null | Profile image URL |
| `allowSubstitution` | boolean | ✅ Yes | — | Whether player allows substitution |
| `postMatchRating` | PostMatchRating | ✅ Yes | Object | Ratings after this match |
| `validatedMatch` | boolean | ✅ Yes | — | Whether player validated the match |

**Image URL Pattern:**
- Format: `https://dupr.s3.us-east-1.amazonaws.com/images/{uuid-or-filename}.jpg`
- Can be null if no image uploaded

---

### PostMatchRating
Player's ratings after match calculation.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `singles` | float \| null | ✅ Yes | 2.000-8.000, 3 decimals, or null | Singles rating after match |
| `doubles` | float \| null | ✅ Yes | 2.000-8.000, 3 decimals, or null | Doubles rating after match |

**Rating Scale:**
- DUPR ratings range from approximately 2.0 (beginner) to 8.0 (professional)
- Null indicates insufficient matches for a rating in that category

---

### RatingImpact (preMatchRatingAndImpact)
Detailed pre-match ratings and calculated rating impact for both players on a team.

| Field | Type | Required | Format/Constraints | Description |
|-------|------|----------|-------------------|-------------|
| `preMatchSingleRatingPlayer1` | float \| null | ✅ Yes | 2.0-8.0 or null | Player 1's singles rating before match |
| `matchSingleRatingImpactPlayer1` | float \| null | ✅ Yes | Typically -0.5 to +0.5, or null | Singles rating change for player 1 |
| `preMatchDoubleRatingPlayer1` | float | ✅ Yes | 2.0-8.0, 5 decimals | Player 1's doubles rating before match |
| `matchDoubleRatingImpactPlayer1` | float | ✅ Yes | Typically -0.2 to +0.2 | Doubles rating change for player 1 |
| `preMatchSingleRatingPlayer2` | float \| null | ✅ Yes | 2.0-8.0 or null | Player 2's singles rating before match |
| `matchSingleRatingImpactPlayer2` | float \| null | ✅ Yes | Typically -0.5 to +0.5, or null | Singles rating change for player 2 |
| `preMatchDoubleRatingPlayer2` | float | ✅ Yes | 2.0-8.0, 5 decimals | Player 2's doubles rating before match |
| `matchDoubleRatingImpactPlayer2` | float | ✅ Yes | Typically -0.2 to +0.2 | Doubles rating change for player 2 |

**Rating Math:**
- `postMatchRating = preMatchRating + matchRatingImpact`
- Positive impact = rating increase (favorable result)
- Negative impact = rating decrease (unfavorable result)

---

## Enumerations

| Field Path | Values |
|------------|--------|
| `status` | `SUCCESS` \| `ERROR` (inferred) |
| `result.hits[].eventFormat` | `DOUBLES` \| `SINGLES` |
| `result.hits[].matchSource` | `CLUB` \| `TOURNAMENT` \| `REC` (recreational) |
| `result.hits[].status` | `ACTIVE` \| `DELETED` \| `PENDING` (inferred) |
| `result.hits[].matchType` | `SIDE_ONLY` \| `RALLY` |
| `result.hits[].teams[].serial` | `1` \| `2` |

---

## JSON Schema (Draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://dupr.com/schemas/match-history-response.json",
  "title": "DUPR Match History API Response",
  "type": "object",
  "required": ["status", "result"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["SUCCESS", "ERROR"]
    },
    "result": {
      "$ref": "#/definitions/PaginatedResult"
    }
  },
  "definitions": {
    "PaginatedResult": {
      "type": "object",
      "required": ["offset", "limit", "total", "hits", "totalValueRelation", "empty", "hasPrevious", "hasMore"],
      "properties": {
        "offset": { "type": "integer", "minimum": 0 },
        "limit": { "type": "integer", "minimum": 1 },
        "total": { "type": "integer", "minimum": 0 },
        "hits": {
          "type": "array",
          "items": { "$ref": "#/definitions/Match" }
        },
        "totalValueRelation": { "type": ["string", "null"] },
        "empty": { "type": "boolean" },
        "hasPrevious": { "type": "boolean" },
        "hasMore": { "type": "boolean" }
      }
    },
    "Match": {
      "type": "object",
      "required": [
        "id", "matchId", "userId", "displayIdentity", "venue", "location",
        "matchScoreAdded", "tournament", "league", "eventDate", "eventFormat",
        "scoreFormat", "confirmed", "teams", "created", "modified", "eventName",
        "matchSource", "clubId", "noOfGames", "status", "matchType",
        "eloCalculated", "initialization", "clubName"
      ],
      "properties": {
        "id": { "type": "integer" },
        "matchId": { "type": "integer" },
        "userId": { "type": "integer" },
        "displayIdentity": {
          "type": "string",
          "pattern": "^[A-Z0-9]{9}$"
        },
        "venue": { "type": "string" },
        "location": { "type": "string" },
        "matchScoreAdded": { "type": "boolean" },
        "tournament": { "type": "string" },
        "league": { "type": "string" },
        "eventDate": {
          "type": "string",
          "format": "date"
        },
        "eventFormat": {
          "type": "string",
          "enum": ["DOUBLES", "SINGLES"]
        },
        "scoreFormat": { "$ref": "#/definitions/ScoreFormat" },
        "confirmed": { "type": "boolean" },
        "teams": {
          "type": "array",
          "items": { "$ref": "#/definitions/Team" },
          "minItems": 2,
          "maxItems": 2
        },
        "created": {
          "type": "string",
          "format": "date-time"
        },
        "modified": {
          "type": "string",
          "format": "date-time"
        },
        "eventName": { "type": "string" },
        "matchSource": {
          "type": "string",
          "enum": ["CLUB", "TOURNAMENT", "REC"]
        },
        "clubId": { "type": "integer" },
        "noOfGames": {
          "type": "integer",
          "enum": [1, 2, 3, 5]
        },
        "status": {
          "type": "string",
          "enum": ["ACTIVE", "DELETED", "PENDING"]
        },
        "matchType": {
          "type": "string",
          "enum": ["SIDE_ONLY", "RALLY"]
        },
        "eloCalculated": { "type": "boolean" },
        "initialization": { "type": "boolean" },
        "clubName": { "type": "string" }
      }
    },
    "ScoreFormat": {
      "type": "object",
      "required": ["id", "format", "games", "winningScore"],
      "properties": {
        "id": { "type": "integer" },
        "format": { "type": "string" },
        "games": {
          "type": "integer",
          "enum": [1, 2, 3, 5]
        },
        "winningScore": {
          "type": "integer",
          "enum": [11, 15, 21]
        }
      }
    },
    "Team": {
      "type": "object",
      "required": [
        "id", "serial", "player1", "game1", "game2", "game3", "game4", "game5",
        "winner", "delta", "teamRating", "preMatchRatingAndImpact"
      ],
      "properties": {
        "id": { "type": "integer" },
        "serial": {
          "type": "integer",
          "enum": [1, 2]
        },
        "player1": { "$ref": "#/definitions/Player" },
        "player2": {
          "oneOf": [
            { "$ref": "#/definitions/Player" },
            { "type": "null" }
          ]
        },
        "game1": { "type": "integer", "minimum": -1 },
        "game2": { "type": "integer", "minimum": -1 },
        "game3": { "type": "integer", "minimum": -1 },
        "game4": { "type": "integer", "minimum": -1 },
        "game5": { "type": "integer", "minimum": -1 },
        "winner": { "type": "boolean" },
        "delta": { "type": "string" },
        "teamRating": { "type": "string" },
        "preMatchRatingAndImpact": { "$ref": "#/definitions/RatingImpact" }
      }
    },
    "Player": {
      "type": "object",
      "required": [
        "id", "fullName", "duprId", "imageUrl", "allowSubstitution",
        "postMatchRating", "validatedMatch"
      ],
      "properties": {
        "id": { "type": "integer" },
        "fullName": { "type": "string", "minLength": 1 },
        "duprId": {
          "type": "string",
          "pattern": "^[A-Z0-9]{6}$"
        },
        "imageUrl": {
          "type": ["string", "null"],
          "format": "uri"
        },
        "allowSubstitution": { "type": "boolean" },
        "postMatchRating": { "$ref": "#/definitions/PostMatchRating" },
        "validatedMatch": { "type": "boolean" }
      }
    },
    "PostMatchRating": {
      "type": "object",
      "required": ["singles", "doubles"],
      "properties": {
        "singles": {
          "type": ["number", "null"],
          "minimum": 2.0,
          "maximum": 8.0
        },
        "doubles": {
          "type": ["number", "null"],
          "minimum": 2.0,
          "maximum": 8.0
        }
      }
    },
    "RatingImpact": {
      "type": "object",
      "required": [
        "preMatchSingleRatingPlayer1", "matchSingleRatingImpactPlayer1",
        "preMatchDoubleRatingPlayer1", "matchDoubleRatingImpactPlayer1",
        "preMatchSingleRatingPlayer2", "matchSingleRatingImpactPlayer2",
        "preMatchDoubleRatingPlayer2", "matchDoubleRatingImpactPlayer2"
      ],
      "properties": {
        "preMatchSingleRatingPlayer1": { "type": ["number", "null"] },
        "matchSingleRatingImpactPlayer1": { "type": ["number", "null"] },
        "preMatchDoubleRatingPlayer1": { "type": "number" },
        "matchDoubleRatingImpactPlayer1": { "type": "number" },
        "preMatchSingleRatingPlayer2": { "type": ["number", "null"] },
        "matchSingleRatingImpactPlayer2": { "type": ["number", "null"] },
        "preMatchDoubleRatingPlayer2": { "type": "number" },
        "matchDoubleRatingImpactPlayer2": { "type": "number" }
      }
    }
  }
}
```

---

## TypeScript Interfaces

```typescript
// ============ API Response Types ============

interface DUPRMatchHistoryResponse {
  status: "SUCCESS" | "ERROR";
  result: PaginatedResult<Match>;
}

interface PaginatedResult<T> {
  offset: number;
  limit: number;
  total: number;
  hits: T[];
  totalValueRelation: string | null;
  empty: boolean;
  hasPrevious: boolean;
  hasMore: boolean;
}

// ============ Core Entities ============

interface Match {
  id: number;
  matchId: number; // Duplicate of id
  userId: number;
  displayIdentity: string; // Pattern: /^[A-Z0-9]{9}$/
  
  // Location info (often empty)
  venue: string;
  location: string;
  
  // Event metadata
  tournament: string;
  league: string;
  eventDate: string; // ISO 8601 date: YYYY-MM-DD
  eventName: string;
  eventFormat: EventFormat;
  scoreFormat: ScoreFormat;
  
  // Match details
  teams: [Team, Team]; // Always exactly 2 teams
  noOfGames: 1 | 2 | 3 | 5;
  matchType: MatchType;
  matchSource: MatchSource;
  
  // Status flags
  confirmed: boolean;
  matchScoreAdded: boolean;
  eloCalculated: boolean;
  initialization: boolean;
  status: MatchStatus;
  
  // Club association
  clubId: number;
  clubName: string;
  
  // Timestamps
  created: string; // ISO 8601 datetime
  modified: string; // ISO 8601 datetime
}

interface ScoreFormat {
  id: number;
  format: string; // e.g., "1 Game to 11"
  games: number;
  winningScore: number; // 11, 15, or 21
}

interface Team {
  id: number;
  serial: 1 | 2;
  
  // Players
  player1: Player;
  player2: Player | null; // null for singles
  
  // Game scores (-1 = not played)
  game1: number;
  game2: number;
  game3: number;
  game4: number;
  game5: number;
  
  // Result
  winner: boolean;
  
  // Rating display (often empty strings)
  delta: string;
  teamRating: string;
  
  // Detailed rating data
  preMatchRatingAndImpact: RatingImpact;
}

interface Player {
  id: number;
  fullName: string;
  duprId: string; // Pattern: /^[A-Z0-9]{6}$/
  imageUrl: string | null; // S3 URL or null
  allowSubstitution: boolean;
  postMatchRating: PostMatchRating;
  validatedMatch: boolean;
}

interface PostMatchRating {
  singles: number | null; // 2.0 - 8.0 scale
  doubles: number | null; // 2.0 - 8.0 scale
}

interface RatingImpact {
  // Player 1 ratings
  preMatchSingleRatingPlayer1: number | null;
  matchSingleRatingImpactPlayer1: number | null;
  preMatchDoubleRatingPlayer1: number;
  matchDoubleRatingImpactPlayer1: number;
  
  // Player 2 ratings
  preMatchSingleRatingPlayer2: number | null;
  matchSingleRatingImpactPlayer2: number | null;
  preMatchDoubleRatingPlayer2: number;
  matchDoubleRatingImpactPlayer2: number;
}

// ============ Enumerations ============

type EventFormat = "DOUBLES" | "SINGLES";
type MatchSource = "CLUB" | "TOURNAMENT" | "REC";
type MatchStatus = "ACTIVE" | "DELETED" | "PENDING";
type MatchType = "SIDE_ONLY" | "RALLY";

// ============ Utility Types ============

/** Extract player IDs from a match */
type MatchPlayerIds = number[];

/** Game score or -1 if not played */
type GameScore = number;

/** DUPR rating value (2.0 - 8.0) */
type DUPRRating = number | null;
```

---

## Usage Notes for Implementing Applications

### Key Access Patterns

1. **Paginated Fetching**
   ```typescript
   // Fetch next page
   const nextOffset = result.offset + result.limit;
   if (result.hasMore) {
     fetchMatches({ offset: nextOffset, limit: result.limit });
   }
   ```

2. **Find User's Team in a Match**
   ```typescript
   function findUserTeam(match: Match, userId: number): Team | undefined {
     return match.teams.find(team => 
       team.player1.id === userId || team.player2?.id === userId
     );
   }
   ```

3. **Calculate Win/Loss Record**
   ```typescript
   function getRecord(matches: Match[], userId: number): { wins: number; losses: number } {
     return matches.reduce((acc, match) => {
       const userTeam = findUserTeam(match, userId);
       if (userTeam?.winner) acc.wins++;
       else acc.losses++;
       return acc;
     }, { wins: 0, losses: 0 });
   }
   ```

4. **Extract Active Game Scores**
   ```typescript
   function getGameScores(team: Team): number[] {
     return [team.game1, team.game2, team.game3, team.game4, team.game5]
       .filter(score => score !== -1);
   }
   ```

### Recommended Indexing / Query Patterns

| Query Pattern | Index Fields |
|--------------|--------------|
| User match history | `userId`, `eventDate DESC` |
| Matches by club | `clubId`, `eventDate DESC` |
| Player lookup | `teams.player1.duprId`, `teams.player2.duprId` |
| Match by display code | `displayIdentity` (unique) |
| Active matches only | `status = 'ACTIVE'` |

### Edge Cases to Handle

1. **Null Player2 in Singles**
   ```typescript
   // Always check for singles format
   if (match.eventFormat === "SINGLES") {
     // team.player2 will be null
   }
   ```

2. **Unrated Players**
   ```typescript
   // postMatchRating.singles/doubles can be null
   const rating = player.postMatchRating.doubles ?? "Unrated";
   ```

3. **Games Not Played**
   ```typescript
   // -1 indicates game was not played (match ended early)
   if (team.game2 === -1) {
     // Match ended after game 1
   }
   ```

4. **Empty Strings for Optional Text**
   ```typescript
   // venue, location, tournament, delta, teamRating can be empty strings
   const venueName = match.venue || "No venue specified";
   ```

5. **Rating Impact Direction**
   ```typescript
   // Positive = rating went up, negative = went down
   const improved = ratingImpact.matchDoubleRatingImpactPlayer1 > 0;
   ```

### Validation Rules to Enforce

1. **Team Invariants**
   - Exactly 2 teams per match
   - Exactly one team has `winner: true`
   - `serial` values must be 1 and 2

2. **Score Invariants**
   - Winner's highest game score ≥ `scoreFormat.winningScore`
   - At least `game1` must have valid scores (not -1)
   - Games played sequentially (no game3 if game2 is -1)

3. **Rating Invariants**
   - All ratings in range 2.0 - 8.0 when not null
   - `postMatchRating ≈ preMatchRating + ratingImpact`

4. **ID Patterns**
   - `duprId`: exactly 6 uppercase alphanumeric characters
   - `displayIdentity`: exactly 9 uppercase alphanumeric characters

### Mock Data Generation Tips

```typescript
function generateMockMatch(): Match {
  const team1Wins = Math.random() > 0.5;
  const winnerScore = 11;
  const loserScore = Math.floor(Math.random() * 10);
  
  return {
    id: Math.floor(Math.random() * 9000000000) + 1000000000,
    // ... other fields
    teams: [
      {
        serial: 1,
        winner: team1Wins,
        game1: team1Wins ? winnerScore : loserScore,
        game2: -1,
        // ...
      },
      {
        serial: 2,
        winner: !team1Wins,
        game1: !team1Wins ? winnerScore : loserScore,
        game2: -1,
        // ...
      }
    ]
  };
}
```

---

## Data Anomalies & Notes

1. **Redundant Fields**: `id` and `matchId` are identical in all samples
2. **Event Name Duplication**: `league` and `eventName` appear identical
3. **Future Dates**: Sample contains dates in 2026 (likely test/demo data)
4. **High Precision Ratings**: Rating impacts have ~15 decimal places (floating point artifacts)
5. **Empty String Convention**: Empty strings used instead of null for optional text fields
