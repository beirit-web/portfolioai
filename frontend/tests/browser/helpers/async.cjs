function gate() {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  return { ready, release };
}

module.exports = { gate };
