import {assert} from "chai"
import {LiveQuery} from "../src/LiveQuery"
import {adelay, Context, sql} from "./db"
import {mockSession, testData, mockContext} from "./mockSession"

describe("params track", () => {
  it("in where", async () => {
    const liveQuery = new LiveQuery((_, ctx: Context) =>
      ctx.sql("select * from Test where id = ?", [2])
    )

    await liveQuery.subscribeSession(mockSession, {}, 1, mockContext)
    assert.equal(1, testData.length)

    // ignored
    await sql("insert into Test(id) values(1)")
    await adelay(10)
    assert.equal(1, testData.length)

    // triggered
    await sql("insert into Test(id) values(2)")
    await adelay(10)
    assert.equal(2, testData.length)

    // ignored
    await sql("insert into Test(id) values(3)")
    await adelay(10)
    assert.equal(2, testData.length)

    // triggered
    await sql("delete from Test")
    await adelay(10)
    assert.equal(3, testData.length)
  })
})
