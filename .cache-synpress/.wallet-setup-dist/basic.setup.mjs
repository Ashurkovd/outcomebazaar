/// ######## BANNER WITH FIXES START ########

// ---- DYNAMIC_REQUIRE_FS_FIX ----
var require = (await import("node:module")).createRequire(import.meta.url);
var __filename = (await import("node:url")).fileURLToPath(import.meta.url);
var __dirname = (await import("node:path")).dirname(__filename);
// ---- DYNAMIC_REQUIRE_FS_FIX ----

/// ######## BANNER WITH FIXES END ########

var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// test/wallet-setup/basic.setup.js
var require_basic_setup = __commonJS({
  "test/wallet-setup/basic.setup.js"(exports, module) {
    var { defineWalletSetup } = __require("@synthetixio/synpress");
    var SEED_PHRASE = "test test test test test test test test test test test junk";
    var PASSWORD = "TestPassword123!";
    module.exports = defineWalletSetup(PASSWORD, async (context, walletPage) => {
      await walletPage.locator("#onboarding__terms-checkbox").click();
      await walletPage.getByRole("button", { name: "Import an existing wallet" }).click();
      await walletPage.getByRole("button", { name: "I agree" }).click();
      const seedInputs = await walletPage.locator('[data-testid="import-srp__srp-word"]').all();
      const seedWords = SEED_PHRASE.split(" ");
      for (let i = 0; i < seedWords.length; i++) {
        await seedInputs[i].fill(seedWords[i]);
      }
      await walletPage.getByRole("button", { name: "Confirm Secret Recovery Phrase" }).click();
      await walletPage.locator('[data-testid="create-password-new"]').fill(PASSWORD);
      await walletPage.locator('[data-testid="create-password-confirm"]').fill(PASSWORD);
      await walletPage.locator('[data-testid="create-password-terms"]').click();
      await walletPage.getByRole("button", { name: "Create" }).click();
      await walletPage.getByRole("button", { name: "Got it" }).click();
      await walletPage.getByRole("button", { name: "Next" }).click();
      await walletPage.getByRole("button", { name: "Done" }).click();
    });
  }
});
export default require_basic_setup();
