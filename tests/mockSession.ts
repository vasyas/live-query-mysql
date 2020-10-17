import {sql} from "./db"

export let testData = []

export const mockSession = {
  send(type, messageId, topicName, filter, data) {
    testData.push(data)
  },
  createContext: () => ({sql}),
}

beforeEach(() => {
  testData.length = 0
})
