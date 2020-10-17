import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"

describe("simple", () => {
  let testData = []

  const mockSession = {
    send(type, messageId, topicName, filter, data) {
      testData.push(data)
    },
    createContext: () => ({sql})
  }

  it("track all records from table", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) => ctx.sql(`
      select * from Test
    `))

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test values()")
    await adelay(10)
    assert.equal(2, testData.length)
  })
})