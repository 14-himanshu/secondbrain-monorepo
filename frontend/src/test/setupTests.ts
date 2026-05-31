// Polyfill ReactDOM.render using createRoot for React 19 compatibility in tests
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

// If older libs call ReactDOM.render, forward to createRoot
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof (ReactDOM as any).render !== 'function') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (ReactDOM as any).render = (element: unknown, container: Element | DocumentFragment) => {
    // reuse root if already created on container
    const anyContainer = container as any;
    if (!anyContainer.__vitest_root) {
      anyContainer.__vitest_root = createRoot(container as Element);
    }
    anyContainer.__vitest_root.render(element);
  };
}
