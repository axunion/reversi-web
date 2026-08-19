import { describe, expect, it } from "vitest";
import { edaxLevel } from "./difficulty";

describe("edaxLevel", () => {
  it("maps easy to level 1", () => {
    expect(edaxLevel("easy")).toBe(1);
  });

  it("maps casual to level 2", () => {
    expect(edaxLevel("casual")).toBe(2);
  });

  it("maps normal to level 4", () => {
    expect(edaxLevel("normal")).toBe(4);
  });

  it("maps hard to level 7", () => {
    expect(edaxLevel("hard")).toBe(7);
  });

  it("maps expert to level 11", () => {
    expect(edaxLevel("expert")).toBe(11);
  });
});
