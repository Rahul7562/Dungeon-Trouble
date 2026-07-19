#include <Gameplay/Items/ItemDefTable.h>
#include <string>
#include <cctype>

namespace DungeonEngine {
namespace Gameplay {

void ItemDefTable::Register(const ItemDef& def) {
    m_items[def.id] = def;
}

const ItemDef* ItemDefTable::Get(Core::u32 id) const {
    auto it = m_items.find(id);
    if (it != m_items.end()) {
        return &it->second;
    }
    return nullptr;
}

// Minimal tolerant JSON parser for an array of ItemDef objects
// Not a full JSON parser. Assumptions:
// - Fixed schema
// - No escape sequences in strings
// - No nested objects (except equipModifiers array of objects)
// Structure: [ { "id": 1, "name": "Sword", ... }, ... ]

static void SkipWhitespace(const Core::String& text, size_t& pos) {
    while (pos < text.length() && std::isspace(static_cast<unsigned char>(text[pos]))) {
        pos++;
    }
}

static bool MatchChar(const Core::String& text, size_t& pos, char expected) {
    SkipWhitespace(text, pos);
    if (pos < text.length() && text[pos] == expected) {
        pos++;
        return true;
    }
    return false;
}

static Core::String ParseString(const Core::String& text, size_t& pos) {
    Core::String result;
    SkipWhitespace(text, pos);
    if (pos < text.length() && text[pos] == '"') {
        pos++;
        while (pos < text.length() && text[pos] != '"') {
            result += text[pos];
            pos++;
        }
        if (pos < text.length() && text[pos] == '"') pos++; // Consume closing quote
    }
    return result;
}

static Core::i32 ParseInt(const Core::String& text, size_t& pos) {
    Core::i32 result = 0;
    SkipWhitespace(text, pos);
    bool negative = false;
    if (pos < text.length() && text[pos] == '-') {
        negative = true;
        pos++;
    }
    while (pos < text.length() && std::isdigit(static_cast<unsigned char>(text[pos]))) {
        result = result * 10 + (text[pos] - '0');
        pos++;
    }
    return negative ? -result : result;
}

static Core::f32 ParseFloat(const Core::String& text, size_t& pos) {
    SkipWhitespace(text, pos);
    // basic float parse via std::stof
    size_t start = pos;
    if (pos < text.length() && text[pos] == '-') {
        pos++;
    }
    while (pos < text.length() && (std::isdigit(static_cast<unsigned char>(text[pos])) || text[pos] == '.')) {
        pos++;
    }
    Core::String numStr = text.substr(start, pos - start);
    if (numStr.empty() || numStr == "-") return 0.0f;
    return std::stof(numStr);
}

Core::Result<bool> ItemDefTable::LoadFromJson(const Core::String& jsonText) {
    size_t pos = 0;

    if (!MatchChar(jsonText, pos, '[')) {
        return Core::Result<bool>::Error("Expected array start '[' at root");
    }

    while (pos < jsonText.length()) {
        SkipWhitespace(jsonText, pos);
        if (MatchChar(jsonText, pos, ']')) {
            break; // End of array
        }

        if (!MatchChar(jsonText, pos, '{')) {
            return Core::Result<bool>::Error("Expected object start '{'");
        }

        ItemDef currentDef;
        bool hasId = false;

        while (pos < jsonText.length()) {
            SkipWhitespace(jsonText, pos);
            if (MatchChar(jsonText, pos, '}')) {
                break; // End of object
            }

            Core::String key = ParseString(jsonText, pos);
            if (!MatchChar(jsonText, pos, ':')) {
                return Core::Result<bool>::Error("Expected ':' after key");
            }

            if (key == "id") {
                currentDef.id = static_cast<Core::u32>(ParseInt(jsonText, pos));
                hasId = true;
            } else if (key == "name") {
                currentDef.name = ParseString(jsonText, pos);
            } else if (key == "rarity") {
                Core::String r = ParseString(jsonText, pos);
                if (r == "Common") currentDef.rarity = ItemRarity::Common;
                else if (r == "Uncommon") currentDef.rarity = ItemRarity::Uncommon;
                else if (r == "Rare") currentDef.rarity = ItemRarity::Rare;
                else if (r == "Epic") currentDef.rarity = ItemRarity::Epic;
                else if (r == "Legendary") currentDef.rarity = ItemRarity::Legendary;
                else return Core::Result<bool>::Error("Unknown rarity: " + r);
            } else if (key == "slot") {
                Core::String s = ParseString(jsonText, pos);
                if (s == "None") currentDef.slot = EquipSlot::None;
                else if (s == "Head") currentDef.slot = EquipSlot::Head;
                else if (s == "Chest") currentDef.slot = EquipSlot::Chest;
                else if (s == "Legs") currentDef.slot = EquipSlot::Legs;
                else if (s == "Boots") currentDef.slot = EquipSlot::Boots;
                else if (s == "MainHand") currentDef.slot = EquipSlot::MainHand;
                else if (s == "OffHand") currentDef.slot = EquipSlot::OffHand;
                else if (s == "Ring") currentDef.slot = EquipSlot::Ring;
                else if (s == "Amulet") currentDef.slot = EquipSlot::Amulet;
                else return Core::Result<bool>::Error("Unknown slot: " + s);
            } else if (key == "maxStack") {
                currentDef.maxStack = static_cast<Core::u32>(ParseInt(jsonText, pos));
            } else if (key == "equipModifiers") {
                if (!MatchChar(jsonText, pos, '[')) {
                    return Core::Result<bool>::Error("Expected array for equipModifiers");
                }
                while (pos < jsonText.length()) {
                    if (MatchChar(jsonText, pos, ']')) {
                        break;
                    }
                    if (!MatchChar(jsonText, pos, '{')) {
                        return Core::Result<bool>::Error("Expected object in equipModifiers array");
                    }
                    StatModifier mod{};
                    mod.sourceId = 0; // Filled later
                    mod.durationTicks = -1; // Default
                    while (pos < jsonText.length()) {
                        if (MatchChar(jsonText, pos, '}')) {
                            break;
                        }
                        Core::String modKey = ParseString(jsonText, pos);
                        if (!MatchChar(jsonText, pos, ':')) return Core::Result<bool>::Error("Expected ':' in modifier");

                        if (modKey == "stat") {
                            Core::String st = ParseString(jsonText, pos);
                            // Mapping a subset of common stats for test / example
                            if (st == "MaxHealth") mod.stat = StatType::MaxHealth;
                            else if (st == "MaxMana") mod.stat = StatType::MaxMana;
                            else if (st == "AttackPower") mod.stat = StatType::AttackPower;
                            else if (st == "Armor") mod.stat = StatType::Armor;
                            else if (st == "MoveSpeed") mod.stat = StatType::MoveSpeed;
                            else return Core::Result<bool>::Error("Unknown stat: " + st);
                        } else if (modKey == "op") {
                            Core::String opStr = ParseString(jsonText, pos);
                            if (opStr == "Flat") mod.op = ModifierOp::Flat;
                            else if (opStr == "PercentAdd") mod.op = ModifierOp::PercentAdd;
                            else if (opStr == "PercentMult") mod.op = ModifierOp::PercentMult;
                            else return Core::Result<bool>::Error("Unknown op: " + opStr);
                        } else if (modKey == "value") {
                            mod.value = ParseFloat(jsonText, pos);
                        } else if (modKey == "durationTicks") {
                            mod.durationTicks = ParseInt(jsonText, pos);
                        } else {
                            // Skip unknown
                            while (pos < jsonText.length() && jsonText[pos] != ',' && jsonText[pos] != '}') pos++;
                        }
                        MatchChar(jsonText, pos, ',');
                    }
                    currentDef.equipModifiers.push_back(mod);
                    MatchChar(jsonText, pos, ',');
                }
            } else {
                // Ignore unknown keys loosely
                // In a robust parser, we'd skip proper values
                // For simplicity, just search for next comma or closing brace
                bool inString = false;
                while (pos < jsonText.length()) {
                    if (jsonText[pos] == '"') {
                        inString = !inString;
                        pos++;
                    } else if (!inString && (jsonText[pos] == ',' || jsonText[pos] == '}')) {
                        break;
                    } else {
                        pos++;
                    }
                }
            }

            MatchChar(jsonText, pos, ',');
        }

        if (!hasId) {
            return Core::Result<bool>::Error("Item missing 'id'");
        }

        Register(currentDef);

        MatchChar(jsonText, pos, ',');
    }

    return true;
}

} // namespace Gameplay
} // namespace DungeonEngine
