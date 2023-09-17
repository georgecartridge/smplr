import { SampleLayer, SampleRegion } from "./player/types";

type Token =
  | { type: "unknown"; value: string }
  | { type: "mode"; value: string }
  | { type: "prop:num"; key: string; value: number }
  | { type: "prop:num_arr"; key: string; value: [number, number] }
  | { type: "prop:str"; key: string; value: string };

const MODE_REGEX = /^<([^>]+)>$/;
const PROP_NUM_REGEX = /^([^=]+)=([-\.\d]+)$/;
const PROP_STR_REGEX = /^([^=]+)=(.+)$/;
const PROP_NUM_ARR_REGEX = /^([^=]+)_(\d+)=(\d+)$/;
function parseToken(line: string): Token | undefined {
  line = line.trim();
  if (line === "") return undefined;
  if (line.startsWith("//")) return undefined;

  const modeMatch = line.match(MODE_REGEX);
  if (modeMatch) return { type: "mode", value: modeMatch[1] };

  const propNumArrMatch = line.match(PROP_NUM_ARR_REGEX);
  if (propNumArrMatch)
    return {
      type: "prop:num_arr",
      key: propNumArrMatch[1],
      value: [Number(propNumArrMatch[2]), Number(propNumArrMatch[3])],
    };

  const propNumMatch = line.match(PROP_NUM_REGEX);
  if (propNumMatch)
    return {
      type: "prop:num",
      key: propNumMatch[1],
      value: Number(propNumMatch[2]),
    };

  const propStrMatch = line.match(PROP_STR_REGEX);
  if (propStrMatch)
    return {
      type: "prop:str",
      key: propStrMatch[1],
      value: propStrMatch[2],
    };

  return { type: "unknown", value: line };
}

export function sfzToLayer(sfz: string, layer: SampleLayer) {
  let mode = "global";
  const tokens = sfz
    .split("\n")
    .map(parseToken)
    .filter((x): x is Token => !!x);

  const scope = new Scope();
  let errors: (string | undefined)[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "mode":
        errors.push(scope.closeScope(mode, layer));
        mode = token.value;

        break;

      case "prop:num":
      case "prop:str":
      case "prop:num_arr":
        scope.push(token.key, token.value);
        break;

      case "unknown":
        console.warn("Unknown SFZ token", token.value);
        break;
    }
  }
  closeScope(mode, scope, layer);

  return errors.filter((x) => !!x) as string[];

  function closeScope(mode: string, scope: Scope, layer: SampleLayer) {}
}

type DestKey = keyof SampleRegion | "ignore";

class Scope {
  values: Record<string, any> = {};
  global: Partial<SampleRegion> = {};
  group: Partial<SampleRegion> = {};

  closeScope(mode: string, layer: SampleLayer) {
    if (mode === "global") {
      // Save global properties
      this.#closeRegion(this.global as SampleRegion);
    } else if (mode === "group") {
      // Save group properties
      this.group = this.#closeRegion({} as SampleRegion);
    } else if (mode === "region") {
      const region = this.#closeRegion({
        sampleName: "",
        midiPitch: -1,
        ...this.global,
        ...this.group,
      });

      if (region.sampleName === "") {
        return "Missing sample name";
      }
      if (region.midiPitch === -1) {
        // By default, if pitch_keycenter is not specified, the sampler will often use the value
        // of lokey as the pitch key center.
        if (region.midiLow !== undefined) {
          region.midiPitch = region.midiLow;
        } else {
          return "Missing pitch_keycenter";
        }
      }

      // Set default sequence number
      if (region.seqLength && region.seqPosition === undefined) {
        region.seqPosition = 1;
      }

      // Move amp_release to sample options
      if (region.ampRelease) {
        region.sample = { decayTime: region.ampRelease };
        delete region.ampRelease;
      }
      layer.regions.push(region);
    }
  }

  #closeRegion(region: SampleRegion) {
    this.popStr("sample", region, "sampleName");
    this.popNum("pitch_keycenter", region, "midiPitch");

    this.popNum("lokey", region, "midiLow");
    this.popNum("hikey", region, "midiHigh");

    this.popNum("lovel", region, "velLow");
    this.popNum("hivel", region, "velHigh");
    this.popNum("pitch_keytrack", region, "ignore");
    this.popNum("bend_up", region, "bendUp");
    this.popNum("bend_down", region, "bendDown");
    this.popNumArr("amp_velcurve", region, "ampVelCurve");
    this.popNum("seq_length", region, "seqLength");
    this.popNum("seq_position", region, "seqPosition");
    this.popNum("ampeg_release", region, "ampRelease");
    this.popNum("group", region, "group");
    this.popNum("off_by", region, "groupOffBy");

    const remainingKeys = Object.keys(this.values);
    if (remainingKeys.length) {
      console.warn("Remaining keys in scope: ", remainingKeys);
    }
    this.values = {};
    return region;
  }

  get empty() {
    return Object.keys(this.values).length === 0;
  }

  get keys() {
    return Object.keys(this.values);
  }

  push(key: string, value: any) {
    this.values[key] = value;
  }

  popNum(key: string, dest: Record<string, any>, destKey: DestKey): boolean {
    if (typeof this.values[key] !== "number") return false;
    dest[destKey] = this.values[key];
    delete this.values[key];
    return true;
  }

  popStr(key: string, dest: Record<string, any>, destKey: DestKey): boolean {
    if (typeof this.values[key] !== "string") return false;
    dest[destKey] = this.values[key];
    delete this.values[key];
    return true;
  }

  popNumArr(key: string, dest: Record<string, any>, destKey: DestKey): boolean {
    if (!Array.isArray(this.values[key])) return false;
    dest[destKey] = this.values[key];
    delete this.values[key];
    return true;
  }
}