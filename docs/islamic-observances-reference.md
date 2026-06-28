# Islamic Observances — Reference for QuestDay's Observance Calendar

> **Status:** Durable reference. Every ruling below is grounded in the Quran or the
> authenticated (sahih/hasan) Sunnah of the major collections (Bukhari, Muslim, Abu Dawud,
> Tirmidhi, Nasa'i, Ibn Majah, Ahmad), with collection + number + grade cited. Weak (da'if),
> fabricated (mawdu'), or scholarly-contested items are flagged **as such** and must never be
> surfaced as confirmed Sunnah. Where the four Sunni madhhabs agree, that consensus (ijma') is
> noted; where they differ, the difference is noted briefly and the **conservative** ruling is
> preferred.

## 1. About sources and dates

- **Grounding:** Quran references are by surah:ayah. Hadith are cited as *Collection Number — Grade*.
  Grades follow the gradings on Sunnah.com (Darussalam) and the standard verdicts of al-Tirmidhi,
  al-Albani, al-Arna'ut, Ibn Hajar, and the four-madhhab fiqh tradition, as recorded in the
  adversarial verification of each item.
- **Hijri dates are tabular / computed.** Every Hijri date the app shows is an *estimate* produced
  by on-device calendar math (no network — see CLAUDE.md). The **real** start of a lunar month is
  fixed by **local crescent moon-sighting** (or by completing the previous month at 30 days when the
  sky is obscured — Bukhari 1909 / Muslim 1081). The classical four-madhhab mainstream is sighting;
  a minority of bodies use astronomical calculation. **Never present a computed Gregorian/Hijri date
  as certain** — always show the sighting caveat, especially around Ramadan, the two Eids, Arafah,
  and Ashura.
- **Tone (gains-only):** voluntary worship is surfaced as a gentle, never-obligatory invitation;
  missing a voluntary fast or act carries **no** punishment, shame, or loss. The single hard
  exception to "encouragement only" is **fasting Ramadan, which is fard (obligatory)** — a pillar of
  Islam — and the **forbidden-fast guardrail in §2**, which is a hard block.
- **Person-level exemptions** (not day-level): menstruating/postpartum women do **not** fast and make
  up later; the sick and the traveller may break and make up (Quran 2:184–185). A calendar must never
  assert "everyone fasts today."

---

## 2. ⚠ NEVER fast on these days (hard guardrail)

These override every voluntary-fast schedule (Six of Shawwal, Mon/Thu, White Days, Dawud, etc.).
The first five are **forbidden (haram) by consensus** — an absolute block. The rest are
**conditional or disliked** — do not auto-suggest, but do not hard-block a fast that arrives for a
legitimate reason.

| # | Day / rule | Hijri | Ruling | Why | Authority |
|---|-----------|-------|--------|-----|-----------|
| 1 | **Eid al-Fitr** | **1 Shawwal** | **HARAM — absolute** | Day of breaking the fast; forbidden even for qada'/vow/kaffarah | Bukhari 1991–1992 / Muslim 1137 (Abu Sa'id) — Sahih + **ijma'** of all four madhhabs |
| 2 | **Eid al-Adha** (Yawm an-Nahr) | **10 Dhul-Hijjah** | **HARAM — absolute** | Day of Sacrifice; forbidden even for qada'/vow | Bukhari 1991–1992 / Muslim 1137 (Abu Sa'id) — Sahih + **ijma'** |
| 3 | **Day of Tashreeq** | **11 Dhul-Hijjah** | **HARAM** (non-pilgrim) | "Days of eating, drinking and remembrance of Allah" | Muslim 1141a (Nubayshah) — Sahih; Bukhari 1997–1998 |
| 4 | **Day of Tashreeq** | **12 Dhul-Hijjah** | **HARAM** (non-pilgrim) | as above | Muslim 1141a — Sahih |
| 5 | **Day of Tashreeq** | **13 Dhul-Hijjah** | **HARAM** (non-pilgrim) | as above. **The monthly White-Day 13th is suppressed here** — fast 14 + 15 only | Muslim 1141a — Sahih |
| 6 | **Day of Doubt** (Yawm al-Shakk) | **30 Sha'ban** *(only when the Ramadan crescent was not confirmed)* | Forbidden **as a precautionary/Ramadan fast** (by the **jumhur**, not full ijma') | "Whoever fasts the day of doubt has disobeyed Abu al-Qasim ﷺ"; "Do not precede Ramadan by a day or two…" | Tirmidhi 686 (Ammar) — Hasan Sahih; Bukhari 1914 / Muslim 1082 — Sahih |
| 7 | **Friday alone** | any lone Friday | **Disliked (makruh)** — *not* forbidden | "None of you should fast Friday unless he fasts a day before or after" | Bukhari 1985 / Muslim 1144 (Abu Hurayrah) — Sahih |
| 8 | **Saturday alone** (voluntary) | any lone Saturday | **Contested** — at most disliked; *not* forbidden | Single supporting hadith is itself contested (abrogated / weakened by many) | Tirmidhi 744 / Abu Dawud 2421 — graded Hasan, **but contested** |
| 9 | **Al-Wisal** (continuous fasting, no break at Maghrib) | any time | **Disliked → prohibited** (a *manner*, not a date) | The Prophet ﷺ forbade it **as a mercy** | Bukhari 1961–1963 / Muslim 1102–1103 — Sahih |

**Carve-outs the app must respect (do not block these):**
- **#6 Day of Doubt:** permitted if it lands on a **pre-existing habitual fast** (regular Mon/Thu,
  Dawud alternate-day), a vow (nadhr), or a Ramadan make-up. The block is only on *adding* a
  precautionary "get-ahead" fast on an unconfirmed 30 Sha'ban — and the app must **not auto-start
  Ramadan** on that day.
- **#7 Friday & #8 Saturday:** the dislike lifts entirely when the day is **paired** (Thu+Fri or
  Fri+Sat / Fri+Sat or Sat+Sun) **or coincides** with an obligatory or recommended fast
  (Arafah, Ashura, the White Days, Six of Shawwal, Mon/Thu habit, Dawud). In those cases the fast
  is valid/recommended — never warn.
- **#9 Al-Wisal:** the only permitted "extension" is delaying suhur until just before Fajr on a
  **single** day (Bukhari 1963) — never a true multi-day unbroken fast.

---

## 3. Major days & seasons

| Name (EN / AR) | Hijri rule | Practice | Basis + grade | Confidence |
|---|---|---|---|---|
| **Month of Ramadan** / رمضان | Whole 9th month; **start fixed by crescent sighting**, not a printed date | **Obligatory (fard)** dawn-to-sunset fast — a pillar of Islam, the one non-voluntary fast. Plus increased Quran, Taraweeh/Qiyam, charity | Quran 2:183–185 (obligation; names "the month of Ramadan in which the Quran was revealed"). Sighting: Bukhari 1909 / Muslim 1081 — Sahih. Night prayer: Bukhari 37 / Muslim 759 | **Confirmed** |
| **Laylat al-Qadr** (Night of Decree) / ليلة القدر | An **odd night** of the last ten of Ramadan (21/23/25/27/29); exact night hidden, 27th most emphasised but not certain | A **night** of worship (not a fast): qiyam, i'tikaf, Quran, abundant du'a — esp. *"Allahumma innaka 'afuwwun tuhibbu al-'afwa fa'fu 'anni"* | Quran 97:1–5; 44:3–4. Seek it: Bukhari 2017 / Muslim 1169 (Aisha) — Sahih. Reward: Bukhari 2014 / Muslim 760 — Sahih. Du'a: Tirmidhi 3513 / Ibn Majah 3850 — Hasan Sahih | **Confirmed** |
| **Eid al-Fitr** / عيد الفطر | 1 Shawwal | Eid prayer; **Zakat al-Fitr before the prayer**; takbir; Sunnah to eat an odd number of dates **before** the prayer. **Fasting HARAM** (see §2) | Two legislated Eids: Abu Dawud 1134 / Nasa'i 1556 (Anas) — Sahih. Dates: Bukhari 953. Fasting ban: Bukhari 1991–1992 / Muslim 1137 — Sahih + ijma' | **Confirmed** |
| **Eid al-Adha** (Yawm an-Nahr) / عيد الأضحى | 10 Dhul-Hijjah | Eid prayer; **udhiyah/qurbani** for those able; Sunnah to eat **after** the prayer, from the sacrifice; takbir. Coincides with Hajj. **Fasting HARAM** (see §2) | Two legislated Eids: Abu Dawud 1134 / Nasa'i 1556 — Sahih. Fasting ban: Bukhari 1991 / Muslim 1137 — Sahih + ijma'. *Takbir window from Fajr of Arafah through Tashreeq rests on Companion practice (athar), not a sahih marfu' text — present as sound majority practice* | **Confirmed** |
| **Day of Arafah** / يوم عرفة | 9 Dhul-Hijjah | **Best day of the year for du'a & dhikr** for everyone. For **non-pilgrims**, a highly recommended fast (see §4); **pilgrims at Arafah do NOT fast** | Bukhari 1988 / Muslim 1123 (Umm al-Fadl — Prophet did not fast at Arafah) — Sahih | **Confirmed** |
| **First Ten Days of Dhul-Hijjah** / عشر ذي الحجة | 1–10 Dhul-Hijjah | **The most virtuous days of the year for righteous deeds**: takbir/tahlil/tahmid, dhikr, Quran, charity, and voluntary fasting of days **1–9 only** (the 10th is Eid — fasting forbidden) | Bukhari 969 (Ibn Abbas — no days' deeds more beloved to Allah) — Sahih; Tirmidhi 757 — Hasan Sahih. Aisha (didn't see him fast all ten): Muslim 1176a — Sahih | **Confirmed** |
| **Days of Tashreeq** / أيام التشريق | 11, 12, 13 Dhul-Hijjah | Eating, drinking, dhikr/takbir; completion of Hajj rites (rami al-jamarat). **Fasting FORBIDDEN** (see §2) | Muslim 1141a (Nubayshah) — Sahih. Exception (pilgrim w/o hady): Bukhari 1998; Quran 2:196 | **Confirmed** |
| **Islamic New Year** (1 Muharram) / رأس السنة الهجرية | 1 Muharram | **Informational calendar marker only.** No prescribed du'a, prayer, sacrifice, or fast attaches to the day itself. (General virtue of fasting belongs to the *month* of Muharram, not the 1st) | Hijri epoch fixed administratively under 'Umar (~16–17 AH) by Companion consensus — a historical *athar*, not a legislated worship. Month's fasting virtue: Muslim 1163 — Sahih | **Confirmed** (see §6: "New Year" du'as/festivity are baseless) |
| **The Four Sacred Months** / الأشهر الحرم | Dhul-Qa'dah (11), Dhul-Hijjah (12), Muharram (1) — consecutive — and Rajab (7) | Heightened reverence: wrongdoing is graver, so increase good deeds and avoid sin. *(Fasting rulings belong to the individual days inside — this span contains both encouraged AND forbidden fast days; never apply one fast ruling to the whole span.)* | Quran 9:36. Naming: Bukhari 3197 / Muslim 1679a (Abu Bakrah) — Sahih | **Confirmed** (see §6: Rajab-specific fasts/rituals & "27 Rajab" are weak/fabricated) |
| **Day of Ashura** / يوم عاشوراء | 10 Muharram (paired with the 9th) | A day Allah saved Musa; a **recommended fast** (see §4). Expiates the previous year's minor sins | Bukhari 2004 / Muslim 1130 (Ibn Abbas) — Sahih; Muslim 1162 (reward) — Sahih | **Confirmed** |
| **Mawlid an-Nabi** (Prophet's Birthday) / المولد النبوي | 12 Rabi' al-Awwal *(even the birth date is disputed — some say the 9th)* | **CONTESTED.** No Quran/Sunnah legislates an annual birthday festival; it arose centuries later (Fatimid Egypt). Some scholars permit it as a praiseworthy expression of love if free of haram; many classify the festival as bid'ah. Agreed alternative: love & follow the Sunnah year-round; fast Mondays. **Not a fasting occasion** | The only authentic link of his birth to worship is the **Monday fast**: Muslim 1162 ("a day I was born") — Sahih. The festival itself has **zero** hadith basis | **Contested** |

---

## 4. Recommended voluntary fasts

All are *mustahabb* (recommended), never obligatory, never punitive to miss. Every one is subject to
the **§2 forbidden-day overrides** — if a suggested fast lands on a forbidden day, the calendar must
suppress it.

| Name (EN / AR) | Hijri rule | Practice | Basis + grade | Confidence |
|---|---|---|---|---|
| **Day of Arafah** / يوم عرفة | 9 Dhul-Hijjah | **Greatest single-day expiation** — expiates the year before AND the year after. For **non-pilgrims**; **gate behind "are you on Hajj?"** — pilgrims at Arafah should NOT fast (preserve strength for du'a) | Muslim 1162b (Abu Qatadah) — Sahih. Pilgrim exemption: Bukhari 1988 / Muslim 1123 (Umm al-Fadl) — Sahih. *Do NOT cite Abu Dawud 2440 — da'if* | **Confirmed** |
| **Day of Ashura + Tasu'a** / عاشوراء + تاسوعاء | 10 Muharram, **paired with the 9th** (to differ from the Jews) | Expiates the previous year's **minor** sins. The 10th alone is valid & rewarded, but adding the **9th** is the established Sunnah | Bukhari 2004 / Muslim 1130 — Sahih; reward Muslim 1162 — Sahih; add the 9th Muslim 1134 — Sahih. Was obligatory before Ramadan, then voluntary: Bukhari 1592 / Muslim 1125 | **Confirmed** (the "10th+11th" pairing rests on a **da'if** narration — see §6) |
| **Month of Muharram** / المحرم | Whole 1st month (a sacred month) | **Increase** voluntary fasting — "the best fast after Ramadan is Allah's month, al-Muharram." Ashura (9th+10th) is its peak. *(He never fasted a full month but Ramadan — so "increase," not "fast every day.")* | Muslim 1163 (Abu Hurayrah) — Sahih. Sacred-month status: Quran 9:36; Bukhari 3197 — Sahih | **Confirmed** |
| **Month of Sha'ban** / شعبان | 8th month (before Ramadan); **especially its first half** | **Increase** voluntary fasting ("most of Sha'ban," not the whole month — he never fasted a complete month but Ramadan). Deeds are raised in this neglected month | Bukhari 1969 / Muslim 1156 (Aisha) — Sahih; reason: Nasa'i 2357 (Usama) — Hasan | **Confirmed** (second-half caution & 15 Sha'ban — see §6) |
| **Six Days of Shawwal** / ست من شوال | Any six days in Shawwal **from the 2nd onward** (consecutive or spread) | "Whoever fasts Ramadan then follows it with six of Shawwal — as if he fasted the whole year." **Must NOT include 1 Shawwal (Eid — forbidden)** | Muslim 1164a (Abu Ayyub) — Sahih; Tirmidhi 759 — Hasan Sahih | **Confirmed** (Maliki/some early Hanafi viewed makruh — minority, not authenticity dispute) |
| **Monday & Thursday** / صيام الاثنين والخميس | Every Monday & Thursday (weekly) | Deeds are presented to Allah on these days; Monday is the day he was born and revelation came. **Suppress when it collides with a forbidden day** (two Eids, Tashreeq) | Muslim 1162 (Monday) — Sahih; Tirmidhi 747 (deeds presented) — Hasan; Aisha: Nasa'i 2360 / Ibn Majah 1739 — Sahih | **Confirmed** |
| **The White Days** (Ayyam al-Bid) / أيام البيض | **13th, 14th, 15th of every Hijri month** | The Sunnah of fasting three days each month (reward ×10 ≈ fasting the whole year). **In Dhul-Hijjah skip the 13th** (Day of Tashreeq — forbidden); fast **14 + 15 only** | Specific dates: Tirmidhi 761 (Abu Dharr) — **Hasan**. General "three days/month": Bukhari 1981 / Muslim 721 — Sahih. ×10 reward: Bukhari 1979 / Muslim 1159 — Sahih. Tashreeq override: Muslim 1141 | **Confirmed** (exact-dates support is Hasan, not Sahih) |
| **The Fast of Dawud** (alternate days) / صيام داود | Continuous: fast a day, break a day (no anchor date) | "The most beloved fasting to Allah" — the best *habitual* pattern; preserves the rights of body, family & guests. **Skip the forbidden days** and shift the alternation past them | Bukhari 1131 & 1976 / Muslim 1159 (Abdullah ibn Amr) — Sahih (muttafaq 'alayh) | **Confirmed** |

> **White-days vs Tashreeq skip (the one annual collision):** the White-Days trio is the *only*
> recurring voluntary fast that ever lands on a forbidden day — exactly once a year, on **13
> Dhul-Hijjah** (the **third/last** Day of Tashreeq, not the first). The app must auto-suppress the
> 13th there and surface *"skipped — forbidden fast day (Day of Tashreeq)"*, offering **14 + 15**
> (optionally a substitute day, or leaning on the highly-recommended Arafah fast on the 9th). Do not
> hard-code an "alternate day" as Sunnah.

---

## 5. Recurring weekly / daily virtues

| Name (EN / AR) | Recurrence | Practice | Basis + grade | Confidence |
|---|---|---|---|---|
| **Friday (Jumu'ah) — virtues** / يوم الجمعة | Every Friday | "The best day on which the sun rises." Men attend the obligatory Jumu'ah prayer; all encouraged: ghusl, clean clothes/perfume, come early, listen to the khutbah, seek the **hour of accepted du'a** (strongest views: imam-sitting-to-prayer-end, or the last hour before Maghrib). **Fasting Friday ALONE is disliked** (see §2) | Quran 62:9. Best day: Muslim 854 — Sahih. Hour of response: Bukhari 935 / Muslim 852 — Sahih. Ghusl/early: Bukhari 881 — Sahih; Tirmidhi 496 — **Hasan** (not Sahih) | **Confirmed** |
| **Reciting Surah al-Kahf on Friday** / قراءة سورة الكهف يوم الجمعة | Every Friday (commonly Thu-sunset → Fri-Maghrib) | "Whoever reads Surah al-Kahf on Jumu'ah, a light shines for him between the two Fridays." Surface as a **cherished, widely-loved practice — never as a confirmed Sunnah** | al-Hakim & al-Bayhaqi (day-version); al-Darimi 3407 (night-version) — **NOT in the six books.** Sahih per al-Albani (Sahih al-Jami' 6470), Hasan per Ibn Hajar; **but the marfu' chain is CONTESTED** (many hold the mawquf stronger) | **Contested — cherished but contested** |
| **Abundant Salawat on the Prophet on Friday** / الإكثار من الصلاة على النبي يوم الجمعة | Every Friday | Send abundant blessings on the Prophet ﷺ — "your salawat are presented to me." (Surface the **daytime** practice as confirmed) | Quran 33:56. Abu Dawud 1047 (Aws ibn Aws) — Sahih; Nasa'i 1374, Ibn Majah 1085 — Sahih | **Confirmed** (the "Friday-night" extension is weaker — see §6) |
| **Last Third of the Night** (Tahajjud / Qiyam al-Layl) / الثلث الأخير من الليل | Every night, the final third before Fajr | Voluntary night prayer, du'a, and seeking forgiveness in the pre-dawn hours — a time of special acceptance. **Gentle invitation, never a duty** | Bukhari 1145 / Muslim 758 (the descent/nuzul hadith) — Sahih. Quran 17:79; 51:17–18 | **Confirmed** |
| **Morning & Evening Remembrance** (Adhkar al-Sabah wa al-Masa') / أذكار الصباح والمساء | Daily — morning (~Fajr–sunrise) & evening (~Asr–Maghrib) | Short daily acts of protection & gratitude. Surface **"morning/evening dhikr" as the confirmed practice** — do not vouch for every narration in a compiled list | Quran 33:41–42; 7:205; 24:36. Sayyid al-Istighfar: Bukhari 6306 — Sahih. "SubhanAllahi wa bihamdihi 100×": Bukhari 6405 / Muslim 2691 — Sahih. Abu Dawud 5068 & 5070 — Sahih (**5069 is da'if**) | **Confirmed** |

> The **Monday & Thursday** fast (§4) is also a recurring weekly virtue and may be cross-listed here.

---

## 6. Confidence & authenticity notes (every contested / single-source / weak item)

Items the app must **never** present as confirmed Sunnah, or must hedge:

1. **Mawlid an-Nabi (annual Prophet's-birthday festival) — CONTESTED.** Zero hadith basis for the
   festival; arose under the Fatimids centuries later. Scholars split: permitted-if-free-of-haram
   (al-Suyuti, Ibn Hajar al-'Asqalani, al-Sakhawi, Ibn Hajar al-Haytami, much of al-Azhar) vs.
   unsanctioned bid'ah (Ibn Taymiyyah, al-Shatibi, al-Shawkani, the Salafi/Hanbali current). Present
   both positions; attach **no** special fast or reward. The authentic link of his birth to worship
   is only the **Monday fast** (Muslim 1162).

2. **Fasting Saturday alone — CONTESTED hadith.** "Do not fast Saturday except what is obligatory"
   (Tirmidhi 744 / Abu Dawud 2421 / Ibn Majah 1726, al-Samma' bint Busr): graded Hasan by Tirmidhi
   and Sahih by al-Albani/Ibn Khuzayma/Ibn Hibban — **but** declared abrogated by Abu Dawud and
   weak/munkar/"a lie" by Malik, Ahmad, al-Zuhri, al-Awza'i, Ibn Taymiyyah, Ibn al-Qayyim, Ibn Hajar,
   Ibn Baz, Ibn 'Uthaymin, and the Permanent Committee. **Never** present "Saturday fasting is
   forbidden." At most a soft "prefer to pair it with another day." Obligatory, joined, or coinciding
   fasts on a Saturday are unaffected.

3. **Day of Doubt — "by consensus" is an overstatement.** Forbidding the precautionary 30-Sha'ban
   fast is the **jumhur** (Hanafi, Maliki, Shafi'i), **not** full ijma': the mashhur Hanbali madhhab
   (following Ibn Umar) holds it *recommended/obligatory* to fast a **cloudy** 30 Sha'ban as Ramadan
   precaution. The app's guardrail (don't auto-start Ramadan, don't auto-suggest the fast) follows
   the stronger majority view and the explicit "complete Sha'ban as thirty" hadith — keep it, but say
   "by the majority," not "by consensus."

4. **Reciting al-Kahf on Friday — CONTESTED marfu' chain.** Authenticated by al-Albani and Ibn Hajar
   but **not in Bukhari/Muslim/the four Sunan**, and several critics hold the *mawquf* (Companion
   saying) stronger than the *marfu'* (raised to the Prophet). Surface as **"cherished by many,"**
   never with the weight of the agreed-upon (muttafaq 'alayh) narrations.

5. **The "10th + 11th" Ashura pairing — DA'IF.** "Fast a day before it and a day after it" (Ahmad
   2154, Ibn Khuzayma 2095, Bayhaqi) is weak (Ibn Abi Layla's poor memory; weakened by al-Albani &
   al-Arna'ut). The **sahih** Sunnah is the **9th + 10th** (Tasu'a, Muslim 1134). Present the 11th as
   weaker-evidence precaution, not equal to the 9th.

6. **"Do not fast after mid-Sha'ban" (second half) — CONTESTED.** Abu Dawud 2337 / Tirmidhi 738 /
   Ibn Majah 1651: Sahih to Tirmidhi, Ibn Hibban, al-Albani, Ibn al-Qayyim; **munkar/weak** to Ahmad,
   Ibn Ma'in, Abu Zur'ah. Practical guidance: bias suggestions to the **first half**; for the second
   half only continue if the user has a standing habit (Mon/Thu, White Days) or is making up Ramadan —
   never a brand-new fast as Ramadan prep.

7. **Laylat al-Qadr du'a — the "Karim" addition is NOT authentic.** Though the printed Arabic of
   Tirmidhi 3513 includes "كريم," scholars (Ibn Baz, al-Albani) hold that wording is not preserved.
   Use *"Allahumma innaka 'afuwwun tuhibbu al-'afwa fa'fu 'anni"* **without** "Karim."

8. **Fasting Friday alone — makruh is mainstream, not unanimous.** Disliked per the **jumhur**
   (Shafi'i + Hanbali); the **Maliki** school (and the dominant Hanafi view) do **not** consider it
   disliked; a Zahiri minority (Ibn Hazm) held it prohibited. App behaviour is unchanged: never
   auto-schedule a lone-Friday fast — but it is **disliked, not forbidden**, and never an
   "established Sunnah."

9. **15 Sha'ban (Laylat al-Bara'ah) — special night-prayer/fast is WEAK/FABRICATED.** The popular
   special prayer rests on weak/fabricated reports; singling out the 15th to fast (Ibn Majah 1388) is
   da'if (Ibn Abi Sabrah, accused of fabricating). **Do not** confuse this with the **authentic**
   White Days (13/14/15 every month) — those are a sound Sunnah; only the *special Bara'ah
   singling-out* of the 15th is weak.

10. **Rajab-specific worship & "27 Rajab" — NO authentic basis / FABRICATED.** There is no authentic
    hadith for a Rajab-specific fast, prayer, or Umrah. The "27 Rajab" Isra/Mi'raj date and Salat
    al-Ragha'ib are not authentically fixed / are fabricated. Rajab's sanctity = avoid sin; do not
    surface invented Rajab rituals.

11. **"Fast the four sacred months" as a block — DA'IF.** The only narration urging it (Abu Dawud
    2428, the man of al-Bahila) is weak. Do not present a whole-period sacred-months fast as Sunnah —
    put fast rulings on the individual days.

12. **"New Year" du'as / 1-Muharram special reward — BASELESS.** No authentic du'a, prayer, sacrifice,
    or fast attaches to 1 Muharram itself; treating it as a religious *celebration* is held by a real
    Sunni view to be an unfounded innovation. Display it as a neutral marker only.

13. **Friday salawat "Friday night" extension — WEAKER.** The sahih wording (Abu Dawud 1047 etc.)
    specifies the **day** of Jumu'ah only; the Friday-eve/night addition comes through separate,
    weaker narrations — present the **daytime** practice as confirmed, the night as a permissible but
    less-grounded addition.

14. **Morning/Evening adhkar — Abu Dawud 5069 is DA'IF.** The "I call Allah and the bearers of the
    Throne to witness…" narration with the progressive emancipation-from-Hell reward (common in
    compiled adhkar) is weak per al-Albani. Abu Dawud 5068 & 5070 are Sahih. Present
    "morning/evening dhikr" as the confirmed practice, not every individual supplication.

15. **Tirmidhi 496 (Jumu'ah ghusl/early-walk) — grade is Hasan, not Sahih.** Authentic either way
    (al-Albani: Sahih), but cite it as Hasan for precision.

16. **Eid al-Adha takbir window — Companion practice (athar), not a sahih marfu' text.** "From Fajr
    of Arafah through the Tashreeq days" rests on the practice of 'Umar, 'Ali, Ibn Mas'ud; the marfu'
    narrations fixing those exact endpoints are weak. Present as a sound, majority-held Companion
    practice.

17. **Mon/Thu — Tirmidhi 747 chain.** al-Albani considered that specific chain weak, but Tirmidhi/
    Darussalam grade it **Hasan** and the meaning is independently authentic (also Usama: Nasa'i 2357
    / Abu Dawud 2436; Aisha: Nasa'i/Ibn Majah). The observance is multi-sourced and unaffected — keep
    "Hasan."

**Citation hygiene:** prefer **Sahih Muslim 1137** (Book of Fasting) over bare "Muslim 827" for the
two-Eids fasting ban — Muslim 827(a) is in the Book of *Prayer* about forbidden prayer *times*; the
fasting narration is Muslim 827b/1137. For Tashreeq, cite **Muslim 1141a** (the Nubayshah wording).
For Eid-fasting ban, **Bukhari 1991–1992**.
