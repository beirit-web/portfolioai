import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("./cookies.js", import.meta.url), "utf8");

function getCookie(cookie, name = "csrftoken") {
  const readCookie = runInNewContext(`${source.replace(/^export /gm, "")}\ngetCookie`, { document: { cookie } });
  return readCookie(name);
}

test("CSRF tokens are found among other cookies with surrounding whitespace", () => {
  assert.equal(getCookie("sessionid=session;  csrftoken=csrf-token; language=de"), "csrf-token");
});

test("encoded cookie values are decoded without treating plus as a space", () => {
  assert.equal(getCookie("csrftoken=token%2Fwith%3Dsign%20and%2Bplus"), "token/with=sign and+plus");
  assert.equal(getCookie("language=de+DE", "language"), "de+DE");
});

test("missing and empty cookies return an empty string", () => {
  assert.equal(getCookie(""), "");
  assert.equal(getCookie("sessionid=session; language=de"), "");
  assert.equal(getCookie("csrftoken=; sessionid=session"), "");
});

test("cookie names must match exactly, including the equals separator", () => {
  assert.equal(getCookie("csrftoken_backup=wrong; oldcsrftoken=wrong; csrftoken=correct"), "correct");
  assert.equal(getCookie("csrftoken_backup=wrong; csrftoken"), "");
  assert.equal(getCookie("csrftoken=correct; token=other", "token"), "other");
});

test("values retain every equals sign after the cookie name", () => {
  assert.equal(getCookie("csrftoken=abc==; sessionid=session"), "abc==");
  assert.equal(getCookie("csrftoken=first=second%3Dthird"), "first=second=third");
});
