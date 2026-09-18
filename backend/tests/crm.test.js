const { setupDb, teardownDb, login, createMember, createUserWithRole } = require("./helpers");
const env = require("../src/config/env");
const { processDueReminders } = require("../src/jobs/activityReminders");
const Notification = require("../src/models/Notification");

beforeAll(setupDb);
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("manufacturer leads", () => {
  it("blocks members from listing leads", async () => {
    await createMember({ email: "crm-member@example.com" });
    const { agent } = await login("crm-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/leads"));
    expect(res.status).toBe(403);
  });

  it("creates a manufacturer lead with a primary contact and converts it", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const lead = await csrf(agent.post("/api/v1/leads")).send({
      name: "Ningbo Textile Co",
      country: "China",
      city: "Ningbo",
      products: "Cotton apparel",
      source: "trade_show",
      primaryContact: {
        name: "Li Wei",
        role: "Export manager",
        email: "li.wei@ningbo-textile.example.com",
        phone: "+86 13800000000",
      },
    });
    expect(lead.status).toBe(201);
    expect(lead.body.data.lead.contacts).toHaveLength(1);
    expect(lead.body.data.lead.primaryContact.name).toBe("Li Wei");
    const leadId = lead.body.data.lead.id;

    const contacted = await csrf(agent.patch(`/api/v1/leads/${leadId}`)).send({ stage: "contacted" });
    expect(contacted.status).toBe(200);
    expect(contacted.body.data.lead.stage).toBe("contacted");

    const converted = await csrf(agent.post(`/api/v1/leads/${leadId}/convert`)).send({
      stage: "converted",
      statusNote: "Factory passed capability check",
    });
    expect(converted.status).toBe(200);
    expect(converted.body.data.lead.stage).toBe("converted");
    expect(converted.body.data.lead.convertedAt).toBeTruthy();

    const history = await csrf(agent.get("/api/v1/activities").query({ leadId, type: "status_change" }));
    expect(history.status).toBe(200);
    expect(history.body.data.items.some((item) => item.body === "Factory passed capability check")).toBe(true);
  });

  it("marks a lead disqualified with a status note", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const lead = await csrf(agent.post("/api/v1/leads")).send({ name: "Fail Mill", country: "India" });
    expect(lead.status).toBe(201);
    const leadId = lead.body.data.lead.id;
    const updated = await csrf(agent.patch(`/api/v1/leads/${leadId}`)).send({
      stage: "disqualified",
      statusNote: "MOQ too high for our buyers",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.lead.stage).toBe("disqualified");
    expect(updated.body.data.lead.disqualifiedReason).toBe("MOQ too high for our buyers");
    const history = await csrf(agent.get("/api/v1/activities").query({ leadId, type: "status_change" }));
    expect(history.status).toBe(200);
    expect(history.body.data.items.some((item) => item.body === "MOQ too high for our buyers")).toBe(true);
  });

  it("lists calendar items for appointments and sends reminders", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);
    const lead = await csrf(agent.post("/api/v1/leads")).send({
      name: "Calendar Mill",
      country: "India",
    });
    expect(lead.status).toBe(201);
    const leadId = lead.body.data.lead.id;
    const ownerId = lead.body.data.lead.ownerId;

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const meeting = await csrf(agent.post("/api/v1/activities")).send({
      type: "meeting",
      title: "Factory intro call",
      leadId,
      startsAt: start.toISOString(),
      reminderAt: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    expect(meeting.status).toBe(201);

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const calendar = await csrf(agent.get("/api/v1/calendar").query({ from, to }));
    expect(calendar.status).toBe(200);
    expect(calendar.body.data.items.some((item) => item.title === "Factory intro call")).toBe(true);

    const sent = await processDueReminders();
    expect(sent).toBeGreaterThan(0);
    const note = await Notification.findOne({ userId: ownerId, type: "crm_reminder" });
    expect(note).toBeTruthy();
  });

  it("lets a sales role see team activities, not only their own assignments", async () => {
    await createUserWithRole("sales", { name: "Sales One", email: "sales-one@example.com" });
    const salesTwo = await createUserWithRole("sales", { name: "Sales Two", email: "sales-two@example.com" });
    await createMember({ email: "crm-activity-member@example.com" });

    const { agent: one } = await login("sales-one@example.com", "Password123");
    const lead = await csrf(one.post("/api/v1/leads")).send({ name: "Shared Factory", country: "Vietnam" });
    expect(lead.status).toBe(201);
    const leadId = lead.body.data.lead.id;
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const reminder = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    const appointment = await csrf(one.post("/api/v1/activities")).send({
      type: "appointment",
      title: "Team factory visit",
      leadId,
      startsAt: start,
      reminderAt: reminder,
    });
    const meeting = await csrf(one.post("/api/v1/activities")).send({
      type: "meeting",
      title: "Team capability review",
      leadId,
      startsAt: start,
    });
    const task = await csrf(one.post("/api/v1/activities")).send({
      type: "task",
      title: "Collect GOTS cert",
      leadId,
      dueAt: due,
    });
    const followUp = await csrf(one.post("/api/v1/activities")).send({
      type: "follow_up",
      title: "Chase sample pack",
      leadId,
      dueAt: due,
      reminderAt: reminder,
    });
    expect(appointment.status).toBe(201);
    expect(meeting.status).toBe(201);
    expect(task.status).toBe(201);
    expect(followUp.status).toBe(201);

    const { agent: two } = await login("sales-two@example.com", "Password123");
    const appointments = await csrf(two.get("/api/v1/activities").query({ type: "appointment" }));
    const meetings = await csrf(two.get("/api/v1/activities").query({ type: "meeting" }));
    const tasks = await csrf(two.get("/api/v1/activities").query({ type: "task" }));
    const followUps = await csrf(two.get("/api/v1/activities").query({ type: "follow_up" }));
    const reminders = await csrf(two.get("/api/v1/activities").query({ hasReminder: true }));
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const calendar = await csrf(two.get("/api/v1/calendar").query({ from, to }));
    const mine = await csrf(two.get("/api/v1/activities").query({ assignedToId: String(salesTwo._id) }));

    expect(appointments.status).toBe(200);
    expect(meetings.status).toBe(200);
    expect(tasks.status).toBe(200);
    expect(followUps.status).toBe(200);
    expect(reminders.status).toBe(200);
    expect(calendar.status).toBe(200);
    expect(appointments.body.data.items.some((item) => item.title === "Team factory visit")).toBe(true);
    expect(meetings.body.data.items.some((item) => item.title === "Team capability review")).toBe(true);
    expect(tasks.body.data.items.some((item) => item.title === "Collect GOTS cert")).toBe(true);
    expect(followUps.body.data.items.some((item) => item.title === "Chase sample pack")).toBe(true);
    expect(reminders.body.data.items.some((item) => item.title === "Chase sample pack")).toBe(true);
    expect(calendar.body.data.items.some((item) => item.title === "Team factory visit")).toBe(true);
    expect(mine.body.data.items.some((item) => item.title === "Team factory visit")).toBe(false);

    const { agent: member } = await login("crm-activity-member@example.com", "Password123");
    const blocked = await csrf(member.get("/api/v1/activities"));
    expect(blocked.status).toBe(403);
  });
});
