import { describe, it, expect } from 'vitest';
import {
  ItemDef,
  ItemRarity,
  EquipSlot,
  StatType,
  ModifierOp,
  Equipment,
  StatSheet,
} from '../src/engine/types';
import { ItemDefTable, Inventory, EquipmentOps } from '../src/engine/items';
import { StatCalculator, createStatSheet } from '../src/engine/stats';
import { nearlyEqual } from './ecsHelper';

describe('Gameplay - Items Tests', () => {
  it('Items - JSON Parsing', () => {
    const table = new ItemDefTable();

    const json = JSON.stringify([
      {
        id: 1,
        name: 'Rusty Sword',
        rarity: 'Common',
        slot: 'MainHand',
        maxStack: 1,
        equipModifiers: [
          { stat: 'AttackPower', op: 'Flat', value: 5.0, durationTicks: -1 },
        ],
      },
      {
        id: 2,
        name: 'Health Potion',
        rarity: 'Uncommon',
        slot: 'None',
        maxStack: 20,
      },
      {
        id: 3,
        name: 'Leather Armor',
        rarity: 'Rare',
        slot: 'Chest',
        maxStack: 1,
        equipModifiers: [
          { stat: 'Armor', op: 'Flat', value: 15.0 },
          { stat: 'MaxHealth', op: 'PercentAdd', value: 0.1 },
        ],
      },
    ]);

    const result = table.LoadFromJson(json);
    expect(result.IsOk()).toBe(true);
    expect(result.Get()).toBe(true);

    const sword = table.Get(1);
    expect(sword).toBeDefined();
    expect(sword!.name).toBe('Rusty Sword');
    expect(sword!.rarity).toBe(ItemRarity.Common);
    expect(sword!.slot).toBe(EquipSlot.MainHand);
    expect(sword!.maxStack).toBe(1);
    expect(sword!.equipModifiers.length).toBe(1);
    expect(sword!.equipModifiers[0].stat).toBe(StatType.AttackPower);
    expect(nearlyEqual(sword!.equipModifiers[0].value, 5.0)).toBe(true);

    const potion = table.Get(2);
    expect(potion).toBeDefined();
    expect(potion!.slot).toBe(EquipSlot.None);
    expect(potion!.maxStack).toBe(20);

    const armor = table.Get(3);
    expect(armor).toBeDefined();
    expect(armor!.equipModifiers.length).toBe(2);
    expect(armor!.equipModifiers[1].stat).toBe(StatType.MaxHealth);
    expect(nearlyEqual(armor!.equipModifiers[1].value, 0.1)).toBe(true);

    // Malformed JSON should return Error
    const badJson = JSON.stringify([{ name: 'No ID Item' }]);
    const badResult = table.LoadFromJson(badJson);
    expect(badResult.IsError()).toBe(true);
  });

  it('Items - Inventory Stacking', () => {
    const table = new ItemDefTable();

    const potion: ItemDef = {
      id: 10,
      name: 'Potion',
      rarity: ItemRarity.Common,
      slot: EquipSlot.None,
      maxStack: 5,
      equipModifiers: [],
    };
    table.Register(potion);

    const sword: ItemDef = {
      id: 11,
      name: 'Sword',
      rarity: ItemRarity.Common,
      slot: EquipSlot.MainHand,
      maxStack: 1,
      equipModifiers: [],
    };
    table.Register(sword);

    const inv = new Inventory(3); // 3 slots

    // Add 2 potions
    let rem = inv.AddItem(table, 10, 2);
    expect(rem).toBe(0);
    expect(inv.CountOf(10)).toBe(2);
    expect(inv.slots[0].defId).toBe(10);
    expect(inv.slots[0].count).toBe(2);

    // Add 4 more potions. 3 should fill the first stack, 1 in the next stack.
    rem = inv.AddItem(table, 10, 4);
    expect(rem).toBe(0);
    expect(inv.CountOf(10)).toBe(6);
    expect(inv.slots[0].count).toBe(5);
    expect(inv.slots[1].defId).toBe(10);
    expect(inv.slots[1].count).toBe(1);

    // Fill the last slot with a sword
    rem = inv.AddItem(table, 11, 1);
    expect(rem).toBe(0);

    // Try to add another sword, inventory is full
    rem = inv.AddItem(table, 11, 1);
    expect(rem).toBe(1);

    // Try to add 5 potions. Only 4 can fit in the second stack. 1 remainder.
    rem = inv.AddItem(table, 10, 5);
    expect(rem).toBe(1);
    expect(inv.CountOf(10)).toBe(10);

    // Remove 6 potions
    let removed = inv.RemoveItem(10, 6);
    expect(removed).toBe(6);
    expect(inv.CountOf(10)).toBe(4);
    // Stack 0 should now be 0 count and empty (slot defId = 0)
    expect(inv.slots[0].defId).toBe(0);
    expect(inv.slots[1].count).toBe(4);

    // Remove 5 potions. Only 4 exist.
    removed = inv.RemoveItem(10, 5);
    expect(removed).toBe(4);
    expect(inv.CountOf(10)).toBe(0);
    expect(inv.slots[1].defId).toBe(0);
  });

  it('Items - Equipment & Stat Modifiers', () => {
    const table = new ItemDefTable();

    const chest: ItemDef = {
      id: 100,
      name: 'Chest',
      rarity: ItemRarity.Common,
      slot: EquipSlot.Chest,
      maxStack: 1,
      equipModifiers: [{ sourceId: 0, stat: StatType.Armor, op: ModifierOp.Flat, value: 20.0, durationTicks: -1 }],
    };
    table.Register(chest);

    const betterChest: ItemDef = {
      id: 101,
      name: 'Better Chest',
      rarity: ItemRarity.Rare,
      slot: EquipSlot.Chest,
      maxStack: 1,
      equipModifiers: [{ sourceId: 0, stat: StatType.Armor, op: ModifierOp.Flat, value: 50.0, durationTicks: -1 }],
    };
    table.Register(betterChest);

    const junk: ItemDef = {
      id: 999,
      name: 'Junk',
      rarity: ItemRarity.Common,
      slot: EquipSlot.None,
      maxStack: 1,
      equipModifiers: [],
    };
    table.Register(junk);

    const equip: Equipment = { slots: { [EquipSlot.None]: 0, [EquipSlot.MainHand]: 0, [EquipSlot.OffHand]: 0, [EquipSlot.Helmet]: 0, [EquipSlot.Chest]: 0, [EquipSlot.Boots]: 0, [EquipSlot.Ring]: 0, [EquipSlot.Amulet]: 0 } };
    const stats: StatSheet = createStatSheet();

    expect(nearlyEqual(StatCalculator.GetStat(stats, StatType.Armor), 0.0)).toBe(true);

    // Try equipping unequipable item
    const failRes = EquipmentOps.Equip(equip, stats, table, 999);
    expect(failRes.IsError()).toBe(true);

    // Equip chest
    let res = EquipmentOps.Equip(equip, stats, table, 100);
    expect(res.IsOk()).toBe(true);
    expect(res.Get()).toBe(0); // Nothing was equipped before
    expect(equip.slots[EquipSlot.Chest]).toBe(100);

    expect(nearlyEqual(StatCalculator.GetStat(stats, StatType.Armor), 20.0)).toBe(true);

    // Swap chest
    res = EquipmentOps.Equip(equip, stats, table, 101);
    expect(res.IsOk()).toBe(true);
    expect(res.Get()).toBe(100); // Returned old chest ID
    expect(equip.slots[EquipSlot.Chest]).toBe(101);

    expect(nearlyEqual(StatCalculator.GetStat(stats, StatType.Armor), 50.0)).toBe(true);

    // Unequip
    const unequipped = EquipmentOps.Unequip(equip, stats, EquipSlot.Chest);
    expect(unequipped).toBe(101);
    expect(equip.slots[EquipSlot.Chest]).toBe(0);

    expect(nearlyEqual(StatCalculator.GetStat(stats, StatType.Armor), 0.0)).toBe(true);
  });
});
