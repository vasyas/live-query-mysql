import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"
import {mockContext, mockSession, testData} from "./mockSession"
import {setLiveQueryOptions} from "../src/options"

describe("lower case conversion", () => {
  before(() => {
    setLiveQueryOptions({
      forceLowerCase: true,
    })
  })

  after(() => {
    setLiveQueryOptions({
      forceLowerCase: false,
    })
  })

  it("table name", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) => {
      await ctx.sql("select * from Test")
    })

    await liveQuery.subscribeSession(mockSession, {}, 1, mockContext)
    assert.equal(1, testData.length)

    await sql("insert into test values()")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("single field constant", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) => ctx.sql("select * from test where id = 1"))

    await liveQuery.subscribeSession(mockSession, {}, 1, mockContext)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this one is ignored
    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)
  })
})
