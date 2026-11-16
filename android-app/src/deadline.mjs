export function deadline(task, ms, message) {
  let timer;
  return Promise.race([Promise.resolve(task), new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  })]).finally(() => clearTimeout(timer));
}
