namespace microdata {
  export const runtime = new ui.UiRuntime(new ui.DisplayShieldFrameAdapter(), new AppAssets());
  runtime.push(new Home(runtime));
  runtime.start();
}
