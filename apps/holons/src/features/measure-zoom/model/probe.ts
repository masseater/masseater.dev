export type PageRecording = Readonly<{
  inputs: unknown[];
  frames: number[];
  entries: unknown[];
  commits: unknown[];
}>;

declare global {
  var holonsZoomBench: PageRecording;
}

export const startRecording = (): void => {
  globalThis.holonsZoomBench = { inputs: [], frames: [], entries: [], commits: [] };
};

export const recordInputs = (): void => {
  const { inputs } = globalThis.holonsZoomBench;
  const NO_DELTA = 0;
  const NO_ID = "";
  const idOf = (target: EventTarget | null): string => {
    if (target instanceof Element) {
      return target.id;
    }
    return NO_ID;
  };
  const record = (event: Readonly<MouseEvent>, deltaY: number): void => {
    inputs.push({
      type: event.type,
      target: idOf(event.target),
      deltaY,
      ctrlKey: event.ctrlKey,
      firedAt: event.timeStamp,
      handledAt: performance.now(),
    });
  };
  const options = { capture: true, passive: true };
  addEventListener(
    "wheel",
    (event) => {
      record(event, event.deltaY);
    },
    options,
  );
  for (const type of ["click", "dblclick"]) {
    addEventListener(
      type,
      (event) => {
        if (event instanceof MouseEvent) {
          record(event, NO_DELTA);
        }
      },
      options,
    );
  }
};

export const recordFrames = (): void => {
  const { frames } = globalThis.holonsZoomBench;
  const frame = (time: number): void => {
    frames.push(time);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

export const recordEntries = (): void => {
  const { entries } = globalThis.holonsZoomBench;
  const EVENT_THRESHOLD_MS = 16;
  const eventTiming: PerformanceObserverInit & Readonly<{ durationThreshold: number }> = {
    type: "event",
    buffered: true,
    durationThreshold: EVENT_THRESHOLD_MS,
  };
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const json: unknown = entry.toJSON();
      entries.push(json);
    }
  });
  observer.observe({ type: "long-animation-frame", buffered: true });
  observer.observe({ type: "longtask", buffered: true });
  observer.observe(eventTiming);
};

export const recordCommits = (): void => {
  const { commits } = globalThis.holonsZoomBench;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target instanceof Element) {
        commits.push({
          at: performance.now(),
          viewBox: record.target.getAttribute("viewBox") ?? "",
        });
      }
    }
  });
  observer.observe(document, { subtree: true, attributeFilter: ["viewBox"] });
};

export const readPage = (): unknown => {
  const NO_VIEWBOX = "";
  const viewBoxNow = (): string => {
    const map = document.querySelector("#map");
    if (map === null) {
      return NO_VIEWBOX;
    }
    return map.getAttribute("viewBox") ?? NO_VIEWBOX;
  };
  return {
    recording: globalThis.holonsZoomBench,
    now: performance.now(),
    viewBox: viewBoxNow(),
    devicePixelRatio,
  };
};
