import { describe, it, expect } from 'vitest';
import { StatSheet, StatType, AttributeType, ModifierOp } from '../src/engine/types';
import { StatCalculator, createStatSheet } from '../src/engine/stats';
import { MockRegistry, nearlyEqual } from './ecsHelper';

describe('Gameplay - Stats Tests', () => {
  it('Derived-stat formulas verified for a known attribute set', () => {
    const sheet: StatSheet = createStatSheet();
    sheet.attributes[AttributeType.STR] = 10;
    sheet.attributes[AttributeType.DEX] = 20;
    sheet.attributes[AttributeType.INT] = 15;
    sheet.attributes[AttributeType.VIT] = 25;
    sheet.isDirty = true;

    // BaseMaxHealth = 50 + 25*10 = 300
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MaxHealth), 300.0)).toBe(true);

    // BaseMaxMana = 30 + 15*8 = 150
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MaxMana), 150.0)).toBe(true);

    // AttackPower = STR*2 + DEX = 10*2 + 20 = 40
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.AttackPower), 40.0)).toBe(true);

    // SpellPower = INT*2 = 15*2 = 30
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.SpellPower), 30.0)).toBe(true);

    // Armor = STR*0.5 + DEX*0.5 = 10*0.5 + 20*0.5 = 15
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Armor), 15.0)).toBe(true);

    // Evasion = DEX*0.3 = 20*0.3 = 6
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Evasion), 6.0)).toBe(true);

    // CritChance = 5 + DEX*0.1 = 5 + 2 = 7
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.CritChance), 7.0)).toBe(true);

    // CritMultiplier = 150
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.CritMultiplier), 150.0)).toBe(true);

    // MoveSpeed = 100
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MoveSpeed), 100.0)).toBe(true);

    // CooldownReduction = 0
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.CooldownReduction), 0.0)).toBe(true);
  });

  it('Flat/PercentAdd/PercentMult stacking order verified', () => {
    const sheet: StatSheet = createStatSheet();
    sheet.attributes[AttributeType.VIT] = 0;
    sheet.isDirty = true;
    // BaseMaxHealth = 50

    StatCalculator.AddModifier(sheet, { sourceId: 1, stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 25.0, durationTicks: -1 });
    // Base + Flat = 50 + 25 = 75

    StatCalculator.AddModifier(sheet, { sourceId: 2, stat: StatType.MaxHealth, op: ModifierOp.PercentAdd, value: 10.0, durationTicks: -1 });
    // (Base + Flat) * (1 + sum(PercentAdd)/100) = 75 * 1.1 = 82.5

    StatCalculator.AddModifier(sheet, { sourceId: 3, stat: StatType.MaxHealth, op: ModifierOp.PercentMult, value: 20.0, durationTicks: -1 });
    // ... * product(1 + PercentMult/100) = 82.5 * 1.2 = 99.0

    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MaxHealth), 99.0)).toBe(true);
  });

  it('Modifiers from multiple sources add and remove-by-source correctly', () => {
    const sheet: StatSheet = createStatSheet();

    // Default Base MoveSpeed = 100
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MoveSpeed), 100.0)).toBe(true);

    // Source 10 adds 20 flat
    StatCalculator.AddModifier(sheet, { sourceId: 10, stat: StatType.MoveSpeed, op: ModifierOp.Flat, value: 20.0, durationTicks: -1 });
    // Source 11 adds 50% mult
    StatCalculator.AddModifier(sheet, { sourceId: 11, stat: StatType.MoveSpeed, op: ModifierOp.PercentMult, value: 50.0, durationTicks: -1 });

    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MoveSpeed), 180.0)).toBe(true);

    // Remove source 10
    StatCalculator.RemoveModifiersFromSource(sheet, 10);
    // Base 100 * 1.5 = 150
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MoveSpeed), 150.0)).toBe(true);

    // Remove source 11
    StatCalculator.RemoveModifiersFromSource(sheet, 11);
    // Back to base
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.MoveSpeed), 100.0)).toBe(true);
  });

  it('Temporary modifier expires after N TickModifiers calls', () => {
    const sheet: StatSheet = createStatSheet();

    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Armor), 0.0)).toBe(true);

    // Add modifier for 2 ticks
    StatCalculator.AddModifier(sheet, { sourceId: 1, stat: StatType.Armor, op: ModifierOp.Flat, value: 100.0, durationTicks: 2 });

    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Armor), 100.0)).toBe(true);

    StatCalculator.TickModifiers(sheet);
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Armor), 100.0)).toBe(true);

    StatCalculator.TickModifiers(sheet); // expires here
    expect(nearlyEqual(StatCalculator.GetStat(sheet, StatType.Armor), 0.0)).toBe(true);
  });

  it('Dirty-flag laziness', () => {
    const sheet: StatSheet = createStatSheet();

    // Initial read sets isDirty = false
    const v1 = StatCalculator.GetStat(sheet, StatType.MaxHealth);
    expect(sheet.isDirty).toBe(false);

    // Adding modifier sets isDirty = true
    StatCalculator.AddModifier(sheet, { sourceId: 1, stat: StatType.MaxHealth, op: ModifierOp.Flat, value: 50.0, durationTicks: -1 });
    expect(sheet.isDirty).toBe(true);

    // Next read recalculates and sets isDirty = false
    const v2 = StatCalculator.GetStat(sheet, StatType.MaxHealth);
    expect(sheet.isDirty).toBe(false);
    expect(v2).toBeGreaterThan(v1);
  });

  it('StatSheet works as an ECS component via Registry', () => {
    const registry = new MockRegistry();
    const e = registry.Create();

    // Add component
    registry.AddComponent<StatSheet>(e, 'StatSheet', createStatSheet());
    expect(registry.HasComponent(e, 'StatSheet')).toBe(true);

    // Mutate through GetComponent
    const sheet = registry.GetComponent<StatSheet>(e, 'StatSheet')!;
    expect(sheet).toBeDefined();

    StatCalculator.AddModifier(sheet, { sourceId: 1, stat: StatType.AttackPower, op: ModifierOp.Flat, value: 100.0, durationTicks: -1 });

    // Verify
    const sheet2 = registry.GetComponent<StatSheet>(e, 'StatSheet')!;
    expect(nearlyEqual(StatCalculator.GetStat(sheet2, StatType.AttackPower), 100.0)).toBe(true);
  });
});
