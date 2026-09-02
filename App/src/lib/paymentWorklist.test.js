import { describe, expect, it } from "vitest";
import { mapPaymentWorklistRecords } from "./paymentWorklist";

describe("payment worklist mapping", () => {
  it("preserves worklist fields while adding the existing display values", () => {
    const [record] = mapPaymentWorklistRecords({
      records: [{
        id: "PAY-1",
        occurredAt: "2026-09-02T01:00:00.000Z",
        status: "Partial",
        method: "Cash",
        amount: 12_000,
      }],
    });

    expect(record).toMatchObject({
      id: "PAY-1",
      method: "Cash",
      status: "Partial",
      dateLabel: "Partial",
      isoDate: record.date,
    });
    expect(record.sortAt).toBe(new Date("2026-09-02T01:00:00.000Z").getTime());
  });
});
