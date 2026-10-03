/* Minimal Chrome DevTools Protocol client used by the fidelity scripts.
   No dependency: Node 22 ships a global WebSocket, Chrome ships the protocol. */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH.");
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function debuggerUrl(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error("Chrome did not expose a debugger port");
    await sleep(150);
  }
}

class Session {
  #ws;
  #id = 0;
  #pending = new Map();
  #listeners = new Set();

  constructor(ws) {
    this.#ws = ws;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const entry = this.#pending.get(msg.id);
        if (!entry) return;
        this.#pending.delete(msg.id);
        msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
      } else {
        for (const fn of this.#listeners) fn(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  close() {
    this.#ws.close();
  }
}

/** Launches headless Chrome, hands a Session to `fn`, always cleans up. */
export async function withChrome(fn) {
  const port = 9000 + Math.floor(Math.random() * 900);
  const profile = await mkdtemp(join(tmpdir(), "nova-cdp-"));
  const child = spawn(
    chromePath(),
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    const ws = new WebSocket(await debuggerUrl(port));
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    const session = new Session(ws);
    try {
      return await fn(session);
    } finally {
      session.close();
    }
  } finally {
    child.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

/** Opens `url` at `width`, collects console errors, runs `fn({ eval, sessionId, errors })`. */
export async function withPage(session, url, width, fn, { height = 900, settle = 400 } = {}) {
  const { targetId } = await session.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await session.send("Target.attachToTarget", { targetId, flatten: true });
  const errors = [];
  const off = session.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" "));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    }
  });
  try {
    await session.send("Runtime.enable", {}, sessionId);
    await session.send("Page.enable", {}, sessionId);
    await session.send("Emulation.setDeviceMetricsOverride",
      { width, height, deviceScaleFactor: 1, mobile: width < 769 }, sessionId);

    const loaded = new Promise((resolve) => {
      const offLoad = session.on((msg) => {
        if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
          offLoad();
          resolve();
        }
      });
    });
    await session.send("Page.navigate", { url }, sessionId);
    await Promise.race([loaded, sleep(15000)]);
    await sleep(settle);

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await session.send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    return await fn({ evaluate, sessionId, errors });
  } finally {
    off();
    await session.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}
