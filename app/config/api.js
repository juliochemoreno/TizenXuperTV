window.XUPERTV_API = {
  enabled: true,
  mode: "portal",                    // on Tizen we use portal / direct mode
  serviceId: "",                     // no local webOS service
  refresh: false,                    // use instant portal.js snapshot on startup; fetch on demand
  devServiceUrl: "",                 // empty → do not try localhost service
  useBundledCatalog: true,
  baseUrl: "",
  catalogPath: "",
  detailPath: "",
  searchPath: "",
  headers: {},
  imageBaseUrl: "",
  timeoutMs: 20000,
  session: {
    userId: "",
    userToken: "",
    portalCode: "",
    homePageCode: "",
    version: "4.34.4"
  }
};
