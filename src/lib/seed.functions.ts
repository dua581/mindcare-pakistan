import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "user" | "doctor" | "admin";

const DEMO_ACCOUNTS: { email: string; password: string; role: AppRole; full_name: string }[] = [
  { email: "user@mindcare.pk", password: "demo123", role: "user", full_name: "Ayesha Khan" },
  { email: "doctor@mindcare.pk", password: "demo123", role: "doctor", full_name: "Dr. Imran Siddiqui" },
  { email: "admin@mindcare.pk", password: "demo123", role: "admin", full_name: "Sana Admin" },
];

const FAKE_USERS = [
  "Hamza Ali", "Fatima Sheikh", "Zainab Raza", "Ahmed Tariq", "Bilal Malik",
  "Mariam Iqbal", "Usman Javed", "Kiran Butt", "Saad Hussain", "Noor Fatima",
];

const UNIS = ["LUMS", "NUST", "FAST", "IBA Karachi", "UET Lahore", "Aga Khan U", "Quaid-i-Azam U"];

const CHAT_SEED: { role: "user" | "assistant"; content: string }[] = [
  { role: "user", content: "Aaj kal padhai mein focus nahi ho raha. Bahut overwhelmed feel ho raha hai." },
  { role: "assistant", content: "Main samajh sakta hoon, exams ka pressure bohat heavy hota hai 💙. Chalo ek choti si exercise karte hain — 4-7-8 breathing: 4 seconds inhale, 7 hold, 8 exhale. 3 baar repeat karein." },
  { role: "user", content: "Theek hai kar liya. Thoda relax laga." },
  { role: "assistant", content: "Bohat acha! 🌿 Aaj raat sone se pehle 3 cheezein likho jo aaj acchi hui — chahe choti hi kyun na ho. Gratitude se mood up hota hai." },
  { role: "user", content: "Sometimes I feel like nobody understands me." },
  { role: "assistant", content: "Yeh feeling bohat tough hoti hai, lekin aap akele nahi hain. Main yahan hoon. Agar kabhi serious lage to please Umang Helpline 0317-4288665 par baat karein — woh trained counselors hain jo Urdu mein support dete hain." },
];

async function ensureAccount(email: string, password: string, role: AppRole, fullName: string) {
  // Try sign-in first to find existing
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  let userId = existing.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user!.id;
  } else {
    // ensure password set
    await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }
  // Ensure profile row
  await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: fullName });
  // Ensure role row
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r) => r.role === role)) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  }
  return userId;
}

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  // 1) Demo accounts
  const ids: Record<AppRole, string> = { user: "", doctor: "", admin: "" };
  for (const a of DEMO_ACCOUNTS) {
    ids[a.role] = await ensureAccount(a.email, a.password, a.role, a.full_name);
  }

  // 2) 10 fake user profiles (no auth) for admin to view
  const { data: existingProfiles } = await supabaseAdmin
    .from("profiles").select("id, full_name");
  const existingNames = new Set((existingProfiles ?? []).map((p) => p.full_name));

  const fakeUserIds: string[] = [];
  for (const name of FAKE_USERS) {
    let pid: string | undefined = (existingProfiles ?? []).find((p) => p.full_name === name)?.id;
    if (!pid) {
      pid = crypto.randomUUID();
      await supabaseAdmin.from("profiles").insert({
        id: pid, full_name: name,
        age: 18 + Math.floor(Math.random() * 10),
        university: UNIS[Math.floor(Math.random() * UNIS.length)],
      });
      await supabaseAdmin.from("user_roles").insert({ user_id: pid, role: "user" });
    }
    fakeUserIds.push(pid!);
  }
  void existingNames;

  // 3) Mood logs for all users (including demo user) - last 14 days
  const moodTargets = [ids.user, ...fakeUserIds];
  for (const uid of moodTargets) {
    const { count } = await supabaseAdmin
      .from("mood_logs").select("id", { count: "exact", head: true }).eq("user_id", uid);
    if ((count ?? 0) >= 7) continue;
    const rows = [];
    for (let d = 13; d >= 0; d--) {
      if (Math.random() < 0.25) continue; // skip some days
      const created = new Date(Date.now() - d * 86400000 - Math.random() * 6 * 3600000);
      const base = 4 + Math.floor(Math.random() * 6);
      const mood = Math.max(1, Math.min(10, base));
      rows.push({
        user_id: uid, mood, emoji: ["😢","😟","😕","😐","🙂","😊","😄","😁","🤩","🥳"][mood - 1],
        note: ["Felt good after a walk","Exam stress","Slept well","Family time was nice","Tired","Productive day",""][Math.floor(Math.random() * 7)],
        created_at: created.toISOString(),
      });
    }
    if (rows.length) await supabaseAdmin.from("mood_logs").insert(rows);
  }

  // Flag 2 fake users as at-risk
  await supabaseAdmin.from("profiles").update({ flagged: true }).in("id", fakeUserIds.slice(0, 2));

  // 4) Doctor → 5 patients (demo user + first 4 fake)
  const patientIds = [ids.user, ...fakeUserIds.slice(0, 4)];
  for (let i = 0; i < patientIds.length; i++) {
    const pid = patientIds[i];
    const { data: existing } = await supabaseAdmin
      .from("patients").select("id")
      .eq("doctor_id", ids.doctor).eq("patient_id", pid).maybeSingle();
    if (existing) continue;
    await supabaseAdmin.from("patients").insert({
      doctor_id: ids.doctor, patient_id: pid,
      last_session_at: new Date(Date.now() - (i + 1) * 3 * 86400000).toISOString(),
      next_appointment: new Date(Date.now() + (i + 2) * 86400000).toISOString(),
    });
  }

  // 5) Session notes for each patient
  const NOTE_TEMPLATES = [
    "Patient reports improved sleep this week. Continuing CBT exercises.",
    "Discussed exam anxiety. Introduced grounding techniques (5-4-3-2-1).",
    "Mood improving steadily. Recommended journaling 3x/week.",
    "Family stress mentioned. Will follow up next session.",
    "Significant progress on social anxiety. Reduced session frequency to bi-weekly.",
  ];
  for (let i = 0; i < patientIds.length; i++) {
    const pid = patientIds[i];
    const { count } = await supabaseAdmin
      .from("session_notes").select("id", { count: "exact", head: true })
      .eq("doctor_id", ids.doctor).eq("patient_id", pid);
    if ((count ?? 0) > 0) continue;
    await supabaseAdmin.from("session_notes").insert({
      doctor_id: ids.doctor, patient_id: pid, note: NOTE_TEMPLATES[i % NOTE_TEMPLATES.length],
    });
  }

  // 6) Chat history for demo user
  const { count: chatCount } = await supabaseAdmin
    .from("chat_history").select("id", { count: "exact", head: true }).eq("user_id", ids.user);
  if ((chatCount ?? 0) === 0) {
    await supabaseAdmin.from("chat_history").insert(
      CHAT_SEED.map((m, i) => ({
        user_id: ids.user, role: m.role, content: m.content,
        created_at: new Date(Date.now() - (CHAT_SEED.length - i) * 3600000).toISOString(),
      })),
    );
  }

  // 7) An announcement
  const { count: annCount } = await supabaseAdmin
    .from("announcements").select("id", { count: "exact", head: true });
  if ((annCount ?? 0) === 0) {
    await supabaseAdmin.from("announcements").insert({
      author_id: ids.admin,
      title: "Welcome to MindCare Pakistan 💙",
      body: "Free wellness webinar this Friday at 6pm — 'Stress in Pakistani Universities'. RSVP via your dashboard.",
    });
  }

  return { ok: true, accounts: DEMO_ACCOUNTS.map((a) => ({ email: a.email, role: a.role })) };
});
