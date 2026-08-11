import { describe, expect, it } from "vitest";
import { edaxLevel } from "./difficulty";

describe("edaxLevel", () => {
  it("maps easy to level 1", () => {
    expect(edaxLevel("easy")).toBe(1);
  });

  it("maps normal to level 5", () => {
    expect(edaxLevel("normal")).toBe(5);
  });

  it("maps hard to level 11", () => {
    expect(edaxLevel("hard")).toBe(11);
  });
});
