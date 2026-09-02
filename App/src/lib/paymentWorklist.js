export function mapPaymentWorklistRecords(result) {
  return (result.records || []).map((record) => {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Yangon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date(record.occurredAt))
      .replace(/\//g, "-");
    return {
      ...record,
      method: record.method || "",
      date,
      isoDate: date,
      dateLabel:
        record.status === "Paid"
          ? "Paid"
          : record.status === "Partial"
            ? "Partial"
            : "Due",
      sortAt: new Date(record.occurredAt).getTime(),
    };
  });
}
