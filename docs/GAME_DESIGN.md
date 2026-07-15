# TaleofChaThai — Game Design Doc (โปรเจกต์ใหม่ แยกจาก ChaThaiTheCat โดยสิ้นเชิง)

> **สถานะ: ✅ VERTICAL SLICE เล่นได้แล้ว** — implement เสร็จตาม checklist §7 ข้อ 1-8 (เวอร์ชันแรก):
> `index.html` + `css/style.css` + `js/{data,maps,engine,audio,ui,main}.js` — ไม่แตะไฟล์ ChaThaiTheCat เลย
> ตามหลักการสำคัญที่สุดของเอกสารนี้ สิ่งที่ได้ในรอบแรก:
>
> - **ข้อมูลเกมครบ**: 198 สปีชีส์ (180 wild จาก manifest จริงทั้ง 18 ธาตุ + 18 บอส), type chart 18×18 จริง
>   ตาม §3.5 (ทดสอบแล้ว: Fire→Grass x2, Electric→Ground x0, dual-type x4), 92 ท่า (18 ธาตุ × 5 tier +
>   scratch/purr กลาง) ตั้งชื่อ flavor ตามท่าจริงของ Pokémon ตาม §3.3, มอนสเตอร์ใช้ `.gif` ตรง ๆ ตาม §3.2
>   (บอสใช้ `.png` นิ่งเพราะบั๊กพื้นหลังขาวใน gif ตาม §3.6 — รอ re-export)
> - **5 ธาตุ main route เดินได้จริง** (§7 ข้อ 4): 10 screens (24×32 tiles @32px, viewport 15×10 แบบ FireRed)
>   authored `ground`/`npcs`/`warps` ครบ — Meadowcross Village/Oldmill Woodland/Dojo Valley/Champion
>   Colosseum/Dreamglass Sanctum/Mindwave Observatory/Frostglass Tundra/Glacier Palace/Wyrmstone
>   Highlands/Skyfang Caldera — ทุก screen ผ่าน validation (ความยาวแถว/entry/warp/NPC บนช่องเดินได้)
> - **Region Map เป็นเมนูหลัก** (§4.4): ภาพทวีปจริง + หมุด 18 ธาตุจากพิกัด JSON ตรง ๆ, 📍 ตำแหน่งปัจจุบัน,
>   🔒 badge-gate ตามเส้นทางหลัก, 🚧 13 ธาตุ uncharted, กฎ visited-gate มาตั้งแต่วันแรก
> - **โครงสร้างเกมตาม §2.3**: 5 Dojo (leader = NPC trainer ธีมตรงธาตุตาม §6.3) + badge ไล่ปลดล็อกภูมิภาค
>   ถัดไป + Veteran Champion ที่ Skyfang Caldera (ต้องครบ 5 badge) + field boss recruit-once ต่อภูมิภาค
>   (`state.recruitedBosses` เซฟถาวรตามข้อเสนอ §3.7 — ชนะ/ปฏิเสธแล้วบอสหายจากฉากถาวร กันปั๊มซ้ำ)
> - **NPC trainer sprites จริงในฉาก** (§6): sight-line ambush + ขนาด 56px bottom-anchored ตาม §6.2,
>   บอสในฉาก 104px ตาม §3.7, `image-rendering: pixelated` ทุกจุดตาม §2.2
> - **บทเรียนจาก ChaThaiTheCat ติดมาแต่แรก**: เริ่มเกม/เดินทาง = เข้าฉากเดินทันที (ไม่มีเมนูคั่น), switch
>   กลางศึก = เปลี่ยน lead ถาวร, resume ตำแหน่งเดินเมื่อสลับเมนูไปกลับ, ปุ่ม keycap press-feedback
> - **บั๊กที่เจอและแก้แล้ว**: `saveGame()`/`loadGame()` เดิมไม่ได้เก็บ `state.field` เลย — กด Save แล้วโหลดใหม่
>   (หรือปิดเปิดเบราว์เซอร์) จะเด้งกลับไปจุด entry ของแมพเสมอ ทั้งที่เดินไปไกลแล้ว ("resume in place" ที่มีอยู่
>   แล้วใน `enterField()` ใช้ได้แค่ตอนสลับหน้าจอในเซสชันเดียวกัน ไม่ได้ครอบคลุมข้าม save/load) — แก้โดยเก็บ
>   `field` ลง save data ด้วย, `continue-game` เช็กว่ามี `state.field` ที่ restore มาไหม ถ้ามีก็เข้า `'field'`
>   ตรง ๆ (ไม่ผ่าน `travelToRegion`/badge-gate ซึ่งไม่จำเป็นสำหรับการ resume เซฟเดิม)
> - **สิ่งที่ยังไม่ทำ** (ตามแผน): 13 ธาตุนอกเส้นทางหลัก (art พร้อมแล้ว เหลือ author grid), Fusion/Jogress
>   (§5 — ตัดออกจาก slice แรกทั้งระบบ), BGM (ยังไม่มีไฟล์เพลงของโปรเจกต์นี้ — SFX สังเคราะห์มีแล้ว),
>   ท่าแยกรายสาย (ตอนนี้แชร์ ladder ต่อธาตุ), progression_gates 4 จุดแบบเดินเจอบนแมพ (ตอนนี้ gate ผ่าน
>   badge-unlock บน Region Map แทน)
>
> เอกสารด้านล่างคือ spec ต้นฉบับ (คงไว้ตามเดิมเป็น reference)

> **สถานะเดิม**: เอกสารออกแบบเริ่มต้น ยังไม่มีโค้ดเกม — เขียนไว้ให้ Claude Code (หรือ dev คนไหนก็ตาม) หยิบไป
> implement ต่อได้ทันที
>
> **หลักการสำคัญที่สุด**: โปรเจกต์นี้ **ต้องไม่แก้ไฟล์ใด ๆ ใน `ChaThaiTheCat/` เลย** (ทั้งโค้ดและ asset)
> — เป็นเกมแยกอิสระ อยู่คนละโฟลเดอร์ (`Project/TaleofChaThai/`) สิ่งที่ "หยิบยืม" จาก ChaThaiTheCat มีแค่:
> (1) **ก็อปปี้** ไฟล์ asset ตัวละคร (trainer) มาไว้ในโฟลเดอร์ตัวเอง ไม่ใช่ reference ข้ามโฟลเดอร์ และ
> (2) **ก็อปปี้แล้วดัดแปลง** โค้ด engine บางส่วน (battle/fusion/FX/audio) มาเป็นจุดเริ่มต้น ไม่ใช่ import ตรง
> ๆ — เพื่อการันตีว่าต่อให้แก้ TaleofChaThai พังยับแค่ไหน ChaThaiTheCat ต้นทางจะไม่กระทบเลยแม้แต่บรรทัดเดียว

## 0. คอนเซปต์หลัก

TaleofChaThai คือเกมจับสัตว์ประจำธาตุแนว Pokémon **เวอร์ชันเต็มรูปแบบ 18 ธาตุ** (ตามธาตุจริงในเกม
Pokémon: Normal/Fire/Water/Grass/Electric/Ice/Fighting/Poison/Ground/Flying/Psychic/Bug/Rock/Ghost/
Dragon/Dark/Steel/Fairy) — ต่างจาก ChaThaiTheCat เดิมที่ใช้ระบบ 6 ธาตุ hexagon แบบย่อของตัวเอง

**ทำไมแยกเป็นเกมใหม่แทนที่จะขยาย ChaThaiTheCat เดิม**: ตามที่วิเคราะห์ไว้ใน
`ChaThaiTheCat/docs/PIXEL_ASSETS_INTEGRATION.md` §0 — การขยับจาก 6 ธาตุเป็น 18 ธาตุเป็นงาน redesign
ระบบใหญ่ (type chart/movepool/balance ทั้งหมด) ที่เสี่ยงทำให้ ChaThaiTheCat เดิม (204 สปีชีส์, ระบบท่า/
สเตตัส/ฟิวชันที่ tune มาอย่างดีแล้ว, ภูมิศาสตร์โลกที่เพิ่งออกแบบ) พังไปด้วย — แยกเป็นโปรเจกต์ใหม่จึงปลอดภัย
กว่ามาก ได้ทดลองระบบ 18 ธาตุเต็มที่โดยไม่มีอะไรเสีย

**แผนที่โลกไม่อิงของเดิมเลย** — ไม่ใช้ระบบ `WORLD_NODES` hexagon 6 แฉกของ ChaThaiTheCat แม้แต่นิดเดียว
ใช้ **แผนที่ทวีปใหม่ทั้งหมด** จาก `assets/maps-pixel/` (ดูหัวข้อ 2)

## 1. ตัวละครผู้เล่น (Trainer) — ใช้ตัวเดิม + เผื่อที่ตัวใหม่

**ก็อปปี้ asset จาก ChaThaiTheCat มาใช้ตรง ๆ** (คนละไฟล์ คนละโฟลเดอร์ ไม่ใช่ reference ข้าม):

- ก็อปปี้ `ChaThaiTheCat/assets/sprites/trainer/*.png` (5 คน: Kai/Amara/Dr. Mira/Leo/Ren — ทั้ง `-full.png`
  ตอนเลือกตัวละครหน้าแรก และ `-sd.png` ตอนเดินในฉาก) มาไว้ที่ `TaleofChaThai/assets/player-trainers/`
  (**✅ ก็อปปี้แล้วจริง** พร้อมจัดหมวดหมู่ — ดู §8 ท้ายเอกสารสำหรับ asset catalog ฉบับเต็ม)
- **โบนัสที่เจอระหว่างสำรวจ**: `ChaThaiTheCat/assets/sprites/trainer/walk/` มีสไปรต์เดิน **8 เฟรมต่อคน**
  (`<id>-f0.png` ถึง `-f7.png`) อยู่แล้ว — ก็อปปี้มาด้วย เพราะแก้ปัญหา "ไม่มีสไปรต์ 4 ทิศจริง" ที่
  `GAME_DESIGN_OVERWORLD_FIRERED.md` §5.4 เคยระบุว่ายังไม่ทำในเกมเดิม — TaleofChaThai เริ่มต้นด้วยสไปรต์เดิน
  4 ทิศจริงได้เลยตั้งแต่วันแรก ไม่ต้องใช้วิธี flip ซ้าย-ขวาแบบเกมเดิม (ต้องเช็คกับผู้สร้างว่า mapping 8 เฟรม
  → 4 ทิศ × 2 เฟรม/ทิศ ถูกต้องไหมก่อนเขียนโค้ด เพราะยังไม่มี metadata JSON บอกไว้ชัดเหมือนสไปรต์มอนสเตอร์ใหม่)
- **ตัวละครใหม่**: เผื่อ slot ไว้ในระบบ (array `TRAINERS` แบบเดียวกับเกมเดิม) แต่ยังไม่มี art — ต้องผลิตเพิ่ม
  ทีหลัง ไม่ใช่งานของเอกสารนี้

## 2. แผนที่โลก — ใช้ `assets/maps-pixel/` เต็มระบบ ไม่อิงของเดิม

ก็อปปี้ `ChaThaiTheCat/assets/maps-pixel/` มาไว้ที่ TaleofChaThai แล้ว **แยกเป็น 2 หมวดชัดเจน** (✅ ก็อปปี้จริง
แล้ว): `TaleofChaThai/assets/world-map/` (จาก `maps-pixel/world/`) และ `TaleofChaThai/assets/region-maps/`
(จาก `maps-pixel/production/`) — ดู §8 ท้ายเอกสารสำหรับ asset catalog ฉบับเต็ม
(รายละเอียดที่มาของแต่ละไฟล์ดูใน `PIXEL_ASSETS_INTEGRATION.md` §1-3 ของ ChaThaiTheCat — สรุปสั้นที่นี่แค่
พอใช้งาน):

### 2.1 Region Map (ภาพรวมทวีป) — หน้าจอหลักตั้งแต่วันแรก

`TaleofChaThai/assets/world-map/chathai-world-map.png` + `.json` คือแผนที่ทวีปทั้งใบ **ใช้เป็นเมนู Region Map หลัก
ของเกมทันที** (ไม่ใช่ฟีเจอร์เสริมทีหลังแบบ ChaThaiTheCat เดิม) — ข้อมูลจาก JSON ที่ต้องใช้จริง:

- `starting_region: "normal"` (zone `"central-meadowcross"`, พิกัด `[0.49, 0.39]`) = จุดเริ่มเกม/หมู่บ้านหลัก
  บทบาทเทียบเท่า Paw Fountain Plaza ของเกมเดิม
- `regions[]` ทั้ง 18 ธาตุ พร้อมพิกัด `center: [x,y]` (normalized 0-1) — ใช้วางหมุด/ปุ่มบนภาพทวีปตรง ๆ
- `endgame_route: [normal, fighting, psychic, ice, dragon]` = **เส้นทางหลักของเกม** (ดูหัวข้อ 2.3)
- `progression_gates` = จุดกั้นด่าน 4 จุด (ดูหัวข้อ 2.3)

### 2.2 Zone screens (เดินได้จริง) — 2 หน้าจอต่อธาตุ

`TaleofChaThai/assets/region-maps/{group}/{category}/{slug}/{slug}.png` + `.json` — 36 ไฟล์ (18 ธาตุ × 2) ทุก
ภาพ 768×1024px ที่ 32px/tile (= 24×32 tiles) เอาไปทำเป็น `FIELD_MAPS`-เทียบเท่าของเกมใหม่นี้โดยตรง (สอง
screen ต่อธาตุเชื่อมกันด้วย warp เหมือนที่ ChaThaiTheCat เดิมทำกับ Volcanic Canyon เป็น vertical slice แรก —
ดูสถาปัตยกรรมกล้อง/tile-grid ที่พิสูจน์แล้วว่าใช้ได้จริงใน `GAME_DESIGN_OVERWORLD_FIRERED.md` §3-§5 เอามาใช้
ซ้ำได้เลยแบบ 1:1 เพราะเป็นระบบทั่วไป ไม่ผูกกับ 6 ธาตุ)

**สิ่งที่ยังต้อง author เพิ่มเอง** (asset มีแค่ภาพ+ขนาด ไม่มี gameplay data): `ground` grid (P/G/C/T ตาม
legend เดิม, ต้องดูภาพจริงแล้ววาดให้ตรงทางเดิน/หญ้า/สิ่งกีดขวางที่เห็นในภาพ pixel art), `npcs`, `warps` —
งานนี้เท่ากับที่ ChaThaiTheCat เดิมทำไปแล้ว 6 ธาตุ × 2 screen แค่ต้องทำซ้ำอีก 18 ธาตุ × 2 screen (36 รอบ)

**CSS ที่ต้องเพิ่ม**: `image-rendering: pixelated` บน background ของ field viewport (ภาพเป็น pixel art จริง
ต่างจาก jpg ภาพวาดของ ChaThaiTheCat เดิมที่ไม่ต้องการค่านี้)

### 2.3 โครงสร้างเกม — ไม่ทำ "18 Dojo" (จะซ้ำซากเกินไป)

`endgame_route` ในไฟล์ระบุมาแค่ 5 ธาตุ (`normal → fighting → psychic → ice → dragon`) ไม่ใช่ทั้ง 18 —
ตีความได้ว่า **ผู้ออกแบบ asset ตั้งใจให้เป็นเส้นทางหลัก (main story spine) แค่ 5 ธาตุ** ส่วนอีก 13 ธาตุที่
เหลือเป็น **พื้นที่สำรวจเสริม/ทางเลือก** (side content, เจอได้แต่ไม่บังคับต้องผ่านเพื่อจบเกม) — ตรงกับที่
Pokémon เกมจริงก็ไม่ได้บังคับให้ผ่านทุก type ก่อนจบเกมเหมือนกัน (มีแค่ 8 Gym จาก 15+ type ที่มีในเกม)

**คำแนะนำโครงสร้าง**:
- 5 ธาตุใน `endgame_route` = ด่านหลัก มี Dojo/บอสประจำแต่ละธาตุ (เทียบเท่า 5 Dojo ของ ChaThaiTheCat เดิม
  พอดี — จำนวนใกล้เคียงกัน ใช้ pattern เดิมได้เลย)
- `progression_gates` (4 จุด: `dragon-mountain-pass`/`steel-city-bridge`/`ground-canyon-gate`/
  `water-cascade-temple`) = ประตูด่านที่ต้องใช้ badge/ไอเทมถึงจะผ่านได้ (เทียบเท่า badge-gate ของเดิม) — ใช้
  ชื่อ/ตำแหน่งที่มีอยู่แล้วในไฟล์ตรง ๆ ไม่ต้องคิดใหม่
- อีก 13 ธาตุที่เหลือ = โซนสำรวจอิสระ เข้าได้ตลอด ไม่บังคับ มีสัตว์ป่า/ของสะสม แต่ไม่มี Dojo บังคับสู้ (ลด
  ภาระงาน content จาก "18 Dojo" เหลือ "5 Dojo + 13 สนามเด็กเล่นสำรวจ" ทำได้จริงกว่ามาก)
- ท้ายเกม (Champion-เทียบเท่า) วางไว้ที่ธาตุสุดท้ายของ `endgame_route` (`dragon`) แทน Convergence Nexus เดิม

## 3. มอนสเตอร์ — ใช้ `assets/sprites-pixel/wild/production/` เป็นฐาน

ก็อปปี้ `ChaThaiTheCat/assets/sprites-pixel/wild/production/` มาไว้ที่ `TaleofChaThai/assets/monsters-wild/`
แล้ว (**✅ ก็อปปี้จริง 180 สปีชีส์ครบแล้ว** — ดู §8 ท้ายเอกสารสำหรับ asset catalog ฉบับเต็ม)

### 3.1 สิ่งที่มีจริง (180 สปีชีส์ ครอบคลุมครบ 18/18 ธาตุ — ✅ อัปเดตล่าสุด: Fire/Grass/Ghost ผลิตเสร็จแล้วด้วย)

> **อัปเดต (ครบทุกธาตุแล้ว)**: หลัง Dragon (อัปเดตก่อนหน้า) ตอนนี้ `element/fire`, `element/grass`,
> `type/ghost` ผลิตเสร็จครบแล้วเช่นกัน — **ไม่มีธาตุไหนขาดอีกต่อไป ทั้ง 18 ธาตุมีสปีชีส์ครบ 10 ตัว/ธาตุ (5 คู่
> วิวัฒนาการ) รวม 180 ตัว** เช็คจากดิสก์จริงแล้ว รายชื่อ 5 คู่ต่อธาตุที่เพิ่งได้มา:
>
> - **Fire**: Ember Cub→Cinder Grizzly, Coal Chick→Pyre Rooster, Wick Mouse→Lantern Rat, Spark Ram→Inferno
>   Ram, Ash Lizard→Magma Monitor
> - **Grass**: Vine Monkey→Jungle Sage, Bud Deer→Canopy Stag, Sprout Tortoise→Orchard Tortoise, Acorn
>   Owl→Oak Sentinel, Reed Gator→Mangrove Gator
> - **Ghost**: Candle Wisp→Funeral Flame, Sheet Imp→Shroud Phantom, Bone Pup→Grave Hound, Bell Bat→Chime
>   Revenant, Mask Kit→Shrine Apparition
>
> **ผลต่อแผนงาน**: ตอนนี้ไม่จำเป็นต้อง "ทำเฉพาะ 5 ธาตุ main route ก่อนค่อยขยาย" ตาม checklist ข้อ 4 เดิม
> อีกต่อไปด้วยเหตุผลเรื่อง asset ไม่พร้อม (asset พร้อมครบหมดแล้ว) — แต่ยังแนะนำให้ **ทำ 5 ธาตุ main route
> ก่อนอยู่ดี** ด้วยเหตุผลเรื่อง scope การ author `ground`/`npcs`/`warps` (งานคนเขียนเยอะ ไม่ใช่งานขาด asset)
> ให้ story หลักเล่นจบได้ก่อน แล้วค่อยขยายอีก 13 ธาตุทีหลังตามเดิม

รายละเอียดเต็มดูที่ `PIXEL_ASSETS_INTEGRATION.md` §2 ของ ChaThaiTheCat สรุปที่ต้องรู้ตอน implement:

- **10 สปีชีส์ต่อธาตุ = 5 คู่วิวัฒนาการ (2 สเตจ) สำหรับมอนสเตอร์ชุดใหม่นี้โดยเฉพาะ** — **แก้ไขจากร่างแรก**:
  ไม่ใช่กฎตายตัวทั้งเกม จำนวนสเตจควร **ขึ้นกับแต่ละสายจริง ๆ ไม่ใช่บังคับให้ทุกสายเท่ากัน** ถ้าสายไหน (ไม่ว่า
  จะยืมมาจาก ChaThaiTheCat เดิม หรือผลิตเพิ่มเองทีหลัง) มีภาพครบ 3 สเตจ ก็ใช้ 3 สเตจได้ตามปกติ — เรื่องนี้ไม่
  ต้องแก้โค้ดอะไรเลยด้วยซ้ำ เพราะ `checkEvolution()`/`evoLevel` ของ ChaThaiTheCat เดิมออกแบบมาเป็น chain
  ต่อกันตาม `evolvesTo` อยู่แล้ว (ดูจำนวนสเตจจริงของสาย ไม่ได้ hardcode ว่าต้องเป็น 3 เป๊ะ) ก็อปปี้สูตรมาใช้ได้
  ตรง ๆ — สายจากชุด `sprites-pixel` ใหม่นี้บังเอิญมีแค่ 2 สเตจเพราะ**ภาพที่ผลิตมามีแค่ 2 สเตจ**เท่านั้น ไม่ใช่
  เพราะระบบบังคับ
- **ขาด 4 ธาตุ**: `element/fire`, `element/grass`, `type/dragon`, `type/ghost` ยังไม่มีมอนสเตอร์เลย (มีแค่
  แผนที่) — **แก้ไขจากร่างแรก**: เช็ค `endgame_route` ในไฟล์จริงอีกรอบแล้วพบว่ามีแค่ **`dragon`** เท่านั้นที่
  อยู่ในเส้นทางหลัก (`[normal, fighting, psychic, ice, dragon]` — **ไม่มี `fire`** ในนี้ ร่างแรกเขียนผิด) ดู
  รายละเอียด gap ต่อ Dojo แบบเจาะจงที่ §3.4 ด้านล่าง
- แต่ละสปีชีส์: `slug.png` (นิ่ง 333×265), `slug-move-sheet.png` (เดิน 8 เฟรม), `slug-move-sheet.json`
  (พิกัด+duration 120ms/เฟรม), `slug-move.gif` (แอนิเมชันสำเร็จรูป — **ใช้จริงได้เลย ดู §3.2**)

### 3.2 Preprocessing — **แก้ไขจากร่างก่อนหน้า: ไม่ต้องลบพื้นหลัง ใช้ `.gif` ตรง ๆ ได้เลย**

> **แก้ไขคำแนะนำเดิม**: ร่างก่อนหน้าเขียนผิดว่า "พื้นหลังเป็นสีทึบต้องลบก่อน" และแนะนำให้เขียน renderer อ่าน
> sprite-sheet เอง — เช็คพิกเซลจริงด้วย PIL ใหม่ (ไม่ใช่แค่ดูภาพผ่านเครื่องมือ preview ที่มักเติมพื้นขาวหลอกตา)
> พบว่า **ทั้ง `slug.png` และ `slug-move.gif` ของสัตว์ทั้ง 180 ตัว มี alpha โปร่งใสจริงอยู่แล้ว** (เช็คมุมภาพ
> alpha=0 ทุกตัวอย่างที่สุ่มเช็คข้ามหลายธาตุ) — **ไม่ต้องลบพื้นหลังเลย ใช้ไฟล์ตรง ๆ ได้ทันที**

**วิธีที่แนะนำตอนนี้ (ตามที่ขอ — ใช้ GIF ให้เห็นขยับได้จริง)**: เล่นแอนิเมชันด้วย `<img src=".../slug-move.gif">`
ตรง ๆ เป็นวิธีที่ง่ายที่สุดเท่าที่จะทำได้ — เบราว์เซอร์เล่น GIF แบบวนลูปให้เองโดยอัตโนมัติ **ไม่ต้องเขียนโค้ด
แอนิเมชันเลยสักบรรทัด** (ไม่ต้องมี `-move-sheet.png`/`.json`/CSS `background-position` stepped animation
แบบที่ร่างก่อนหน้าเสนอไว้ — เก็บไฟล์ sheet ไว้เฉย ๆ เผื่ออนาคตอยากได้ frame-level control เช่นหยุดที่เฟรม
เดียวตอนสลบ ค่อยสลับมาใช้ก็ได้ แต่วันแรกใช้ `.gif` พอ) จุดเดียวที่ต้องระวัง: `<img>` ไม่มีปุ่ม "หยุดที่เฟรมแรก"
ในตัว ถ้าต้องการภาพนิ่ง (เช่นตอนสลบ/แสดงใน MonsterDic แบบไม่ขยับ) ให้สลับไปใช้ `slug.png` (ภาพนิ่งเดี่ยว)
แทนที่ `slug-move.gif` ตรงจุดนั้น ๆ — สอง field คนละไฟล์กันอยู่แล้วในข้อมูล ใช้สลับกันตามบริบทได้เลย

### 3.3 Movepool/stats — reuse สูตรเดิมของ ChaThaiTheCat แต่ขยายเป็น 18 ธาตุ

**Reuse สูตรคำนวณ stat ตรง ๆ** จาก `calcStats()`/`movesKnownAt()` ของ ChaThaiTheCat (ก็อปปี้โค้ดมาเป็นจุดเริ่ม
ต้น ไม่ต้องคิดสูตรใหม่ — สูตรนี้ generic ไม่ผูกกับจำนวนธาตุ) — สิ่งที่ต้องทำใหม่คือ **เนื้อหา** (content) ไม่ใช่
**ระบบ** (system):

- ท่าไม้ตายตาม tier เดิม (Lv1 Scratch/Nip, Lv16 Status, Lv22 Fang, Lv28 Purr, Lv36 Strike, Lv44 Ultra) — ต้อง
  ตั้งชื่อท่าใหม่ให้ครบ **18 ธาตุ × ~6 ท่า/ธาตุ = ~108 ท่า** (ChaThaiTheCat เดิมมี 52 ท่าสำหรับ 6 ธาตุ) งาน
  content generation ขนาดใหญ่ — แนะนำให้ Claude Code generate เป็น batch โดยอ้างอิงชื่อท่าจริงจาก
  pokemondb.net/move/all แบบเดียวกับที่ ChaThaiTheCat เดิมทำ (ดู `GAME_DESIGN.md` เดิม หัวข้อ "🎯 มอนสเตอร์
  แต่ละตัวมีท่าต่างกัน" เป็นตัวอย่างวิธีคิด)
- **Type chart 18×18 — แนะนำใช้ type chart จริงของ Pokémon เลย** (ไม่ประดิษฐ์ใหม่) เพราะ (1) ผู้เล่นคุ้นเคย
  อยู่แล้วโดยไม่ต้องเรียนรู้ใหม่ (2) ผ่านการ balance มาแล้วหลายสิบปีโดยทีมงานมืออาชีพ (3) การออกแบบ chart
  18×18 เองใหม่ทั้งหมดมีความเสี่ยง balance สูงและใช้เวลามาก ไม่คุ้มกับ scope ของโปรเจกต์นี้ — เก็บไว้เป็น
  ตารางคงที่ (constant object 18×18 หรือ multiplier lookup) ต่างจาก hexagon-cycle แบบเดิมที่คำนวณจากตำแหน่ง
  ในวงจร (18 ธาตุไม่เป็นวงจรเรียบง่ายแบบ 6 ธาตุ ต้อง hardcode เป็นตารางจริง) — **ตัวจริงอยู่ที่ §3.5 ด้านล่าง**
  พิมพ์เป็นตารางไว้ให้ใช้ได้ทันที ไม่ต้องไปหาที่อื่น

### 3.4 บอส Dojo — ✅ ครบทั้ง 5 ธาตุในเส้นทางหลักแล้ว (อัปเดต: Dragon ผลิตเสร็จแล้ว)

จาก 5 ธาตุในเส้นทางหลัก (`endgame_route`) — **ตอนนี้มีสปีชีส์ครบ 10 ตัวทุกธาตุแล้ว ไม่มีธาตุไหนขาดอีกต่อไป**:

| ธาตุใน `endgame_route` | มีสปีชีส์กี่ตัว | สถานะ Dojo |
|---|---|---|
| `normal` (จุดเริ่มเกม) | 10 (`type/normal`) | ✅ พร้อมใช้ — หยิบ 3 ตัวแรงสุดในสายมาทำบอสได้เลย (pattern เดียวกับ Volt Dojo เดิมของ ChaThaiTheCat ที่ใช้ electric1/electric2/Electric Duelist ผสมกัน) |
| `fighting` | 10 (`type/fighting`) | ✅ พร้อมใช้ |
| `psychic` | 10 (`type/psychic`) | ✅ พร้อมใช้ |
| `ice` | 10 (`element/ice`) | ✅ พร้อมใช้ |
| `dragon` | **10 (ผลิตเสร็จแล้ว — ดู §3.1)** | ✅ พร้อมใช้ — แนะนำหยิบ **Ancient Grove Dragon / Astral Wyrm / Tempest Dragon** (3 stage-2 ตัวที่ฟังดูทรงพลังสุดจากชื่อ) มาทำบอสไตร์โอ เหมือน pattern เดียวกับธาตุอื่น |

**สรุป**: เส้นทางหลักทั้ง 5 ธาตุพร้อม implement Dojo ได้ทันทีไม่มีอะไรบล็อกแล้ว — เหลือแค่ `fire`/`grass`/
`ghost` ที่ยังไม่มีมอนสเตอร์ (อยู่นอกเส้นทางหลักทั้งหมด ไม่บล็อกการจบเกม ทำทีหลังได้ตามที่เขียนไว้ใน §3.1)

### 3.5 Type Chart จริง (Pokémon Gen 6+ — 18 ธาตุ, มี Fairy)

ตารางด้านล่างคือ type chart จริงที่ใช้ในเกม Pokémon ตั้งแต่เจนเนอเรชัน 6 เป็นต้นมา (มีธาตุ Fairy ครบ) —
เขียนเป็น "ธาตุที่โจมตี" (แถว) x2 (ต้าน), x0.5 (ทน), x0 (ไม่มีผล) ต่อ "ธาตุที่โดนโจมตี" ธาตุที่ไม่ระบุ = x1 ปกติ:

| ธาตุโจมตี | x2 (ต้าน) | x0.5 (ทน) | x0 (ไม่มีผล) |
|---|---|---|---|
| Normal | — | Rock, Steel | Ghost |
| Fire | Grass, Ice, Bug, Steel | Fire, Water, Rock, Dragon | — |
| Water | Fire, Ground, Rock | Water, Grass, Dragon | — |
| Electric | Water, Flying | Electric, Grass, Dragon | Ground |
| Grass | Water, Ground, Rock | Fire, Grass, Poison, Flying, Bug, Dragon, Steel | — |
| Ice | Grass, Ground, Flying, Dragon | Fire, Water, Ice, Steel | — |
| Fighting | Normal, Ice, Rock, Dark, Steel | Flying, Poison, Bug, Psychic, Fairy | Ghost |
| Poison | Grass, Fairy | Poison, Ground, Rock, Ghost | Steel |
| Ground | Fire, Electric, Poison, Rock, Steel | Grass, Bug | Flying |
| Flying | Grass, Fighting, Bug | Electric, Rock, Steel | — |
| Psychic | Fighting, Poison | Psychic, Steel | Dark |
| Bug | Grass, Psychic, Dark | Fire, Fighting, Poison, Flying, Ghost, Steel, Fairy | — |
| Rock | Fire, Ice, Flying, Bug | Fighting, Ground, Steel | — |
| Ghost | Ghost, Psychic | Dark | Normal |
| Dragon | Dragon | Steel | Fairy |
| Dark | Ghost, Psychic | Fighting, Dark, Fairy | — |
| Steel | Ice, Rock, Fairy | Fire, Water, Electric, Steel | — |
| Fairy | Fighting, Dragon, Dark | Fire, Poison, Steel | — |

**วิธี implement**: เก็บเป็น object เดียว `TYPE_CHART[attackType][defendType] = multiplier` (ไม่ระบุ = 1) —
`typeMultiplier(moveType, defenderType1, defenderType2)` เดิมของ ChaThaiTheCat (คูณสองรอบถ้ามี type2 กรณี
มอนสองธาตุ) reuse โครงสร้างเดิมได้เลย แค่เปลี่ยน source data จาก hexagon-cycle formula เป็น lookup ตารางนี้
แทน

### 3.6 Boss monsters (เจอเพิ่ม) — `TaleofChaThai/assets/monsters-bosses/` (✅ ก็อปปี้จริงแล้ว 18 ตัว)

พบชุดบอส **18 ตัว** (พอดีกับ 18 ธาตุ — ดูเหมือนตั้งใจให้เป็น "บอสประจำธาตุละ 1 ตัว" ไม่ใช่คู่วิวัฒนาการแบบสาย
wild) โครงสร้างไฟล์เหมือนกันทุกประการ (`slug.png`/`slug-move.gif`/`slug-move-sheet.png+json`) **แต่ไม่มี
`manifest.json` บอกธาตุกำกับไว้ตรง ๆ เหมือนชุดอื่น** — นี่คือธาตุที่เดาจากชื่อ (ยืนยันกับผู้สร้างก่อนใช้จริง):

| Boss | ธาตุที่เดา (จากชื่อ) |
|---|---|
| Apex Chimera | Normal |
| Caldera Emperor | Fire |
| Abyssal Tide Monarch | Water |
| Thundercoil Kaiser | Electric |
| Worldroot Elder | Grass |
| Absolute Zero Leviathan | Ice |
| Warfist Behemoth | Fighting |
| Plague Cauldron Hydra | Poison |
| Continent Maw | Ground |
| Tempest Roc Sovereign | Flying |
| Astral Eye Hierophant | Psychic |
| Hive Tyrant Mantis | Bug |
| Monolith Titan | Rock |
| Graveking Nocturn | Ghost |
| Voidcrown Bahamut | Dragon |
| Eclipse Devourer | Dark |
| Iron Cathedral Colossus | Steel |
| Empress Luminara | Fairy |

**⚠️ พบบั๊กสำคัญ (ต้องแจ้งผู้สร้าง)**: เช็คพิกเซลจริงแล้วพบว่า **`slug.png` (ภาพนิ่ง) ของบอสมีพื้นหลังโปร่งใส
ปกติ (alpha=0) แต่ `slug-move.gif` (แอนิเมชัน) ของบอส ทุกตัวที่สุ่มเช็ค กลับมีพื้นหลัง**สีขาวทึบ** (alpha=255)**
— ต่างจากชุดสัตว์ป่า 180 ตัวใน §3.1 ที่ทั้ง png และ gif โปร่งใสถูกต้องทั้งคู่ ถ้าเอา `slug-move.gif` ของบอสไป
ใช้ตรง ๆ ตามคำขอ (§3.2) จะเห็นเป็นกล่องสี่เหลี่ยมขาวทึบล้อมรอบตัวบอสตอนขยับ ไม่ใช่ตัวลอยเหนือฉากแบบที่ควรเป็น
— **ต้องแจ้งให้ผู้ผลิตบอส re-export GIF ใหม่ให้พื้นหลังโปร่งใส** (หรือรันสคริปต์ลบพื้นหลังสีขาวทึบเพิ่มเฉพาะ
ชุดบอสนี้ก่อนใช้จริง) — ไม่ใช่ปัญหาของสัตว์ป่า 180 ตัวอื่น ๆ ที่พร้อมใช้แล้วจริง ณ ตอนนี้ ใช้ `slug.png` (ภาพนิ่ง)
ของบอสไปพลางก่อนได้ถ้าอยากขึ้นเกมโดยไม่รอแก้ gif

### 3.7 วางบอสในฉากจริง — เดินเข้าไปสู้ได้ ชนะแล้วได้มาเป็นพวก

ตามคำขอ: บอสต้อง **โผล่เป็นตัวจริงในฉาก** (ไม่ใช่แค่การ์ดใน MonsterDic) เดินเข้าไปชนแล้วสู้ได้ และ **ชนะแล้ว
ต้องได้มาเป็นสมาชิกปาร์ตี้** — ข่าวดีคือ **ChaThaiTheCat เดิมมีกลไกนี้อยู่แล้วเป๊ะ ๆ** (`GYM_RECRUIT` +
`resolveBossRecruit()` ใน `js/engine.js` — ใช้กับ `volcano_king`/`tidal_emperor` ตอนนี้) ก็อปปี้ pattern มาใช้
ตรง ๆ ได้เลย ไม่ต้องคิดกลไกใหม่:

```js
// engine.js — ต่อยอดจาก enterField/moveFieldPlayer เดิม, ก็อปปี้ pattern จาก GYM_RECRUIT ของ ChaThaiTheCat
const FIELD_BOSSES = {
  fire: { s: 'boss_caldera_emperor', lvl: 30, npcId: 'caldera_emperor_boss' },
  // ... อีก 17 ธาตุ ตารางเดียวกับ §3.6
};
// ตอนชนะ battle ที่ trainerNpc ตรงกับ boss id ให้ตั้ง b.recruitOffer เหมือนที่ advanceEnemyOrEndBattle()
// ทำกับ GYM_RECRUIT อยู่แล้ว (§ล่าง) — resolveBossRecruit(accept) ใช้ซ้ำได้ทั้งฟังก์ชันไม่ต้องแก้อะไรเลย
```

**ตำแหน่งวางในฉาก (ตอบ "บริเวณที่เหมาะสม" ตรง ๆ)** — เจอจุดเชื่อมที่ลงตัวมากจากข้อมูลที่มีอยู่แล้ว: ไฟล์
`chathai-world-map.json` (§2.1) มี `progression_gates` **4 จุด** ที่ตั้งชื่อไว้แล้ว และตรงกับธาตุบอสพอดี —
**ใช้ 4 บอสนี้เป็น "ผู้พิทักษ์ประตู" กั้นทางจริง ๆ เดินผ่านไม่ได้จนกว่าจะชนะ** (เหมือน Gym Leader ที่บล็อกทาง):

| Progression Gate | บอสที่ควรเฝ้า | เหตุผล |
|---|---|---|
| `dragon-mountain-pass` | Voidcrown Bahamut (Dragon) | ชื่อ gate ตรงธาตุเป๊ะ |
| `steel-city-bridge` | Iron Cathedral Colossus (Steel) | ชื่อ gate ตรงธาตุเป๊ะ |
| `ground-canyon-gate` | Continent Maw (Ground) | ชื่อ gate ตรงธาตุเป๊ะ |
| `water-cascade-temple` | Abyssal Tide Monarch (Water) | ชื่อ gate ตรงธาตุเป๊ะ |

อีก **14 บอสที่เหลือ** (ไม่มี gate ชื่อระบุไว้ตรง ๆ) แนะนำวางที่ **screen ลึกสุดของธาตุตัวเอง** (เช่น
`fire_field_2`/screen depth สูงสุดตามธาตุ ถ้าตั้งชื่อไฟล์ตาม pattern เดียวกับ §2.2) เป็น "ผู้พิทักษ์ท้ายด่าน"
ของแต่ละภูมิภาค ไม่บล็อกทางแบบ 4 ตัวแรก — เดินเข้าไปสู้ได้ตามใจ ไม่ใช่ต้องผ่านเพื่อไปต่อ

**ขนาด/การแสดงผลในฉาก**: ใหญ่กว่า trainer NPC ปกติ (§6 ใช้ 56px) ให้รู้สึกว่าเป็นบอสจริง — แนะนำ
**ความสูงเป้าหมาย 96-112px** (~3-3.5 tile ที่ 32px/tile) ใช้ CSS pattern เดียวกับ §6.2 (`object-fit: contain`,
`image-rendering: pixelated`, ยึดขอบล่างที่ตำแหน่ง tile) แค่ตัวเลข `height` ต่างกัน — ใช้ `slug-move.gif`
เป็นค่าเริ่มต้น (fallback `slug.png` ถ้ายังไม่ได้แก้บั๊กพื้นหลังตาม §3.6)

**ทีมต่อสู้**: แนะนำให้บอสสู้เดี่ยว 1 ตัว (ไม่ใช่ trio แบบ Dojo เดิม เพราะมีบอสแค่ตัวเดียวต่อธาตุ ไม่มีสาย
รองให้ทำ trio) — ถ้าอยากได้ความยากเพิ่ม ใส่มอนป่า 2 ตัวจากธาตุเดียวกัน (จาก §3.1) เป็นด่านอุ่นเครื่องก่อนถึง
บอสตัวจริงก็ได้ (optional)

**เรื่อง recruit ซ้ำ — ข้อเสนอต่างจาก ChaThaiTheCat เดิมเล็กน้อย**: ของเดิม (`GYM_RECRUIT`) เสนอ recruit
ใหม่ได้ทุกครั้งที่สู้ชนะซ้ำ (ไม่มีการจำกัด) — สำหรับบอสในฉาก 18 ตัวนี้ แนะนำ**เก็บสถานะ "recruited" ถาวรต่อบอส**
(เช่น `state.recruitedBosses[bossId] = true`, เซฟ/โหลดด้วย) แล้วให้ NPC ในฉากหายไป/ไม่ท้าซ้ำอีกหลัง recruit
สำเร็จ — กันการปั๊มบอสตัวเดิมซ้ำไม่จำกัด (ChaThaiTheCat เดิมมีแค่ 2 บอสแบบนี้ ผลกระทบน้อย แต่ TaleofChaThai
มี 18 ตัว ถ้าไม่กันซ้ำผู้เล่นจะปั๊มตัวเดิมได้ทีมเต็ม 6 ตัวจากบอสเดียว)

## 4. เมนูที่ต้อง update ให้สอดคล้องกับ 18 ธาตุ

นี่คือคำขอหลักของ session นี้ — ไล่ทีละเมนูที่มีอยู่ใน ChaThaiTheCat เดิม บอกว่าต้องเปลี่ยนอะไรบ้าง (แนวทาง
ทั่วไปคือ **reuse โครงสร้าง/pattern render function เดิมเป๊ะ แค่เปลี่ยนแหล่งข้อมูลที่มันวนลูป**):

### 4.1 MonsterDic (สารานุกรม)

- ChaThaiTheCat เดิม: การ์ดเดียวยาว ไม่มี filter, ไล่ตาม `Object.values(SPECIES)` ทั้ง 204 ตัวรวด
- TaleofChaThai: **ต้องเพิ่ม filter tab ตาม 18 ธาตุ** (204 ตัวยังพอไล่ดูรวดเดียวได้ แต่ถ้าเกมนี้จบสมบูรณ์จะมี
  180 สปีชีส์ขึ้นไป (18×10) + fusion เพิ่มอีก — เยอะกว่าเดิม ควรมี filter chip ให้กดเลือกดูทีละธาตุแทนเลื่อน
  ยาว) เลข Dex เรียงตาม category order เดียวกับ `manifest.json` (element ก่อน แล้ว type) เพื่อให้ตรงกับลำดับ
  ที่ asset ถูกผลิตมา

### 4.2 Evolution Chart

- ChaThaiTheCat เดิม: 3 สเตจต่อสาย, จัดกลุ่มตาม starter/wild-line/fusion
- TaleofChaThai: **จำนวนสเตจไม่คงที่แล้ว** (แก้ตาม §3.1) — สายจาก `sprites-pixel` ใหม่ส่วนใหญ่จะมี 2 สเตจ
  (การ์ดสั้นกว่าเดิม) แต่สายไหนที่ยืม/ผลิตมาครบ 3 สเตจก็แสดง 3 การ์ดตามจริง — การ์ด render ต้องใช้
  `sp.evolvesTo` chain วนจนสุดสาย (ไม่ fix ที่ 2 หรือ 3) แทนการ hardcode จำนวนคอลัมน์ จัดกลุ่ม
  ตาม 18 ธาตุแทน 6 ธาตุ — ฟังก์ชัน render เดิม (`renderEvolution()`) reuse ได้เกือบทั้งหมด แค่ปรับ loop จาก
  fix 3 คอลัมน์เป็น 2 คอลัมน์

### 4.3 Movepool

- ต้องรองรับ **18 การ์ดกลุ่มธาตุ × 10 สายต่อกลุ่ม = 180 การ์ด** (ChaThaiTheCat เดิมมี 92 การ์ดรวมทุกหมวด) —
  ใช้ grid/style เดิมได้ (ออกแบบมารองรับ MonsterDic 204 การ์ดอยู่แล้ว ขนาดใกล้เคียงกัน) แค่ข้อมูลที่ดึงมาโชว์
  ต้องมาจาก species/movepool ชุดใหม่ทั้งหมด

### 4.4 Region Map (สำคัญที่สุด — เปลี่ยนบทบาทจากเมนูเสริมเป็นเมนูหลัก)

- ChaThaiTheCat เดิม: Region Map เป็น CSS-grid thumbnail 13 ช่องที่ประกอบเอง (ตาม
  `GAME_DESIGN_OVERWORLD_FIRERED.md` §10.2), fog-of-war ตาม `state.visited`
- TaleofChaThai: **ใช้ภาพทวีปจริง `chathai-world-map.png` เป็นพื้นหลังเต็มจอแทน CSS-grid** วางหมุด/ปุ่มทับ
  ตามพิกัด `center: [x,y]` จาก JSON ตรง ๆ (คำนวณ `left/top` เป็น % จาก normalized coordinate ได้เลย ไม่ต้อง
  เดาตำแหน่งแบบที่ ChaThaiTheCat เดิมต้องกะเอง) — **เอากฎ "ต้องสำรวจเจอก่อนถึงจะ fast-travel ได้"
  จาก `GAME_DESIGN_OVERWORLD_FIRERED.md` §11 มาใช้ตั้งแต่ต้นเลย** (ไม่ต้องแก้ทีหลังเหมือน ChaThaiTheCat ที่
  เจอปัญหานี้ตอนหลัง) — โซนที่ยังไม่ visited แสดงเทา/มืดตามภาพทวีปจริง (grayscale filter ทับพื้นที่นั้น)

### 4.5 Guide

- ChaThaiTheCat เดิม auto-generate จากอ่าน `WORLD_NODES`/`GYMS`/`WILD_MOBS` สด ๆ ทุกครั้ง (`renderGuide()`)
  — ถ้าโครงสร้างข้อมูลใหม่ของ TaleofChaThai ตั้งชื่อ field ให้ตรง pattern เดิม (`regions`/`dojos`/
  `wildSpecies`) ฟังก์ชันนี้ก็ reuse ได้แทบไม่ต้องแก้เลย ไม่ต้องเขียนใหม่

### 4.6 Status screen

- ไม่กระทบจากการเปลี่ยนธาตุ (แสดงข้อมูลต่อตัว ไม่ได้ loop ตามธาตุ) — reuse ตรง ๆ ได้ แค่ต้องรองรับ
  `spriteFrames` แบบใหม่ถ้าเลือกวิธี sprite-sheet-native renderer ตาม §3.2

## 5. ระบบที่ควร fork มาเลย (reuse ทั้งดุ้น ความเสี่ยงต่ำ)

โค้ดเหล่านี้เป็น **infrastructure ทั่วไป ไม่ผูกกับจำนวนธาตุ** — ก็อปปี้มาเป็นจุดเริ่มต้นได้เลย ไม่ต้องคิดใหม่:

- **Battle engine**: turn order ตาม SPD, สูตรดาเมจ, ระบบสเตตัส 6 แบบ (burn/atkDown/defDown/spdDown/
  paralyze/accDown), 4-move-slot learning, catch mechanic
- **Animation/FX layer**: battle beats, HP bar tween, particle burst, screen shake, claw/projectile/glyph FX
  (`TYPE_COLOR`/`TYPE_PARTICLE` ต้องขยายจาก 6 เป็น 18 ธาตุ แต่โครงสร้างเดิมใช้ได้เลย)
- **Audio engine**: BGM synthesis (`generate_bgm_v2.py`), SFX synthesis ผ่าน Web Audio (`playSfx`), stereo
  panning + reverb bus — เพลง/เสียงใหม่ต้อง generate เพิ่มสำหรับโซนใหม่ 18 ธาตุ แต่ engine เดิม reuse ได้
- **Fusion/Jogress mechanic**: กลไกเดิม (ต้อง Stage สุดท้าย + เลเวลถึงเกณฑ์ + Fusion Core) reuse ได้ — แต่
  **อย่าเปิดฟิวชันทุกคู่ธาตุ** (C(18,2) = 153 คู่ เยอะเกินจะ balance ไหว) แนะนำจำกัดแค่คู่ธาตุที่ "อยู่ติดกัน
  บนแผนที่ทวีปจริง" (คำนวณจากระยะห่างพิกัด `center` ใน §2.1 — คู่ไหน `center` ใกล้กันสุดถือว่า "ติดกัน" ได้
  สูตรฟิวชัน) จำนวนใกล้เคียงกับ 26 สูตรเดิมของ ChaThaiTheCat ไม่ใช่ 153

## 6. Trainer NPC sprites (เจอเพิ่ม) — ใช้แทน emoji ของศัตรูที่เจอตามฉาก

พบ `assets/sprites-pixel/trainers/` — **ชุดสไปรต์ Trainer NPC 30 คน** สไตล์ pixel art เดียวกับแผนที่/
มอนสเตอร์ทุกประการ ก็อปปี้มาไว้ที่ `TaleofChaThai/assets/npc-trainers/` แล้ว (✅ ก็อปปี้จริง 30 คนแล้ว) ใช้แทน emoji
(`🧑‍🌾`/`🧑‍🚒` ฯลฯ) ที่ระบบ Trainer เส้นสายตา (`GAME_DESIGN_OVERWORLD_FIRERED.md` §5.6) ใช้อยู่ตอนนี้

### 6.1 สิ่งที่มีจริง

- แต่ละคนอยู่ที่ `trainers/<slug>/<slug>.png` — **พื้นหลังโปร่งใสจริงแล้ว** (เช็ค alpha channel มุมภาพ = 0
  ยืนยันแล้ว) **ใช้ได้ทันทีโดยไม่ต้องลบพื้นหลังเพิ่ม** ต่างจากสไปรต์มอนสเตอร์ใน §3.2 ที่ต้องลบพื้นหลังก่อน
- ขนาดภาพต้นฉบับใหญ่ ~250-320px กว้าง × 370-490px สูง (ท่ายืนเต็มตัว มุมกล้อง "three-quarter-front" อิงจาก
  `manifest.json` field `battle_pose`) — สัดส่วนกว้าง:สูงไม่เท่ากันทุกคน ต้อง scale โดยรักษาสัดส่วนเดิม
  (`object-fit: contain`, กำหนดแค่ความสูงเป้าหมาย ปล่อยความกว้าง auto)
- มี `trainers-battle-sheet.png` + `.json` (contact sheet รวมทุกคน พร้อมพิกัด crop) ด้วย — เก็บไว้เผื่อทำ
  หน้าจอ "แนะนำตัวก่อนสู้" (เทียบเท่าตอน ChaThaiTheCat เดิมขึ้นข้อความ "Cat Scout Piti wants to battle!")
  แต่ไม่ใช่ของที่ต้องใช้ตอนเดินในฉาก — ใช้ไฟล์เดี่ยว `<slug>/<slug>.png` พอ

### 6.2 ทำ size ให้เข้ากับฉาก (ตอบคำขอตรง ๆ)

Field map ใช้ tile 32px (§2.2) — ตัวละครยืนบนฉากทั่วไปควรสูงประมาณ **1.5-2 tile (48-64px)** ถึงจะดูสมส่วน
กับกริด (สูตรเดียวกับที่ ChaThaiTheCat เดิมใช้กับสไปรต์ผู้เล่นเอง ~54px ตาม `GAME_DESIGN.md` เดิม หัวข้อ
"ตัวละครเด่นขึ้นในฉากเดิน") **แนะนำตั้งความสูงเป้าหมายไว้ที่ 56px**:

```css
.field-trainer-npc {
  height: 56px;      /* ค่าคงที่ — ประมาณ 1.75 tile ที่ 32px/tile */
  width: auto;        /* ปล่อยให้กว้างตามสัดส่วนจริงของแต่ละคน ไม่บังคับเท่ากันหมด */
  object-fit: contain;
  image-rendering: pixelated;  /* สำคัญ — ภาพเป็น pixel art จริง ต้องคมตอน scale ลง ไม่ใช่ blur แบบภาพ jpg เดิม */
}
```

**จุดยึดตำแหน่ง**: ให้ยึดที่ขอบล่างของภาพ (เท้าตัวละคร) ตรงกับพิกัด tile ที่ NPC ยืนอยู่ ไม่ใช่กึ่งกลางภาพ
(ภาพเป็นคนยืนเต็มตัว หัวจะสูงเกิน 1 tile ขึ้นไปเสมอ ถ้ายึดกึ่งกลางจะดูเหมือนตัวละครลอยขึ้นจากพื้น)

### 6.3 จับคู่ Trainer กับธาตุ/โซน — 20 จาก 30 คนตรงธีมชัดเจน

| Trainer | ธาตุที่เข้ากับชื่อ | หมายเหตุ |
|---|---|---|
| Fire Smith | Fire | |
| Electric Technician | Electric | |
| Poison Alchemist | Poison | |
| Psychic Stage Magician | Psychic | |
| Steel Security Officer | Steel | |
| Dragon Shrine Guardian | Dragon | เหมาะเป็นบอส/trainer เด่นของ Dragon Dojo (ธาตุที่ยังขาดมอนสเตอร์ตาม §3.4 — ได้ตัวละคร NPC ไว้ก่อนแล้ว รอแค่มอน) |
| Ghost Storyteller | Ghost | |
| Fairy Festival Performer | Fairy | |
| Martial Arts Student | Fighting | |
| Bug Researcher | Bug | |
| Snow Ranger | Ice | |
| Quarry Foreman | Rock | |
| Harbor Fisher, Canal Sailor | Water | มี 2 คน ใช้แยกโซนย่อย (Coral Shallows vs Moonlit Water Capital ก็ได้) |
| Forest Herbalist, Flower Gardener | Grass | มี 2 คนเหมือนกัน |
| Bird Keeper | Flying | |
| Elder Naturalist | Normal | เหมาะเป็น NPC ต้อนรับที่หมู่บ้านเริ่มเกม (`starting_region: normal`) |
| Desert Nomad | Ground (เดา — ธีมทะเลทรายเข้ากับ ground มากสุด) | |
| Night Courier | Dark (เดา — ธีมกลางคืน) | |

**เหลืออีก 10 คนเป็น "flavor trainer" ทั่วไป** ไม่ผูกธาตุชัดเจน (Trail Scout, Young Inventor, Mountain
Hiker, Street Dancer, School Prefect, Cafe Courier, Ruin Archaeologist, Punk Drummer, **Veteran Champion**,
Traveling Chef) — ใช้เกลี่ยเป็น NPC เสริมในทุกโซนให้มีความหลากหลาย ไม่ต้องเจอ trainer ธีมเดียวซ้ำทุกจุด
**Veteran Champion ชื่อสื่อชัดว่าออกแบบมาเป็น trainer ไม้ตายท้ายเกม** — แนะนำเก็บไว้ใช้เป็นคู่ต่อสู้สุดท้าย
ที่ธาตุ `dragon` (จุดจบของ `endgame_route`) แทนที่จะเอาไปปนกับ trainer ทั่วไปกลางเกม

## 7. Checklist สรุปงานเริ่มต้น (ทำตามลำดับนี้)

1. สร้างโครงโปรเจกต์ `TaleofChaThai/` (index.html + css/style.css + js/data.js,engine.js,ui.js,main.js,
   audio.js) โดย **ก็อปปี้โครงจาก ChaThaiTheCat มาเป็นจุดเริ่ม** (ไม่ import ข้ามโฟลเดอร์)
2. ~~ก็อปปี้ asset~~ **✅ เสร็จแล้ว** — ก็อปปี้และจัดหมวดหมู่ครบทั้ง 6 หมวดแล้วจริง (`player-trainers/`,
   `npc-trainers/`, `monsters-wild/`, `monsters-bosses/`, `world-map/`, `region-maps/`) ดู §8 ท้ายเอกสาร
   สำหรับ asset catalog ฉบับเต็ม (path จริง + จำนวนไฟล์ต่อหมวด) ไม่ต้องก็อปปี้เองอีก
3. ใช้ `.gif` ตรง ๆ ตามที่แก้ไว้ใน §3.2 (ไม่ต้องเขียน renderer ตัด sprite-sheet ไม่ต้องลบพื้นหลัง — ของพร้อม
   ใช้แล้วจริงยกเว้น boss gif ที่มีบั๊กพื้นหลังตาม §3.6)
4. Author `ground`/`npcs`/`warps` ให้ครบ **เฉพาะ 5 ธาตุใน `endgame_route` ก่อน** (normal/fighting/psychic/
   ice/dragon) — อย่าเพิ่งทำครบ 18 ธาตุตั้งแต่วันแรก ให้ story หลักเล่นจบได้ก่อนค่อยขยายโซนสำรวจเสริม
5. ~~ผลิตมอนสเตอร์ธาตุ Dragon เพิ่ม~~ **✅ เสร็จแล้ว** — `type/dragon` มีครบ 10 ตัวแล้ว (§3.1/§3.4) ข้ามข้อ
   นี้ไปได้เลย เส้นทางหลักทั้ง 5 ธาตุพร้อม Author ground/npcs/warps + ทำ Dojo ได้ทันที (Fire/Grass/Ghost ที่
   ยังขาดอยู่นอกเส้นทางหลัก ไม่บล็อกอะไร ทำทีหลังได้)
6. ตั้งชื่อท่า/หา type chart จริงมาใส่ (§3.3) — งาน content generation ใหญ่สุดของทั้งโปรเจกต์
7. Region Map (§4.4) ทำก่อนเมนูอื่น เพราะเป็นจุดที่ต่างจาก ChaThaiTheCat เดิมมากที่สุดและเป็นเมนูหลักของเกมนี้
8. MonsterDic/Evolution/Movepool/Guide ตามหัวข้อ 4 ที่เหลือ — งานปรับโครงสร้างข้อมูล ไม่ใช่งานออกแบบใหม่

## 8. Asset Catalog — ก็อปปี้และจัดหมวดหมู่จริงแล้ว (`TaleofChaThai/assets/`)

> ✅ **ทำจริงแล้ว ไม่ใช่แค่แผน** — ก็อปปี้ไฟล์จริงจาก `ChaThaiTheCat/assets/` มาไว้ที่ `TaleofChaThai/assets/`
> เรียบร้อยแล้ว จัดเป็น **7 หมวดชัดเจน** (ตรวจนับไฟล์ยืนยันครบถ้วนหลังก็อปปี้) — โฟลเดอร์ตั้งชื่อใหม่ให้อ่านง่าย
> กว่าโครงสร้างต้นฉบับที่ ChaThaiTheCat ใช้ (เช่น `sprites-pixel/wild/production` → `monsters-wild`)

| # | หมวด | Path | จำนวน | เนื้อหา |
|---|---|---|---|---|
| 1 | ตัวละครผู้เล่น | `assets/player-trainers/` | 50 ไฟล์ | Kai/Amara/Dr. Mira/Leo/Ren — ภาพเต็มตัว (`-full.png`), ภาพ SD เดินฉาก (`-sd.png`), และโฟลเดอร์ `walk/` (สไปรต์เดิน 8 เฟรม/คน) |
| 2 | Trainer NPC ในฉาก | `assets/npc-trainers/` | 30 โฟลเดอร์ | Trainer archetype ต่อสู้ได้ระหว่างเดิน (Fire Smith, Dragon Shrine Guardian ฯลฯ) — ดูตารางจับคู่ธาตุที่ §6.3 |
| 3 | มอนสเตอร์ป่า (จับได้) | `assets/monsters-wild/` | 180 สปีชีส์ (18 ธาตุ × 10) | โครงสร้างเดิม `{group}/{category}/{slug}/` คงไว้ (element/type ตาม `manifest.json`) — แต่ละตัวมี png นิ่ง + move.gif + move-sheet |
| 4 | มอนสเตอร์บอส | `assets/monsters-bosses/` | 18 โฟลเดอร์ (1 ตัว/ธาตุ) | ดูตารางจับคู่ธาตุที่ §3.6 — ⚠️ gif มีบั๊กพื้นหลังขาวทึบ ยังไม่แก้ |
| 5 | แผนที่โลก (ภาพรวม) | `assets/world-map/` | 2 ไฟล์ | `chathai-world-map.png` + `.json` — ใช้ทำเมนู Region Map ตาม §2.1 |
| 6 | แผนที่โซนเดินได้ | `assets/region-maps/` | 36 โฟลเดอร์ (18 ธาตุ × 2 screen) | โครงสร้างเดิม `{group}/{category}/{slug}/` คงไว้ — ใช้ทำ `FIELD_MAPS` ตาม §2.2 |
| 7 | **มอนสเตอร์รุ่นเก่าจาก ChaThaiTheCat (เจอเพิ่ม)** | `assets/monsters-legacy-chathaithecat/` | 204 สปีชีส์ (6 ธาตุเดิม) | ภาพวาด/GIF สไตล์เดิมของ ChaThaiTheCat ทั้งหมด — ดูรายละเอียดที่ §9 ด้านล่าง |

**รวมทั้งหมด ~580MB, ~1,900+ ไฟล์** — ยืนยันจำนวนแล้วตรงกับที่บันทึกไว้ในเอกสารทุกจุดก่อนหน้านี้ (180 มอนสเตอร์
ป่า, 18 บอส, 30 NPC, 36 แผนที่โซน, 204 มอนสเตอร์รุ่นเก่า) ไม่มีไฟล์ขาดหาย

**หมายเหตุ**: หมวด 3 และ 6 ยังคงโครงสร้างย่อย `{group}/{category}/{slug}/` ไว้เหมือนต้นฉบับ (ไม่ได้ flatten)
เพราะโค้ด/JSON metadata (`manifest.json`, `-move-sheet.json` ฯลฯ) อ้างอิง path แบบสัมพัทธ์กับโครงสร้างนี้อยู่
— เปลี่ยนแค่ชื่อโฟลเดอร์ระดับบนสุด (`monsters-wild`/`region-maps`) ไม่ได้แตะโครงสร้างข้างในเพื่อไม่ให้ path
ในไฟล์ JSON คลาดเคลื่อน

## 9. มอนสเตอร์รุ่นเก่าจาก ChaThaiTheCat — ย้ายมาแล้ว แต่มีเรื่องต้องตัดสินใจก่อนใช้จริง

ตามคำขอ ก็อปปี้ `ChaThaiTheCat/assets/sprites/{normal,nature,electric,shadow,gym-bosses,fusion,wild}/` ทั้งหมด
มาไว้ที่ `TaleofChaThai/assets/monsters-legacy-chathaithecat/` แล้ว (✅ ทำจริง 204 สปีชีส์ — ตรงกับที่นับไว้ใน
`CHATHAITHECAT_MONSTERS_PIXEL_TODO.md` เป๊ะ: 18 สาย starter/main + 10 gym boss + 150 สาย wild + 26 fusion)
โครงสร้างย่อยคงไว้เหมือนต้นฉบับทุกประการ:

```
monsters-legacy-chathaithecat/
  normal/       — Meowlk/ChaCha/ChaThai (stage1-3.png)
  nature/       — Sproutail/Bloomtiger/Junglord (stage1-3 + 12-เฟรม f0-f11 ต่อสเตจ)
  electric/     — Sparkit/Voltabby/Thundermane (เหมือนกัน)
  shadow/       — Duskit/Nightprowl/Eclipsemaw (เหมือนกัน)
  gym-bosses/   — 10 บอส (4 เฟรมต่อตัว) — Fire/Water line ตัวจริงก็ยืมภาพจากตรงนี้เหมือนเกมต้นฉบับ
  fusion/       — 6 fusion หลัก (ภาพนิ่ง) + fusion/wild/ 20 fusion จากสาย wild (4 เฟรม)
  wild/         — 5 โซน (volcanic-canyon/coral-shallows/whispering-root-cavern/thunder-plains/shadow-cave)
                  50 สาย × 3 สเตจ × 4 เฟรม (ข้าม wild/fire กับ wild/water เดิมที่เป็นไฟล์ค้างไม่ได้ใช้แล้ว —
                  ดู PIXEL_ASSETS_INTEGRATION.md/CHATHAITHECAT_MONSTERS_PIXEL_TODO.md §5 ที่เคยเตือนไว้)
```

### ⚠️ เรื่องที่ต้องตัดสินใจก่อนเอาไปใช้จริงในเกม (ไม่ใช่แค่ก็อปปี้ไฟล์มาวางเฉย ๆ)

**สไตล์ภาพไม่ตรงกับของใหม่** — ชุดนี้เป็นภาพวาด AI แบบสมจริง/painterly + GIF (จากเทคนิค temporal-mask) ส่วน
มอนสเตอร์/แผนที่/บอสชุดใหม่ทั้งหมดของ TaleofChaThai (หมวด 3-6) เป็น **pixel art ล้วน** — เอามาปนกันตรง ๆ ใน
โลกเดียวกันจะดู "ไม่เข้าธีม" ทันที (ตัวหนึ่งวาดสมจริง ยืนข้างตัวที่เป็นพิกเซล) เหมือนที่เคยเตือนไว้ตอนแนะนำ
`sprites-pixel/trainers` (§6) ว่าใช้ `image-rendering: pixelated` — ของเก่าชุดนี้**ไม่ควรใส่ `pixelated`**
เพราะไม่ใช่พิกเซลอาร์ตจริง ใส่แล้วจะยิ่งดูแปลก

**แนะนำ 3 แนวทางที่เป็นไปได้ (ให้ผู้สร้างเลือก ไม่ฟันธงเอง)**:
1. **ใช้เป็น source อ้างอิงผลิตซ้ำเป็นพิกเซล** (ตรงกับที่ `CHATHAITHECAT_MONSTERS_PIXEL_TODO.md` เตรียม
   checklist ไว้ให้แล้ว) — วาดใหม่ให้เข้าสไตล์ 18 ธาตุ เก็บไว้เป็นแค่ reference ไม่ใช้ตรง ๆ ในเกมจริง (ปลอดภัย
   สไตล์เข้ากันหมด แต่ใช้เวลาผลิตเพิ่ม)
2. **ทำเป็นโซน "Legacy"/"Old World" แยกต่างหาก** — กันพื้นที่ในแผนที่ทวีป (หรือทำเป็น secret dungeon/dimension
   คนละมิติ) ที่ตั้งใจให้ภาพสไตล์ไม่ตรงกันเป็นส่วนหนึ่งของธีม ("โลกเก่า" vs "โลกใหม่") — ไม่ต้องผลิตใหม่เลย ใช้
   ของเดิมได้ทันที แต่ต้องออกแบบเนื้อเรื่อง/gameplay รองรับความต่างสไตล์
3. **ไม่ใช้ในเกมเลย เก็บไว้เป็น bonus/crossover เท่านั้น** (เช่น Easter egg, artwork gallery ในเมนู, หรือ
   ของสะสมพิเศษไม่เกี่ยวกับ gameplay) — เสี่ยงน้อยสุด ไม่กระทบความสม่ำเสมอทางภาพของเกมหลักเลย

**ยังไม่ตัดสินใจแทนว่าจะใช้ทางไหน** — ไฟล์พร้อมใช้แล้วทั้งหมดที่ `assets/monsters-legacy-chathaithecat/` แค่
ต้องเลือกแนวทางก่อนเขียนโค้ดผูกเข้าระบบจริง (ต่างจากหมวด 1-6 ที่ระบุวิธีใช้ชัดเจนแล้วในเอกสารส่วนอื่น)
