// A fact-checked starter pack of general + Canada/BC trivia questions.
// Each was verified before inclusion; three from the original draft were
// corrected (see notes) because the stated answer was wrong.
// timeLimitSec defaults to 12; image questions can be added in the editor later.

type PackQ = { text: string; options: string[]; correct: number; timeLimitSec: number };

export const STARTER_QUESTIONS: PackQ[] = [
  { text: "Which animal has three hearts?", options: ["Squid", "Dolphin", "Octopus", "Shark"], correct: 2, timeLimitSec: 12 },
  { text: "Which bird can fly backward?", options: ["Eagle", "Sparrow", "Hummingbird", "Penguin"], correct: 2, timeLimitSec: 12 },
  { text: "Which food never spoils?", options: ["Maple syrup", "Honey", "Peanut butter", "Salt"], correct: 1, timeLimitSec: 12 },
  { text: "Which beverage is consumed the most worldwide after water?", options: ["Coffee", "Tea", "Orange juice", "Milk"], correct: 1, timeLimitSec: 12 },
  { text: "Which of these is NOT actually a nut?", options: ["Almond", "Cashew", "Peanut", "Pistachio"], correct: 2, timeLimitSec: 12 },
  { text: "What is the most common blood type worldwide?", options: ["A+", "B+", "AB+", "O+"], correct: 3, timeLimitSec: 12 },
  { text: "Which country has the most time zones?", options: ["Russia", "United States", "France", "Australia"], correct: 2, timeLimitSec: 12 },
  { text: "Which colour is NOT one of the Olympic rings?", options: ["Green", "Black", "Orange", "Yellow"], correct: 2, timeLimitSec: 12 },
  { text: "Which of these is the fastest land animal?", options: ["Lion", "Cheetah", "Pronghorn", "Greyhound"], correct: 1, timeLimitSec: 12 },
  { text: "Which continent has the most countries?", options: ["Asia", "Europe", "Africa", "South America"], correct: 2, timeLimitSec: 12 },
  // CORRECTED: "Land of 10,000 Lakes" is Minnesota (a US state), not a Canadian province.
  // Manitoba is nicknamed "Land of 100,000 Lakes" — reworded to match the real answer.
  { text: "Which Canadian province is nicknamed the \"Land of 100,000 Lakes\"?", options: ["Manitoba", "Ontario", "Saskatchewan", "Alberta"], correct: 0, timeLimitSec: 12 },
  { text: "What is Canada's longest river?", options: ["Yukon River", "Fraser River", "Mackenzie River", "St. Lawrence River"], correct: 2, timeLimitSec: 12 },
  { text: "Which Canadian city is nicknamed \"The Six\"?", options: ["Vancouver", "Montreal", "Toronto", "Ottawa"], correct: 2, timeLimitSec: 12 },
  { text: "Which Canadian province has the most people?", options: ["British Columbia", "Alberta", "Ontario", "Quebec"], correct: 2, timeLimitSec: 12 },
  { text: "What is British Columbia's official provincial bird?", options: ["Bald Eagle", "Great Blue Heron", "Steller's Jay", "Snowy Owl"], correct: 2, timeLimitSec: 12 },
  // CORRECTED: BC's highest point is Mount Fairweather (4,671 m, on the Alaska border).
  // Mount Robson is only the 3rd-highest and is the highest in the Canadian Rockies, not all of BC.
  { text: "What is the highest mountain in British Columbia?", options: ["Mount Fairweather", "Black Tusk", "Golden Ears", "Mount Robson"], correct: 0, timeLimitSec: 12 },
  { text: "Which animal causes the most injuries in Canada each year?", options: ["Bears", "Wolves", "Moose", "Cougars"], correct: 2, timeLimitSec: 12 },
  { text: "Which bird appears on the Canadian one-dollar coin (the \"loonie\")?", options: ["Eagle", "Loon", "Goose", "Puffin"], correct: 1, timeLimitSec: 12 },
  { text: "Which of these is an actual phobia?", options: ["Mondayphobia", "WiFiphobia", "Hippopotomonstrosesquippedaliophobia (fear of long words)", "PayingTaxesphobia"], correct: 2, timeLimitSec: 15 },
  { text: "Which country consumes the most chocolate per person?", options: ["Belgium", "Switzerland", "Germany", "Willy Wonka's Factory"], correct: 1, timeLimitSec: 12 },
];

// Build a quiz object (id assigned by the caller/store).
export function starterQuiz() {
  return { id: "q_starter_" + Math.random().toString(36).slice(2, 7), title: "Trivia Starter Pack", questions: STARTER_QUESTIONS.map((q) => ({ ...q })) };
}
