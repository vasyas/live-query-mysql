export function setLiveQueryOptions(o: LiveQueryOptions) {
  options = o
}

export let options: LiveQueryOptions = {
  forceLowerCase: false,
}

export type LiveQueryOptions = {
  forceLowerCase: boolean
}

export function lowerCaseTableName(s: string) {
  if (options.forceLowerCase) return s.toLowerCase()
  return s
}
