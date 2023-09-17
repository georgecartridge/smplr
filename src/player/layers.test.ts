import { findSamplesInLayer, spreadRegions } from "./layers";
import { SampleLayer, SampleRegion } from "./types";

describe("findSamplesInLayer", () => {
  it("find by rangeMidi", () => {
    const layer: SampleLayer = {
      regions: [
        { sampleName: "a", midiPitch: 60, midiLow: 60, midiHigh: 75 },
        { sampleName: "b", midiPitch: 75, midiLow: 70, midiHigh: 80 },
      ],
      sample: {},
    };

    expect(findSamplesInLayer(layer, { note: 60 })).toEqual([
      { name: "a", detune: 0, note: 60 },
    ]);
    expect(findSamplesInLayer(layer, { note: 62 })).toEqual([
      { name: "a", detune: 200, note: 62 },
    ]);
    expect(findSamplesInLayer(layer, { note: 72 })).toEqual([
      { detune: 1200, name: "a", note: 72 },
      { detune: -300, name: "b", note: 72 },
    ]);
    expect(findSamplesInLayer(layer, { note: 80 })).toEqual([
      { detune: 500, name: "b", note: 80 },
    ]);
  });

  it("find by rangeVol", () => {
    const layer: SampleLayer = {
      regions: [
        { sampleName: "a", midiPitch: 60, velLow: 0, velHigh: 64 },
        { sampleName: "b", midiPitch: 60, velLow: 64, velHigh: 127 },
      ],
      sample: {},
    };

    expect(findSamplesInLayer(layer, { note: 60, velocity: 0 })).toEqual([
      { name: "a", detune: 0, note: 60, velocity: 0 },
    ]);
    expect(findSamplesInLayer(layer, { note: 60, velocity: 64 })).toEqual([
      { detune: 0, name: "a", note: 60, velocity: 64 },
      { detune: 0, name: "b", note: 60, velocity: 64 },
    ]);
    expect(findSamplesInLayer(layer, { note: 60, velocity: 127 })).toEqual([
      { name: "b", detune: 0, note: 60, velocity: 127 },
    ]);
  });

  it("find by rangeMidi and rangeVol", () => {
    const layer: SampleLayer = {
      regions: [
        {
          sampleName: "a",
          midiPitch: 60,
          midiLow: 60,
          midiHigh: 75,
          velLow: 0,
          velHigh: 64,
        },
        {
          sampleName: "b",
          midiPitch: 75,
          midiLow: 70,
          midiHigh: 80,
          velLow: 64,
          velHigh: 127,
        },
      ],
      sample: {},
    };

    expect(findSamplesInLayer(layer, { note: 60, velocity: 0 })).toEqual([
      { name: "a", detune: 0, note: 60, velocity: 0 },
    ]);
    expect(findSamplesInLayer(layer, { note: 62, velocity: 64 })).toEqual([
      { name: "a", detune: 200, note: 62, velocity: 64 },
    ]);
    expect(findSamplesInLayer(layer, { note: 72, velocity: 64 })).toEqual([
      { detune: 1200, name: "a", note: 72, velocity: 64 },
      { detune: -300, name: "b", note: 72, velocity: 64 },
    ]);
    expect(findSamplesInLayer(layer, { note: 72, velocity: 127 })).toEqual([
      { detune: -300, name: "b", note: 72, velocity: 127 },
    ]);
    expect(findSamplesInLayer(layer, { note: 80, velocity: 127 })).toEqual([
      { detune: 500, name: "b", note: 80, velocity: 127 },
    ]);
  });

  it("applies offsets", () => {
    const layer: SampleLayer = {
      regions: [
        {
          sampleName: "a",
          midiPitch: 60,
          offsetDetune: 10,
          offsetVol: -15,
        },
      ],
      sample: {},
    };
    expect(findSamplesInLayer(layer, { note: 65, velocity: 100 })).toEqual([
      { detune: 510, name: "a", note: 65, velocity: 85 },
    ]);
  });

  it("applies sample options", () => {
    const layer: SampleLayer = {
      regions: [
        {
          sampleName: "a",
          midiPitch: 60,
          sample: { loopStart: 10, loopEnd: 20 },
        },
        {
          sampleName: "b",
          midiPitch: 62,
          sample: { loopStart: 10, loop: false },
        },
      ],
      sample: { loopStart: 5, loopEnd: 25, loop: true },
    };
    expect(findSamplesInLayer(layer, { note: 65 })).toEqual([
      {
        name: "a",
        note: 65,
        detune: 500,
        loop: true,
        loopEnd: 20,
        loopStart: 10,
      },
      {
        name: "b",
        note: 65,
        detune: 300,
        loop: false,
        loopEnd: 25,
        loopStart: 10,
      },
    ]);
  });
});

describe("spreadRegions", () => {
  it("should correctly spread a single region", () => {
    const regions: SampleRegion[] = [
      {
        sampleName: "A",
        midiPitch: 64,
      },
    ];
    expect(spreadRegions(regions)).toEqual([
      { midiLow: 0, midiHigh: 127, midiPitch: 64, sampleName: "A" },
    ]);
  });

  it("should correctly spread two regions", () => {
    const regions: SampleRegion[] = [
      { sampleName: "A", midiPitch: 32 },
      { sampleName: "B", midiPitch: 96 },
    ];
    expect(spreadRegions(regions)).toEqual([
      { midiLow: 0, midiHigh: 64, midiPitch: 32, sampleName: "A" },
      { midiLow: 65, midiHigh: 127, midiPitch: 96, sampleName: "B" },
    ]);
  });

  it("should correctly spread three regions", () => {
    const regions: SampleRegion[] = [
      { sampleName: "A", midiPitch: 10 },
      { sampleName: "B", midiPitch: 80 },
      { sampleName: "C", midiPitch: 96 },
    ];
    expect(spreadRegions(regions)).toEqual([
      { midiLow: 0, midiHigh: 45, midiPitch: 10, sampleName: "A" },
      { midiLow: 46, midiHigh: 88, midiPitch: 80, sampleName: "B" },
      { midiLow: 89, midiHigh: 127, midiPitch: 96, sampleName: "C" },
    ]);
  });

  it("should handle empty regions", () => {
    const regions: SampleRegion[] = [];
    expect(spreadRegions(regions)).toEqual([]);
  });

  // You can add more test cases based on different scenarios.
});