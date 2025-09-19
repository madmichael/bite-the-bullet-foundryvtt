
## Appendix: NPC JSON Schema for Roll20 Import (parity with Foundry)

Use a simple array of NPC definitions. Suggested schema aligns with the Foundry importer so content can be shared across platforms.

```json
[
  {
    "name": "Bear",
    "attributes": { "vigor": 16, "presence": 6, "faith": 3, "sand": 12 },
    "attacks": [ { "name": "Claw", "damage": "1d6" }, { "name": "Bite", "damage": "1d8" } ],
    "armor": { "physical": 0, "social": 0, "faith": 0 },
    "notes": "",
    "tags": ["beast"]
  }
]
```

- Attributes: maps to sheet attributes for NPC row / section.
- Attacks: each becomes a repeating attack row with damage/traits.
- Armor mapping:
  - physical → armor value
  - social → social armor value
  - faith → optional faith-armor toggle or bonus for supernatural defense
- Notes/Tags: stored as description text and tag chips (optional).

# Bite the Bullet Roll20 Character Sheet Development Plan

## Status Update (v1.0.4)

The FoundryVTT system gained several GM utilities and UX enhancements we also want mirrored (where applicable) in the Roll20 sheet to maintain parity and improve workflows.

- One-click table rolls (Foundry): Buttons in the Character Generator to roll Background/Reputation/Fortitude/Foible/Issue/Armor/Weapons/Gear directly to chat. For Roll20, we will provide equivalent buttons wired to in-sheet tables/roll templates.
- Tables compendium seeding update (Foundry): System now updates existing RollTable entries on world load (GM-only), ensuring table text stays in sync. Roll20 plan remains to host tables in-sheet, but we’ll keep the data single-sourced in this plan.
- Clone Tables to World (Foundry): GM utility to clone tables from compendium into the World. Not applicable to Roll20, but the concept informs in-sheet regeneration controls.
- NPCs compendium (Foundry): Added `Bite the Bullet — NPCs` pack.
- Import NPCs tool (Foundry): Paste/file-upload JSON to bulk create NPC Actors in compendium or World; supports armor mapping (physical/social/faith) and attack items.
- Clone NPCs to World (Foundry): GM utility mirrors the tables cloner for NPCs.

Implication for Roll20 parity: We will add an NPC data import section to the Roll20 sheet (GM-only or via API script for Pro) to quickly seed common NPCs and standardize formatting (see NPC schema below).

## Project Overview

**Goal**: Create a Roll20 character sheet that maintains all the functionality, automation, and user experience we achieved in FoundryVTT, adapted to Roll20's architecture.

Based on our successful FoundryVTT implementation, this plan replicates the complete "Bite the Bullet" system for Roll20, including all core mechanics, automation, and enhanced features.

## Roll20 Architecture Analysis

### Key Differences from FoundryVTT:
- **Single HTML file** with embedded CSS/JavaScript
- **Sheet Workers** for automation (vs. FoundryVTT's module system)
- **Roll Templates** for chat output (vs. ChatMessage.create)
- **Repeating Sections** for inventory (vs. Item documents)
- **API Scripts** for advanced features (Pro tier only)

### Roll20 Advantages:
- **No Installation Required**: Works in any browser
- **Cross-Platform**: Mobile, tablet, desktop support
- **Free Tier Compatible**: Core features work without Pro subscription
- **Built-in VTT**: Maps, tokens, and character sheet in one platform

## Core Features to Implement

### 1. Character Sheet Structure
```html
<!-- Roll20 Attribute Structure -->
<input name="attr_vigor" type="number" value="10" />
<input name="attr_presence" type="number" value="10" />
<input name="attr_faith" type="number" value="10" />
<input name="attr_sand" type="number" value="7" />
<input name="attr_lead" type="number" value="4" />
```

**Components:**
- **Attributes**: Vigor, Presence, Faith (3d6 each), Sand (2d6)
- **Resources**: Load, Reserve, Money
- **Characteristics**: 6 characteristics with rank/uses tracking
- **Gear Tracking**: Lead, weapons, armor, gear, burdens
- **Ammunition System**: Current/max shots with reload mechanics

### 2. Repeating Sections for Inventory
```html
<!-- Weapons with ammunition tracking -->
<fieldset class="repeating_weapons">
  <input name="attr_weapon_name" type="text" />
  <input name="attr_weapon_damage" type="text" value="1d6" />
  <input name="attr_weapon_range" type="text" />
  <input name="attr_weapon_shots" type="number" />
  <input name="attr_weapon_current_shots" type="number" />
  <button type="roll" name="roll_weapon_attack" value="&{template:damage} {{character_name=@{character_name}}} {{weapon_name=@{weapon_name}}} {{damage=[[1d6]]}} {{current_shots=@{weapon_current_shots}}} {{max_shots=@{weapon_shots}}}">Attack</button>
  <button type="action" name="act_weapon_reload">Reload</button>
</fieldset>
```

### 3. Sheet Workers for Automation
```javascript
// Auto-decrement ammunition on weapon use
on('clicked:repeating_weapons:weapon_attack', function(eventInfo) {
  const rowId = eventInfo.sourceAttribute.split('_')[2];
  getAttrs([`repeating_weapons_${rowId}_weapon_current_shots`], function(values) {
    const currentShots = parseInt(values[`repeating_weapons_${rowId}_weapon_current_shots`]) || 0;
    if (currentShots > 0) {
      setAttrs({
        [`repeating_weapons_${rowId}_weapon_current_shots`]: currentShots - 1
      });
    }
  });
});

// Reload mechanics with Lead consumption
on('clicked:repeating_weapons:weapon_reload', function(eventInfo) {
  const rowId = eventInfo.sourceAttribute.split('_')[2];
  getAttrs(['lead', `repeating_weapons_${rowId}_weapon_shots`, `repeating_weapons_${rowId}_weapon_current_shots`], function(values) {
    const lead = parseInt(values.lead) || 0;
    const maxShots = parseInt(values[`repeating_weapons_${rowId}_weapon_shots`]) || 0;
    const currentShots = parseInt(values[`repeating_weapons_${rowId}_weapon_current_shots`]) || 0;
    
    if (lead > 0 && currentShots < maxShots) {
      setAttrs({
        'lead': lead - 1,
        [`repeating_weapons_${rowId}_weapon_current_shots`]: maxShots
      });
    }
  });
});

// Tap system automation
on('clicked:tap_characteristic', function(eventInfo) {
  const characteristic = eventInfo.sourceAttribute.replace('clicked:', '').replace('_tap', '');
  getAttrs([`${characteristic}_rank`, `${characteristic}_uses`], function(values) {
    const rank = parseInt(values[`${characteristic}_rank`]) || 0;
    const uses = parseInt(values[`${characteristic}_uses`]) || 0;
    
    setAttrs({
      [`${characteristic}_uses`]: uses + 1,
      [`${characteristic}_bonus`]: rank
    });
  });
});
```

## Character Generator Implementation

### 1. One-Click Complete Generation
```html
<div class="character-generator">
    <h3>🤠 Bite the Bullet Character Generator</h3>
    
    <button type="action" name="act_generate_character" class="btn-generate-all">
        🎲 Generate Complete Character
    </button>
    
    <div class="generator-options">
        <button type="action" name="act_generate_attributes">🎲 Roll Attributes</button>
        <button type="action" name="act_generate_characteristics">📜 Roll Characteristics</button>
        <button type="action" name="act_generate_equipment">⚔️ Generate Equipment</button>
        <button type="action" name="act_generate_name">🤠 Generate Name</button>
    </div>
    
    <div class="name-generator">
        <h4>Wild West Name Options</h4>
        <button type="action" name="act_generate_male_name">Male Names</button>
        <button type="action" name="act_generate_female_name">Female Names</button>
        <button type="action" name="act_generate_random_name">Random Gender</button>
        
        <div class="name-suggestions">
            <input name="attr_name_suggestion_1" type="text" readonly placeholder="Generated name option 1" />
            <input name="attr_name_suggestion_2" type="text" readonly placeholder="Generated name option 2" />
            <input name="attr_name_suggestion_3" type="text" readonly placeholder="Generated name option 3" />
        </div>
    </div>
</div>
```

### 2. Generation Logic
```javascript
// Complete character generation
on('clicked:generate_character', function() {
    // Roll all attributes (3d6 each, 2d6 for Sand)
    const vigor = rollDice(3, 6);
    const presence = rollDice(3, 6);
    const faith = rollDice(3, 6);
    const sand = rollDice(2, 6);
    
    // Generate characteristics from tables
    const characteristics = generateAllCharacteristics();
    
    // Generate equipment based on background
    const equipment = generateEquipmentForBackground(characteristics.background);
    
    // Generate Wild West name
    const name = generateWildWestName();
    
    // Update all sheet attributes at once
    setAttrs({
        'vigor': vigor,
        'presence': presence,
        'faith': faith,
        'sand': sand,
        'character_name': name.fullName,
        ...characteristics,
        ...equipment
    });
});

// Wild West name generation
const nameData = {
    firstNames: {
        male: ["Amos", "Barnaby", "Caleb", "Dalton", "Ezra", "Fletcher", "Gideon", "Hank", "Isaac", "Jebediah", "Knox", "Levi", "Moses", "Nathaniel", "Obadiah", "Preston", "Quincy", "Rufus", "Silas", "Thaddeus", "Ulysses", "Vernon", "Walter", "Xavier", "Yancy", "Zeke", "Abraham", "Buck", "Clay", "Dutch", "Elias", "Frank", "Garrett", "Homer", "Ira", "Jake", "Kit", "Luke", "Mack", "Noah"],
        female: ["Abigail", "Beatrice", "Clara", "Dorothy", "Esther", "Florence", "Grace", "Hannah", "Iris", "Josephine", "Katherine", "Louisa", "Martha", "Nancy", "Ophelia", "Prudence", "Quinn", "Rebecca", "Sarah", "Temperance", "Ursula", "Victoria", "Winifred", "Ximena", "Yolanda", "Zelda", "Adelaide", "Belle", "Constance", "Della", "Emma", "Fanny", "Greta", "Hattie", "Ida", "Jane", "Kate", "Lucy", "Mae", "Nora"]
    },
    lastNames: ["Anderson", "Baker", "Campbell", "Davis", "Edwards", "Foster", "Greene", "Harrison", "Jackson", "Kennedy", "Lancaster", "Morgan", "Nelson", "O'Brien", "Parker", "Quinn", "Reynolds", "Stewart", "Thompson", "Underwood", "Vincent", "Wilson", "Young", "Zimmerman", "Abbott", "Brooks", "Carter", "Duncan", "Evans", "Ford", "Gibson", "Hayes", "Irving", "Johnson", "King", "Lewis", "Mitchell", "Norton", "Oliver", "Phillips", "Randolph", "Sullivan", "Turner", "Vaughn", "Walker", "Xavier", "York", "Zane", "Bennett", "Crawford"],
    nicknames: {
        male: ["Dead-Eye", "Dusty", "Iron Mike", "Lightning", "Sidewinder", "Bronco", "Cactus Jack", "Dynamite", "Eagle Eye", "Fast Draw", "Gunpowder", "Hurricane", "Idaho", "Jackhammer", "Kid", "Lawman", "Maverick", "Night Rider", "Outlaw", "Peacekeeper", "Quick Silver", "Rattlesnake", "Sagebrush", "Thunderbolt", "Undertaker", "Vigilante", "Whiskey", "X-Mark", "Yellowstone", "Zorro", "Black Hat", "Copper", "Deadwood", "El Diablo", "Firebrand", "Ghost Rider", "High Noon", "Iron Horse", "Jigger", "Killer", "Lone Wolf", "Mustang", "Nevada", "One-Shot"],
        female: ["Angel", "Belle", "Calamity", "Desert Rose", "Empress", "Foxy", "Golden", "Hurricane", "Iron Lady", "Jewel", "Kit", "Lady Luck", "Moonbeam", "Nevada", "Opal", "Prairie Rose", "Queen", "Ruby", "Starlight", "Tempest", "Untamed", "Velvet", "Wildcat", "Xena", "Yucca", "Zephyr", "Apache", "Bandit Queen", "Cheyenne", "Diamond Lil", "Ember", "Frontier", "Goldie", "Honey", "Indian Summer", "Jade", "Kentucky", "Lightning Lil", "Midnight", "Nightshade", "Outlaw Queen", "Pistol", "Quick Draw", "Raven"]
    }
};

function generateWildWestName(gender = 'random') {
    const selectedGender = gender === 'random' ? 
        (Math.random() > 0.5 ? 'male' : 'female') : gender;
    
    const firstName = getRandomFromArray(nameData.firstNames[selectedGender]);
    const lastName = getRandomFromArray(nameData.lastNames);
    const nickname = getRandomFromArray(nameData.nicknames[selectedGender]);
    
    return {
        firstName,
        lastName,
        nickname,
        fullName: `${firstName} "${nickname}" ${lastName}`,
        gender: selectedGender
    };
}
```

### 3. Characteristic Generation Tables
```javascript
const characteristicTables = {
    background: [
        "Drifter", "Homesteader", "Outlaw", "Lawman", "Merchant", 
        "Preacher", "Doctor", "Gambler", "Prospector", "Rancher",
        "Gunslinger", "Saloon Owner", "Bounty Hunter", "Railroad Worker",
        "Cattle Rustler", "Town Mayor", "Blacksmith", "Newspaper Editor"
    ],
    bond: [
        "Family Honor", "Lost Love", "Childhood Friend", "Mentor's Legacy",
        "Sacred Oath", "Blood Debt", "Shared Secret", "Common Enemy",
        "Sibling Rivalry", "War Buddy", "Business Partner", "Adopted Family"
    ],
    foible: [
        "Quick Temper", "Gambling Addiction", "Cowardice", "Arrogance",
        "Superstitious", "Alcoholism", "Vanity", "Greed", "Paranoia",
        "Compulsive Liar", "Jealousy", "Stubbornness"
    ],
    fortitude: [
        "Iron Will", "Endurance", "Pain Tolerance", "Mental Toughness",
        "Survival Instinct", "Determination", "Resilience", "Grit",
        "Stoicism", "Perseverance", "Courage", "Steadfastness"
    ],
    issue: [
        "Wanted by Law", "Family Feud", "Cursed", "Haunted Past",
        "Debt to Pay", "Secret Identity", "Terminal Illness", "Addiction",
        "Lost Memory", "Prophecy", "Rival Gang", "Broken Promise"
    ],
    reputation: [
        "Fast Draw", "Honest Dealer", "Silver Tongue", "Dead Shot",
        "Lucky", "Intimidating", "Trustworthy", "Dangerous",
        "Wise", "Charismatic", "Mysterious", "Reliable"
    ]
};
```

## Roll Templates

### 1. Damage Roll Template
```html
<rolltemplate class="sheet-rolltemplate-damage">
    <div class="template-container">
        <div class="header">{{character_name}} - Physical Damage</div>
        <div class="formula">Formula: {{formula}}</div>
        {{#tap_bonus}}
        <div class="tap-bonus">Tap Bonus: +{{tap_bonus}} ({{tapped_char}})</div>
        {{/tap_bonus}}
        <div class="damage">{{damage}}</div>
        {{#ammunition}}
        <div class="ammo">{{weapon_name}}: {{current}}/{{max}} shots remaining</div>
        {{/ammunition}}
        {{#targets}}
        <div class="targets">Targets: {{targets}}</div>
        {{/targets}}
    </div>
</rolltemplate>
```

### 2. Tap Result Template
```html
<rolltemplate class="sheet-rolltemplate-tap">
    <div class="template-container">
        <div class="header">{{character_name}} - Characteristic Tap</div>
        <div class="characteristic">Characteristic: {{characteristic}} (Rank {{rank}})</div>
        <div class="bonus">Bonus: +{{bonus}}</div>
        <div class="uses">Uses: {{uses}}/{{max_uses}}</div>
        {{#advancement_ready}}
        <div class="advancement-ready">Ready for Advancement! Click the + icon to attempt rank advancement.</div>
        {{/advancement_ready}}
    </div>
</rolltemplate>
```

### 3. Save Roll Template
```html
<rolltemplate class="sheet-rolltemplate-save">
    <div class="template-container">
        <div class="header">{{character_name}} - {{save_type}} Save</div>
        <div class="base-roll">Base Roll: {{base_roll}}</div>
        {{#tap_mitigation}}
        <div class="tap-mitigation">Tap Mitigation: -{{tap_mitigation}} ({{tapped_char}})</div>
        {{/tap_mitigation}}
        <div class="final-roll">Final Roll: {{final_roll}} vs Target: {{target}}</div>
        <div class="roll-result {{result_class}}">
            <div class="result">{{result_text}}</div>
        </div>
    </div>
</rolltemplate>
```

## CSS Styling

### 1. Character Generator Styling
```css
.character-generator {
    background: linear-gradient(135deg, rgba(139,69,19,0.1), rgba(160,82,45,0.1));
    border: 2px solid #8b4513;
    border-radius: 12px;
    padding: 20px;
    margin: 15px 0;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.btn-generate-all {
    background: linear-gradient(135deg, #8b4513, #a0522d);
    color: white;
    font-size: 18px;
    font-weight: bold;
    padding: 15px 25px;
    border: none;
    border-radius: 8px;
    width: 100%;
    margin-bottom: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.btn-generate-all:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(139,69,19,0.3);
}

.generator-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 15px;
}

.generator-options button {
    background: #8b4513;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s ease;
}

.generator-options button:hover {
    background: #a0522d;
}

.name-suggestions input {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #8b4513;
    padding: 8px;
    margin: 3px 0;
    border-radius: 4px;
    width: 100%;
    font-family: 'Cinzel', serif;
    color: #2c1810;
}
```

### 2. Roll Template Styling
```css
.sheet-rolltemplate-damage .template-container,
.sheet-rolltemplate-tap .template-container,
.sheet-rolltemplate-save .template-container {
    background: rgba(139, 69, 19, 0.1);
    border: 2px solid #8b4513;
    border-radius: 8px;
    padding: 12px;
    font-family: 'Cinzel', serif;
}

.sheet-rolltemplate-damage .header,
.sheet-rolltemplate-tap .header,
.sheet-rolltemplate-save .header {
    font-size: 16px;
    font-weight: bold;
    color: #8b4513;
    margin-bottom: 8px;
    text-align: center;
}

.sheet-rolltemplate-damage .damage {
    font-size: 24px;
    font-weight: bold;
    color: #8b4513;
    text-align: center;
    background: rgba(139, 69, 19, 0.2);
    border-radius: 4px;
    padding: 8px;
    margin: 8px 0;
}

.sheet-rolltemplate-save .roll-result.success {
    color: #2d5016;
    font-weight: bold;
}

.sheet-rolltemplate-save .roll-result.failure {
    color: #8b0000;
    font-weight: bold;
}
```

### 3. Mobile Responsive Design
```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
    .character-generator {
        padding: 15px;
        margin: 10px 0;
    }
    
    .generator-options {
        grid-template-columns: 1fr;
        gap: 8px;
    }
    
    .btn-generate-all {
        font-size: 16px;
        padding: 12px 20px;
    }
    
    .name-suggestions input {
        font-size: 14px;
        padding: 10px;
    }
}

/* Touch-friendly interface */
button, input[type="button"], input[type="submit"] {
    min-height: 44px;
    min-width: 44px;
}

/* Dark theme support */
.sheet-dark .character-generator {
    background: rgba(255, 178, 87, 0.1);
    border-color: #ffb257;
    color: #e6e6e6;
}

.sheet-dark .btn-generate-all {
    background: linear-gradient(135deg, #ffb257, #ffd08a);
    color: #1a1a1a;
}
```

## Development Phases

### New Action Items for Parity (post v1.0.4)

- Add in-sheet one-click table roll buttons (Background, Reputation, Fortitude, Foible, Issue, Armor, Weapons, Gear) that output with Roll Templates.
- Centralize table data (JSON arrays) under a single sheet worker source to match Foundry tables.
- Add a GM-only NPC import flow for Roll20:
  - Paste JSON in a textarea and/or upload JSON file (Pro API route optional).
  - Map armor fields: physical → sheet armor; social → social armor; faith → a faith-armor toggle/bonus.
  - Create repeating attacks for NPCs from the `attacks` array.
- Document the NPC JSON schema in this plan (see below) and provide an example file.
- Add a lightweight “regenerate tables” control for the sheet (GM-only) to reload local table data if updated.

### Phase 1: Core Sheet Structure (Weeks 1-2)
**Deliverables:**
- [x] HTML framework with all attributes and characteristics
- [x] Basic CSS styling with Roll20 compatibility
- [x] Core roll buttons for attributes and saves
- [x] Simple repeating sections for inventory

**Key Tasks:**
1. Set up Roll20 sheet structure with proper attribute naming
2. Implement basic character attributes (Vigor, Presence, Faith, Sand)
3. Create characteristic grid with rank/uses tracking
4. Add basic inventory repeating sections
5. Style with Bite the Bullet theme

### Phase 2: Roll Mechanics (Weeks 3-4)
**Deliverables:**
- [x] Roll templates for all roll types
- [x] Sheet workers for tap system
- [x] Combat roll integration
- [x] Save roll mechanics with tap mitigation

**Key Tasks:**
1. Create roll templates for damage, tap results, saves
2. Implement tap system sheet workers
3. Add combat roll mechanics with weapon integration
4. Build save roll system with tap mitigation
5. Test all roll mechanics thoroughly

### Phase 3: Inventory & Combat (Weeks 5-6)
**Deliverables:**
- [x] Complete ammunition tracking system
- [x] Reload mechanics with Lead consumption
- [x] Weapon attack integration
- [x] Inventory management automation

**Key Tasks:**
1. Implement ammunition tracking with auto-decrement
2. Create reload system using Lead resources
3. Integrate weapon attacks with ammo consumption
4. Add inventory load/reserve calculations
5. Test combat flow and ammunition mechanics

### Phase 4: Character Generator (Weeks 7-8)
**Deliverables:**
- [x] Complete character generator with all features
- [x] Wild West name generator
- [x] Equipment generation based on background
- [x] Mobile-optimized interface

**Key Tasks:**
1. Build comprehensive character generator
2. Implement Wild West name generation system
3. Create equipment generation logic
4. Add mobile-responsive design
5. Polish UI and test across devices

### Phase 5: Advanced Features & Polish (Weeks 9-10)
**Deliverables:**
- [x] Acts of Faith system
- [x] Cross-browser compatibility
- [x] Performance optimization
- [x] Documentation and user guide
- [ ] NPC importer (parity with Foundry import tool)
- [ ] One-click table rolls (full set) using Roll Templates

**Key Tasks:**
1. Implement Acts of Faith scaling system
2. Optimize sheet workers for performance
3. Test across all supported browsers
4. Create user documentation
5. Prepare for Roll20 marketplace submission
6. Implement NPC importer from JSON paste/upload
7. Add one-click table roll buttons and wire to roll templates

## Success Metrics

### Functionality Parity
- ✅ All FoundryVTT features replicated in Roll20
- ✅ Automation maintains smooth game flow
- ✅ User experience matches or exceeds FoundryVTT version
- ✅ Mobile-friendly interface works on all devices

### Performance Goals
- ⚡ Sheet workers respond in < 100ms
- 📱 Mobile interface loads quickly and responds smoothly
- 🌐 Compatible with Chrome, Firefox, Safari, Edge
- 💾 Efficient memory usage with large character sheets

### Community Adoption
- 📊 Positive user feedback and ratings
- 🎯 Active usage statistics and engagement
- 🏆 Successful Roll20 marketplace approval
- 🤝 Community contributions and suggestions

## Technical Requirements

### Roll20 Sheet Development
- **HTML5**: Semantic markup with Roll20 attribute system
- **CSS3**: Responsive design with Roll20 theme compatibility
- **JavaScript**: Sheet workers for automation and calculations
- **Roll20 API**: Advanced features for Pro subscribers (optional)

### Testing Requirements
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Mobile devices**: iOS Safari, Android Chrome
- **Screen sizes**: 320px to 1920px+ width
- **Accessibility**: Screen reader compatibility, keyboard navigation

### Performance Requirements
- **Load time**: < 3 seconds on mobile 3G
- **Sheet worker response**: < 100ms for most operations
- **Memory usage**: < 50MB for complex characters
- **Battery impact**: Minimal on mobile devices

## Conclusion

This Roll20 character sheet will provide a complete, automated, and user-friendly implementation of the Bite the Bullet RPG system. By leveraging Roll20's sheet worker system and responsive design principles, we'll create an experience that matches or exceeds our successful FoundryVTT implementation while being accessible to a broader audience.

The integrated character generator, comprehensive automation, and mobile-first design will make this the definitive way to play Bite the Bullet on Roll20, bringing the full Wild West experience to players across all platforms and devices.

## Roll20 NPC Importer (Stubs)

This section provides drop-in snippets you can paste into the Roll20 sheet when ready. It implements a minimal NPC importer (paste JSON), creates repeating rows for NPCs, and wires a basic NPC attack roll template.

### HTML: NPC Import UI and Repeating NPCs

```html
<!-- GM-only importer UI (hide via sheet worker if not GM, or leave for development) -->
<div class="npc-importer">
  <h3>NPC Importer (JSON)</h3>
  <textarea name="attr_npc_import_json" placeholder='[ { "name": "Bear", "attributes": { "vigor": 16, "presence": 6, "faith": 3, "sand": 12 }, "attacks": [ { "name": "Claw", "damage": "1d6" } ] } ]'></textarea>
  <button type="action" name="act_import_npcs">Import NPCs</button>
</div>

<!-- Repeating NPC block (lightweight) -->
<fieldset class="repeating_npcs">
  <input type="text" name="attr_npc_name" placeholder="Name" />
  <div class="npc-attrs">
    <input type="number" name="attr_npc_vigor" placeholder="Vig" />
    <input type="number" name="attr_npc_presence" placeholder="Pre" />
    <input type="number" name="attr_npc_faith" placeholder="Fth" />
    <input type="number" name="attr_npc_sand" placeholder="Snd" />
  </div>
  <div class="npc-armor">
    <input type="number" name="attr_npc_armor_physical" placeholder="Armor" />
    <input type="number" name="attr_npc_armor_social" placeholder="Social" />
    <input type="number" name="attr_npc_armor_faith" placeholder="Faith" />
  </div>
  <!-- Minimal one attack row per NPC; extend to repeating if desired -->
  <input type="text" name="attr_npc_attack_name" placeholder="Attack" />
  <input type="text" name="attr_npc_attack_damage" placeholder="1d6" />
  <button type="roll" name="roll_npc_attack" value="&{template:npc-attack} {{name=@{npc_name}}} {{attack=@{npc_attack_name}}} {{damage=[[ @{npc_attack_damage} ]]}}">Roll Attack</button>
</fieldset>
```

### Sheet Workers: Import Logic (paste JSON → create rows)

```javascript
// Utility: create repeating row and set attributes
function addRepeating(section, attrs) {
  const id = generateRowID();
  const out = {};
  Object.keys(attrs).forEach((k) => {
    out[`repeating_${section}_${id}_${k}`] = attrs[k];
  });
  setAttrs(out);
}

// Parse JSON and create minimal NPC rows
on('clicked:import_npcs', function() {
  getAttrs(['npc_import_json'], function(values) {
    try {
      const arr = JSON.parse(values.npc_import_json || '[]');
      if (!Array.isArray(arr)) throw new Error('JSON must be an array');
      arr.forEach((e) => {
        const a = e.attributes || {};
        const armor = e.armor || {};
        const atk = (e.attacks && e.attacks[0]) || { name: 'Attack', damage: '1d6' };
        addRepeating('npcs', {
          npc_name: e.name || 'NPC',
          npc_vigor: Number(a.vigor || a.Vig || 10),
          npc_presence: Number(a.presence || a.Pre || 10),
          npc_faith: Number(a.faith || a.Fth || 10),
          npc_sand: Number(a.sand || a.Snd || 6),
          npc_armor_physical: Number(armor.physical || 0),
          npc_armor_social: Number(armor.social || 0),
          npc_armor_faith: Number(armor.faith || 0),
          npc_attack_name: atk.name || 'Attack',
          npc_attack_damage: atk.damage || '1d6'
        });
      });
    } catch (err) {
      console.error('NPC import failed:', err);
    }
  });
});
```

### Roll Template: NPC Attack (minimal)

```html
<rolltemplate class="sheet-rolltemplate-npc-attack">
  <div class="template-container">
    <div class="header">{{name}} — {{attack}}</div>
    <div class="damage">Damage: {{damage}}</div>
  </div>
  <style>
    .sheet-rolltemplate-npc-attack .template-container { border: 2px solid #8b4513; padding: 8px; border-radius: 6px; }
    .sheet-rolltemplate-npc-attack .header { font-weight: bold; color:#8b4513; margin-bottom:6px; text-align:center; }
    .sheet-rolltemplate-npc-attack .damage { font-size: 18px; text-align:center; }
  </style>
  </rolltemplate>
```

### Notes

- This importer is intentionally minimal. Extend to support multiple attacks via a nested repeating section (`repeating_npc_attacks`).
- For GM-only visibility, add a checkbox `attr_is_gm_mode` or leverage a sheet-setting and hide `.npc-importer` via CSS.
- The schema mirrors our Foundry importer for content parity; you can reuse the same JSON file.
