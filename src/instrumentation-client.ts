performance.mark("app-init");

export function onRouterTransitionStart() {
  performance.mark(`nav-start-${Date.now()}`);
}
