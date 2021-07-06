import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"
import {mockContext, mockSession, testData} from "./mockSession"

describe("limit/offset track", () => {
  it("ignored", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id = 1 limit 1 offset 0")
    )

    await liveQuery.subscribeSession(mockSession, {}, "1", mockContext)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this one is ignored
    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)
  })

  it("offset with params", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test limit ? offset ?", [1, 2])
    )

    await liveQuery.subscribeSession(mockSession, {}, "1", mockContext)
    assert.equal(1, testData.length)

    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(2, testData.length)

    // this should be tracked
    await sql("update Test set id = 10 where id = 1")
    await adelay(10)
    assert.equal(3, testData.length)
  })
})
