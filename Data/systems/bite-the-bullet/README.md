# Bite the Bullet - Foundry VTT System

A game system for Foundry VTT supporting the "Bite the Bullet" RPG by Jason Hobbs. This is a post-apocalyptic Western game where faith, grit, and gunpowder meet in the wasteland.

## Installation

### Manual Installation

1. Download the system files
2. Create a folder named `bite-the-bullet` in your Foundry VTT `Data/systems` directory
3. Place all system files in this folder
4. Start Foundry VTT and create a new world using the "Bite the Bullet" system

### From Manifest URL

If hosting the system files, you can install via the Foundry VTT system installer using this manifest URL:
```
https://madmichael.github.io/bite-the-bullet-foundryvtt/system.json
```

## Directory Structure

Your system should be organized like this:

```
bite-the-bullet/
├── system.json                 # System manifest
├── template.json               # Data model definitions  
├── bite-the-bullet.js         # Main system module
├── README.md                  # This file
├── LICENSE.txt               # License file
├── css/
│   └── bite-the-bullet.css   # System styling
├── lang/
│   └── en.json              # English localization
├── module/
│   ├── documents/
│   │   ├── actor.js         # Actor document class
│   │   └── item.js          # Item document class
│   ├── sheets/
│   │   ├── actor-sheet.js   # Actor sheet class
│   │   └── item-sheet.js    # Item sheet class
│   └── helpers/
│       ├── config.js        # System configuration
│       └── templates.js     # Template preloader
├── templates/
│   ├── actor/
│   │   ├── actor-character-sheet.html
│   │   ├── actor-npc-sheet.html
│   │   └── parts/           # Template partials
│   └── item/
│       ├── item-weapon-sheet.html
│       ├── item-armor-sheet.html
│       ├── item-gear-sheet.html
│       ├── item-burden-sheet.html
│       └── parts/           # Template partials
└── assets/
    └── icons/
        └── bite-the-bullet-icon.png
```

## Core Features

### Character Creation
- **Attributes**: Vigor, Presence, Faith (3d6 each)
- **Sand**: Mental stamina and determination (2d6)  
- **Characteristics**: Background, Reputation, Fortitude, Foible, Issue, Bond (all start at Rank 1)
- **Inventory System**: Slot-based with Load/Reserve tracking

### Conflict System
- **Physical Conflict**: Combat with weapons and damage
- **Social Conflict**: Debates and tests of will  
- **Faith Conflict**: Acts of Faith with Reserve requirements

### Acts of Faith
- **Scale-based**: Trivial (0 Reserve) to Legendary (4+ Reserve)
- **Risk/Reward**: Failed attempts cause damage
- **Faith Saves**: Roll under Faith attribute with modifiers

### Burden System  
- **Three Types**: Physical, Social, Faith burdens
- **Status Effects**: Take up inventory slots
- **Recovery**: Various methods from rest to roleplay

## System Mechanics

### Saves
- Roll 1d20 under the relevant attribute
- Failed saves when attributes reach 0 have severe consequences

### Characteristics
- Can be "tapped" to add rank to rolls or reduce damage
- Track usage to advance in rank (10 uses per rank level)
- Narrative-driven traits that shape character actions

### Inventory & Reserve
- **Inventory**: Total carrying capacity (usually = Vigor, min 10)
- **Load**: Used inventory slots  
- **Reserve**: Unused capacity (Inventory - Load)
- **Reserve enables Acts of Faith**: Must have sufficient Reserve

## Getting Started

1. Create a new world with the Bite the Bullet system
2. Create character actors and roll attributes (or set manually)
3. Roll or select characteristics from the tables in the rules
4. Add starting equipment (weapons, armor, gear)
5. Set Sand to 2d6 initially
6. Begin play with the core principles:
   - Faith is personal
   - Death is imminent  
   - Telegraph danger before action
   - Roll only when consequences matter

## Character Sheet Features

### Attributes Tab
- Attribute values with save buttons
- Sand, Inventory, Load, Reserve tracking
- Lead and money resources
- Characteristic management with tap buttons
- Act of Faith button

### Inventory Tab  
- Organized by item type (Weapons, Armor, Gear, Burdens)
- Item creation buttons for each category
- Quick stats display for weapons and armor
- Burden status tracking

### Biography Tab
- Rich text editor for character background and notes

## Dice Rolling

The system includes several automated roll types:

- **Attribute Saves**: Click attribute save buttons
- **Characteristic Tapping**: Track usage automatically  
- **Acts of Faith**: Dialog-driven with scale selection
- **Weapon Damage**: Roll damage dice for weapons
- **Item Usage**: Track uses for consumable gear

## Development Notes

This system is designed to closely follow the Bite the Bullet rules while providing Foundry VTT quality-of-life features. Key design decisions:

- **Faithful to Source**: Mechanics match the original game
- **Automation Where Helpful**: Calculate Reserve, track characteristic uses
- **Player Agency**: Players narrate their actions, system handles dice
- **Visual Theme**: Western/post-apocalyptic aesthetic

## Future Enhancements

Potential additions for future versions:

- Random generation tables for characteristics
- Compendium content (enemies, gear, burdens)  
- Combat tracker enhancements
- Automated burden application
- Group Bond management tools
- Campaign/settlement tracking

## License

This system is created as a fan project. "Bite the Bullet" is the intellectual property of Jason Hobbs. This system implementation is provided under [your chosen license].

## Contributing

If you'd like to contribute to this system:

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Test thoroughly in Foundry VTT
5. Submit a pull request

## Support

For issues and questions:
- Check the Foundry VTT system documentation
- Review the original Bite the Bullet rules
- File issues on the project repository

Remember: Every town is a candle against a vast dark, and every ride into the wilderness is a wager with death.