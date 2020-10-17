import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {sql} from "./db"

describe("simple", () => {
  let testData = []

  const mockSession = {
    send(type, messageId, topicName, filter, data) {
      testData.push(data)
    },
    createContext: () => ({sql})
  }

  it("track all records from table", async () => {
    const liveQuery = new LiveQuery(async (_, ctx) => ctx.sql`
      select * from Test
    `.all())

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)
  })
})