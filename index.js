export default {
  async fetch(request, env) {
    // All of BorderHaul is static (HTML/CSS/JS + localStorage) — the Worker's
    // only job is to hand every request to the asset binding defined in
    // wrangler.toml. No custom routing logic needed.
    return env.ASSETS.fetch(request);
  },
};
