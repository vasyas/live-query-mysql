import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"
import {mockSession, testData} from "./mockSession"

describe("simple track", () => {
  it("single table", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) => {
      await ctx.sql("select * from Test")
    })

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test values()")
    await adelay(10)
    assert.equal(2, testData.length)

    // this one is ignored
    await sql("insert into TestSub values()")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("multiple queries", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) => {
      await ctx.sql("select * from Test")
      await ctx.sql("select * from TestSub")
    })

    await liveQuery.subscribeSession(mockSession, {})
    await sql("insert into Test values()")
    await adelay(10)
    await sql("insert into TestSub values()")
    await adelay(10)
    assert.equal(3, testData.length)
  })

  it("joined tables", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) =>
      ctx.sql(`
        select *
        from TestSub
               join Test on Test.id = TestSub.testId
      `)
    )

    await liveQuery.subscribeSession(mockSession, {})
    await sql("insert into Test values()")
    await adelay(10)
    await sql("insert into TestSub values()")
    await adelay(10)
    assert.equal(3, testData.length)
  })

  it("different dmls", async () => {
    const liveQuery = new LiveQuery(async (_, ctx: Context) => {
      await ctx.sql("select * from Test")
    })

    await liveQuery.subscribeSession(mockSession, {})
    assert.equal(1, testData.length)

    await sql("insert into Test values()")
    await adelay(10)
    assert.equal(2, testData.length)

    await sql("update Test set id = id + 1")
    await adelay(10)
    assert.equal(3, testData.length)

    await sql("delete from Test")
    await adelay(10)
    assert.equal(4, testData.length)
  })
})
