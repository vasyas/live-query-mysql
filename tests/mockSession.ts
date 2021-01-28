import {Context, sql} from "./db"

export let testData = []

export const mockSession = {
  send(type, messageId, topicName, filter, data) {
    // console.log("G: ", {type, topicName, filter, data})
    testData.push(data)
  },

  createContext() {
    return mockContext
  },
}

export const mockContext: Context = {sql}

beforeEach(() => {
  testData.length = 0
  testData.push("initial")
})
