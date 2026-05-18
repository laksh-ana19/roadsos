export function saveCache(key, data){
  localStorage.setItem(key, JSON.stringify({
    data,
    time: Date.now()
  }));
}

export function getCache(key){
  const raw = localStorage.getItem(key);
  if(!raw) return null;
  return JSON.parse(raw).data;
}