/**
 * Wild West Name Generator for Bite the Bullet
 * Based on authentic Old West names with classic TV western nicknames
 */

const firstNames = {
  male: [
    'Amos', 'Barnaby', 'Caleb', 'Dalton', 'Ezra', 'Fletcher', 'Gideon', 'Hank', 'Isaac', 'Jebediah',
    'Knox', 'Levi', 'Moses', 'Nathaniel', 'Obadiah', 'Preston', 'Quincy', 'Rufus', 'Silas', 'Thaddeus',
    'Ulysses', 'Vernon', 'Walter', 'Xavier', 'Yancy', 'Zeke', 'Abraham', 'Buck', 'Clay', 'Dutch',
    'Elias', 'Frank', 'Garrett', 'Homer', 'Ira', 'Jake', 'Kit', 'Luke', 'Mack', 'Noah'
  ],
  female: [
    'Abigail', 'Beatrice', 'Clara', 'Dorothy', 'Esther', 'Florence', 'Grace', 'Hannah', 'Iris', 'Josephine',
    'Katherine', 'Louisa', 'Martha', 'Nancy', 'Ophelia', 'Prudence', 'Quinn', 'Rebecca', 'Sarah', 'Temperance',
    'Ursula', 'Victoria', 'Winifred', 'Ximena', 'Yolanda', 'Zelda', 'Adelaide', 'Belle', 'Constance', 'Della',
    'Emma', 'Fanny', 'Greta', 'Hattie', 'Ida', 'Jane', 'Kate', 'Lucy', 'Mae', 'Nora'
  ]
};

const lastNames = [
  'Anderson', 'Baker', 'Campbell', 'Davis', 'Edwards', 'Foster', 'Greene', 'Harrison', 'Jackson', 'Kennedy',
  'Lancaster', 'Morgan', 'Nelson', 'O\'Brien', 'Parker', 'Quinn', 'Reynolds', 'Stewart', 'Thompson', 'Underwood',
  'Vincent', 'Wilson', 'Young', 'Zimmerman', 'Abbott', 'Brooks', 'Carter', 'Duncan', 'Evans', 'Ford',
  'Gibson', 'Hayes', 'Irving', 'Johnson', 'King', 'Lewis', 'Mitchell', 'Norton', 'Oliver', 'Phillips',
  'Randolph', 'Sullivan', 'Turner', 'Vaughn', 'Walker', 'Xavier', 'York', 'Zane', 'Bennett', 'Crawford'
];

const nicknames = {
  male: [
    'Dead-Eye', 'Dusty', 'Iron Mike', 'Lightning', 'Sidewinder', 'Bronco', 'Cactus Jack', 'Dynamite',
    'Eagle Eye', 'Fast Draw', 'Gunpowder', 'Hurricane', 'Idaho', 'Jackhammer', 'Kid', 'Lawman',
    'Maverick', 'Night Rider', 'Outlaw', 'Peacekeeper', 'Quick Silver', 'Rattlesnake', 'Sagebrush',
    'Thunderbolt', 'Undertaker', 'Vigilante', 'Whiskey', 'X-Mark', 'Yellowstone', 'Zorro',
    'Black Hat', 'Copper', 'Deadwood', 'El Diablo', 'Firebrand', 'Ghost Rider', 'High Noon',
    'Iron Horse', 'Jigger', 'Killer', 'Lone Wolf', 'Mustang', 'Nevada', 'One-Shot'
  ],
  female: [
    'Angel', 'Belle', 'Calamity', 'Desert Rose', 'Empress', 'Foxy', 'Golden', 'Hurricane',
    'Iron Lady', 'Jewel', 'Kit', 'Lady Luck', 'Moonbeam', 'Nevada', 'Opal', 'Prairie Rose',
    'Queen', 'Ruby', 'Starlight', 'Tempest', 'Untamed', 'Velvet', 'Wildcat', 'Xena',
    'Yucca', 'Zephyr', 'Apache', 'Bandit Queen', 'Cheyenne', 'Diamond Lil', 'Ember',
    'Frontier', 'Goldie', 'Honey', 'Indian Summer', 'Jade', 'Kentucky', 'Lightning Lil',
    'Midnight', 'Nightshade', 'Outlaw Queen', 'Pistol', 'Quick Draw', 'Raven'
  ]
};

/**
 * Generate a random Wild West name
 * @param {string} gender - 'male', 'female', or 'random' (default)
 * @returns {Object} Generated name with firstName, lastName, nickname, gender, and fullName
 */
export function generateWildWestName(gender = 'random') {
  // Determine gender
  const selectedGender = gender === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;
  
  // Select random names
  const firstName = firstNames[selectedGender][Math.floor(Math.random() * firstNames[selectedGender].length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const nickname = nicknames[selectedGender][Math.floor(Math.random() * nicknames[selectedGender].length)];
  
  // Create full name variations
  const fullName = `${firstName} "${nickname}" ${lastName}`;
  const shortName = `${firstName} ${lastName}`;
  
  return {
    firstName,
    lastName,
    nickname,
    gender: selectedGender,
    fullName,
    shortName
  };
}

/**
 * Generate multiple names at once
 * @param {number} count - Number of names to generate
 * @param {string} gender - 'male', 'female', or 'random'
 * @returns {Array} Array of generated names
 */
export function generateMultipleNames(count = 5, gender = 'random') {
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(generateWildWestName(gender));
  }
  return names;
}

/**
 * Get a random element from an array
 * @param {Array} array - Array to select from
 * @returns {*} Random element
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get all available first names for a gender
 * @param {string} gender - 'male' or 'female'
 * @returns {Array} Array of first names
 */
export function getFirstNames(gender) {
  return firstNames[gender] || [];
}

/**
 * Get all available last names
 * @returns {Array} Array of last names
 */
export function getLastNames() {
  return lastNames;
}

/**
 * Get all available nicknames for a gender
 * @param {string} gender - 'male' or 'female'
 * @returns {Array} Array of nicknames
 */
export function getNicknames(gender) {
  return nicknames[gender] || [];
}
