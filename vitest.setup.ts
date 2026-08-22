import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when vitest runs with `globals: true`, which
// this project deliberately does not. Without this, every render in a file stays
// mounted for the rest of it, so a later getBy* silently resolves against an
// earlier test's DOM — passing or failing for reasons that have nothing to do
// with the test being read.
afterEach(cleanup);

// jsdom doesn't implement the Pointer Events capture APIs or scrollIntoView, which Radix UI's
// Select (and other popover-based components) call internally. Without these no-op polyfills,
// interacting with a Select in tests throws "target.hasPointerCapture is not a function".
if (typeof window !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
