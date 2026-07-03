import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") name = "";
  @type("boolean") connected = true;
  @type("number") score = 0;
  @type("boolean") answered = false;   // answered the current question
  @type("number") lastDelta = 0;       // points won on the last reveal
  @type("boolean") lastCorrect = false;
  @type("number") correctCount = 0;
  @type("number") sumCorrectMs = 0;    // total ms spent on correct answers (for the speed tiebreak)
  @type("number") wrongCount = 0;
  @type("number") streak = 0;
  @type("number") bestStreak = 0;
  @type("boolean") isHost = false;     // joined with the host key; can control the game
  @type("boolean") bot = false;        // a simulated player
}

export class TriviaState extends Schema {
  @type("string") code = "";
  @type("string") phase = "lobby";     // lobby | question | locked | reveal | results
  @type("string") quizTitle = "";
  @type("number") qIndex = 0;          // 0-based
  @type("number") qTotal = 0;
  @type("number") qSeq = 0;            // bumps each question so clients reset timers
  @type("string") qText = "";
  @type(["string"]) qOptions = new ArraySchema<string>();
  @type("number") revealIndex = -1;    // correct option, only set during reveal
  @type("number") timeLimitSec = 20;
  @type("number") answeredCount = 0;   // how many players have locked in
  @type("boolean") simulating = false; // the room is auto-playing with bots
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
