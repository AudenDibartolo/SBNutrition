import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, campusToday, isValidDate, weekStart } from "./dates";
import { parseServings } from "./logs";
import { isStale, STALE_MS } from "./menus";
import { formatAmount, scaleNutrition, splitIcons, sumNutrition } from "./nutrients";
import { parseDayItems, parseLocations } from "./nutrislice";

test("dates", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-03-08", -1), "2026-03-07");
  assert.equal(weekStart("2026-10-17"), "2026-10-11"); // Saturday -> previous Sunday
  assert.equal(weekStart("2026-10-18"), "2026-10-18");
  assert.ok(isValidDate("2026-10-17"));
  assert.ok(!isValidDate("2026-02-30"));
  assert.ok(!isValidDate("10/17/2026"));
  // 03:30 UTC on Oct 18 is still Oct 17 in New York
  assert.equal(campusToday(new Date("2026-10-18T03:30:00Z")), "2026-10-17");
});

test("nutrition math keeps unreported values null", () => {
  const a = { calories: 100, g_protein: 10, g_trans_fat: null };
  const b = { calories: 50, g_protein: null, g_trans_fat: null };
  const sum = sumNutrition([scaleNutrition(a, 2), b]);
  assert.equal(sum.calories, 250);
  assert.equal(sum.g_protein, 20);
  assert.equal(sum.g_trans_fat, null);
  assert.equal(formatAmount(22, "g"), "22g");
  assert.equal(formatAmount(1.84, "IU"), "1.8 IU");
  assert.equal(formatAmount(null, "g"), "—");
});

test("servings validation", () => {
  assert.equal(parseServings(1.5), 1.5);
  assert.equal(parseServings("2"), 2);
  assert.equal(parseServings(0.333), 0.33);
  assert.equal(parseServings(0), null);
  assert.equal(parseServings(-1), null);
  assert.equal(parseServings(21), null);
  assert.equal(parseServings("abc"), null);
});

test("icons split into allergens and tags", () => {
  assert.deepEqual(splitIcons(["Vegan", "Milk", "Halal", "Soy"]), { allergens: ["Milk", "Soy"], tags: ["Vegan", "Halal"] });
});

test("staleness: past menus are settled, recent ones refresh after STALE_MS", () => {
  const now = new Date("2026-10-17T16:00:00Z");
  const old = new Date(now.getTime() - STALE_MS - 1000);
  const recent = new Date(now.getTime() - 1000);
  assert.equal(isStale(old, "2026-10-10", now), false);
  assert.equal(isStale(old, "2026-10-16", now), true);
  assert.equal(isStale(old, "2026-10-17", now), true);
  assert.equal(isStale(recent, "2026-10-17", now), false);
  assert.equal(isStale(old, "2026-10-20", now), true);
});

const food = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  image_url: null,
  price: null,
  has_nutrition_info: true,
  rounded_nutrition_info: { calories: 140, g_protein: 22, g_fat: "bad" },
  serving_size_info: { serving_size_amount: "4", serving_size_unit: "oz portion" },
  ingredients: "Chicken, Salt",
  icons: { food_icons: [{ name: "Halal", enabled: true }, { name: "Milk", enabled: false }] },
  ...extra,
});

test("parseDayItems groups items under section titles", () => {
  const sections = parseDayItems([
    { is_section_title: false, food: food(1, " Fries ") },
    { is_section_title: true, text: "Grill Lunch Specials", food: null },
    { is_section_title: false, food: food(2, "Burger") },
    { is_section_title: false, text: "blank", food: null },
    { is_section_title: true, text: "Empty Section", food: null },
  ]);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, null);
  assert.equal(sections[0].items[0].name, "Fries");
  assert.equal(sections[1].title, "Grill Lunch Specials");
  const burger = sections[1].items[0];
  assert.equal(burger.nutrition.calories, 140);
  assert.equal(burger.nutrition.g_fat, null);
  assert.equal(burger.servingSizeAmount, "4");
  assert.deepEqual(burger.icons, ["Halal"]);
  assert.deepEqual(parseDayItems([]), []);
});

test("parseLocations reads hours and flags dining halls", () => {
  const [loc] = parseLocations([
    {
      id: 6333,
      slug: "east-side-dining",
      name: "East Side Dine-In",
      active_menu_types: [{ id: 2374, slug: "dine-in-grill", name: "Grill" }],
      mon_enabled: true,
      mon_start: "07:00:00",
      mon_end: "21:00:00",
    },
  ]);
  assert.equal(loc.isDiningHall, true);
  assert.equal(loc.hours[1].enabled, true);
  assert.equal(loc.hours[0].enabled, false);
  assert.deepEqual(loc.menuTypes, [{ id: 2374, slug: "dine-in-grill", name: "Grill" }]);
});
