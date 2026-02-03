let store = [];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listFiles() {
  await wait(150);
  return [...store];
}

export async function uploadFiles(files) {
  await wait(250);
  for (const f of files) {
    const base = f.name;
    let name = base;
    let i = 1;
    while (store.some((x) => x.name === name)) {
      name = `${base.replace(/(\.[^.]*)?$/, "")} (${i})${base.match(/\.[^.]*$/)?.[0] || ""}`;
      i += 1;
    }
    store.push({ name, size: f.size ?? 0 });
  }
  return { ok: true };
}

export async function deleteFile(name) {
  await wait(150);
  store = store.filter((x) => x.name !== name);
  return { ok: true };
}

export async function deleteFiles(names) {
  await wait(200);
  const set = new Set(names);
  store = store.filter((x) => !set.has(x.name));
  return { ok: true };
}
