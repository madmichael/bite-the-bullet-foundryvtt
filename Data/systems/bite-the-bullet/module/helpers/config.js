export const BITE_BULLET = {};

/**
 * The set of Attributes used within the system.
 * @type {Object}
 */
BITE_BULLET.attributes = {
  "vigor": "BITE_BULLET.AttributeVigor",
  "presence": "BITE_BULLET.AttributePresence", 
  "faith": "BITE_BULLET.AttributeFaith"
};

BITE_BULLET.attributeAbbreviations = {
  "vigor": "BITE_BULLET.AttributeVigorAbbr",
  "presence": "BITE_BULLET.AttributePresenceAbbr",
  "faith": "BITE_BULLET.AttributeFaithAbbr"
};

/**
 * The set of Characteristics used within the system.
 * @type {Object}
 */
BITE_BULLET.characteristics = {
  "background": "BITE_BULLET.CharacteristicBackground",
  "reputation": "BITE_BULLET.CharacteristicReputation",
  "fortitude": "BITE_BULLET.CharacteristicFortitude", 
  "foible": "BITE_BULLET.CharacteristicFoible",
  "issue": "BITE_BULLET.CharacteristicIssue",
  "bond": "BITE_BULLET.CharacteristicBond"
};

/**
 * Item Types
 * @type {Object}
 */
BITE_BULLET.itemTypes = {
  "weapon": "BITE_BULLET.ItemTypeWeapon",
  "armor": "BITE_BULLET.ItemTypeArmor",
  "gear": "BITE_BULLET.ItemTypeGear",
  "burden": "BITE_BULLET.ItemTypeBurden"
};

/**
 * Weapon Types
 * @type {Object}
 */
BITE_BULLET.weaponTypes = {
  "revolver": "BITE_BULLET.WeaponRevolver",
  "rifle": "BITE_BULLET.WeaponRifle",
  "shotgun": "BITE_BULLET.WeaponShotgun",
  "melee": "BITE_BULLET.WeaponMelee",
  "thrown": "BITE_BULLET.WeaponThrown",
  "bow": "BITE_BULLET.WeaponBow"
};

/**
 * Armor Types
 * @type {Object}
 */
BITE_BULLET.armorTypes = {
  "light": "BITE_BULLET.ArmorLight",
  "medium": "BITE_BULLET.ArmorMedium", 
  "heavy": "BITE_BULLET.ArmorHeavy",
  "fetish": "BITE_BULLET.ArmorFetish"
};

/**
 * Range Bands
 * @type {Object}
 */
BITE_BULLET.rangeBands = {
  "personal": "BITE_BULLET.RangePersonal",
  "close": "BITE_BULLET.RangeClose",
  "medium": "BITE_BULLET.RangeMedium",
  "long": "BITE_BULLET.RangeLong"
};

/**
 * Damage Types
 * @type {Object}
 */
BITE_BULLET.damageTypes = {
  "physical": "BITE_BULLET.DamagePhysical",
  "social": "BITE_BULLET.DamageSocial",
  "faith": "BITE_BULLET.DamageFaith"
};

/**
 * Conflict Types
 * @type {Object}
 */
BITE_BULLET.conflictTypes = {
  "physical": "BITE_BULLET.ConflictPhysical",
  "social": "BITE_BULLET.ConflictSocial", 
  "faith": "BITE_BULLET.ConflictFaith"
};

/**
 * Burden Types
 * @type {Object}
 */
BITE_BULLET.burdenTypes = {
  "physical": "BITE_BULLET.BurdenPhysical",
  "social": "BITE_BULLET.BurdenSocial",
  "faith": "BITE_BULLET.BurdenFaith"
};

/**
 * Acts of Faith Scale
 * @type {Object}
 */
BITE_BULLET.faithScale = {
  "trivial": {
    "label": "BITE_BULLET.FaithTrivial",
    "reserve": 0,
    "modifier": 0
  },
  "minor": {
    "label": "BITE_BULLET.FaithMinor", 
    "reserve": 1,
    "modifier": -1
  },
  "moderate": {
    "label": "BITE_BULLET.FaithModerate",
    "reserve": 2, 
    "modifier": -2
  },
  "major": {
    "label": "BITE_BULLET.FaithMajor",
    "reserve": 3,
    "modifier": -3
  },
  "legendary": {
    "label": "BITE_BULLET.FaithLegendary",
    "reserve": 4,
    "modifier": "special"
  }
};

/**
 * Status Effects
 * @type {Object}
 */
BITE_BULLET.statusEffects = {
  "poisoned": "BITE_BULLET.StatusPoisoned",
  "deprived": "BITE_BULLET.StatusDeprived",
  "bleeding": "BITE_BULLET.StatusBleeding",
  "concussed": "BITE_BULLET.StatusConcussed",
  "lamed": "BITE_BULLET.StatusLamed",
  "shamed": "BITE_BULLET.StatusShamed",
  "exposed": "BITE_BULLET.StatusExposed",
  "branded": "BITE_BULLET.StatusBranded",
  "ostracized": "BITE_BULLET.StatusOstracized",
  "shaken": "BITE_BULLET.StatusShaken",
  "profaned": "BITE_BULLET.StatusProfaned",
  "blasphemed": "BITE_BULLET.StatusBlasphemed",
  "oathless": "BITE_BULLET.StatusOathless",
  "excommunicated": "BITE_BULLET.StatusExcommunicated"
};