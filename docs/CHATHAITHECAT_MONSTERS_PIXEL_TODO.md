# ChaThaiTheCat — มอนสเตอร์ที่ยังไม่มีเวอร์ชัน Pixel Art (checklist สำหรับผลิตเพิ่ม)

> เช็คโค้ดจริงจาก `ChaThaiTheCat/js/data.js` (ไม่ได้เดา) แล้วเทียบกับ `sprites-pixel/wild/production/` —
> **สรุปสั้น ๆ ก่อน: ไม่มีมอนสเตอร์ตัวไหนในเกม ChaThaiTheCat ทั้ง 204 ตัวมีเวอร์ชัน pixel art เลยสักตัวเดียว**
> เพราะ `sprites-pixel` เป็นคนละชุดออกแบบทั้งหมด (ชื่อ/คอนเซปต์ใหม่ล้วน เช่น cowl-crow, dusk-weasel — ไม่ใช่
> การวาด Meowlk/Emberpaw ฯลฯ ใหม่เป็นสไตล์พิกเซล) — เอกสารนี้จัดลำดับความสำคัญให้ว่าควรวาดตัวไหนก่อน แทนที่
> จะโยนรายชื่อ 204 ตัวมาเฉย ๆ

## ลำดับความสำคัญที่แนะนำ

1. **6 สาย Starter/Main** (18 ตัว) — เป็นหน้าเป็นตาเกม ควรทำก่อนสุด โดยเฉพาะ Fire/Water ที่ตอนนี้ยังไม่มี
   ภาพของตัวเอง (ยืมภาพ gym boss มาใช้ชั่วคราว)
2. **10 Gym Boss** — เจอบ่อย จำง่าย เป็นจุดไคลแมกซ์ของแต่ละโซน
3. **50 สาย Wild x 3 สเตจ = 150 ตัว** — เยอะสุด แบ่งเป็น 5 โซน โซนละ 10 สาย ทำเป็นชุด ๆ ไปทีละโซนได้
4. **26 Fusion** — ทำทีหลังสุด เพราะเป็นภาพ composite จากพ่อแม่ที่อยู่ใน 3 ข้อบนอยู่แล้ว วาดง่ายขึ้นถ้าพ่อแม่
   มีภาพ pixel พร้อมแล้ว (ผสมกันตามธีม)

---

## 1. หกสาย Starter/Main (18 ตัว)

| ธาตุ | Stage 1 (Lv1) | Stage 2 (Lv16) | Stage 3 (Lv36) | ตอนนี้มีภาพอะไรอยู่ |
|---|---|---|---|---|
| Normal | Meowlk | ChaCha | ChaThai | มีภาพวาดจริงแล้ว (ไม่ใช่ pixel) |
| Fire | Emberpaw | Blazewhisker | Solaris Mane | **ยืมภาพ gym boss (Cinderclaw/Pyre Duchess/Volcano King) ใช้ชั่วคราว ไม่มีภาพของตัวเอง** — priority สูงสุด |
| Water | Dripkit | Koiwhisker | Tsunamane | **ยืมภาพ gym boss (Reefblade/Abyss Oracle/Tidal Emperor) ใช้ชั่วคราว ไม่มีภาพของตัวเอง** — priority สูงสุด |
| Nature (starter) | Sproutail | Bloomtiger | Junglord | มีภาพวาดจริง + แอนิเมชัน 12 เฟรม |
| Electric (starter) | Sparkit | Voltabby | Thundermane | มีภาพวาดจริง + แอนิเมชัน 12 เฟรม |
| Shadow (starter) | Duskit | Nightprowl | Eclipsemaw | มีภาพวาดจริง + แอนิเมชัน 12 เฟรม |

## 2. สิบ Gym Boss

| ชื่อ | ธาตุ | Dojo |
|---|---|---|
| Thornwarden | Nature | Leaf Dojo (tier 1) |
| Bloomshade | Nature | Leaf Dojo (tier 2) |
| Elderbloom Monarch | Nature | Leaf Dojo (tier 3) |
| Cinderclaw | Fire | Ember Dojo (tier 1) |
| Pyre Duchess | Fire | Ember Dojo (tier 2) |
| Volcano King | Fire | Ember Dojo (tier 3) |
| Reefblade | Water | Tide Dojo (tier 1) |
| Abyss Oracle | Water | Tide Dojo (tier 2) |
| Tidal Emperor | Water | Tide Dojo (tier 3) |
| Electric Duelist | Electric | Volt Dojo (tier 3) |

## 3. ห้าสิบสาย Wild x 3 สเตจ (150 ตัว) — แบ่งตามโซน

สเตจ 2/3 ใช้ชื่อ prefix ร่วม (`Greater <ชื่อ>` / `Elder <ชื่อ>`) ไม่ใช่ชื่อเดี่ยว ๆ — วาดแค่ 3 เวอร์ชันความ
แข็งแกร่งไล่ระดับของสัตว์ตัวเดิม (ตัวใหญ่ขึ้น/ดุขึ้น/มีลวดลายเพิ่ม ตามธรรมเนียม evolve เดิม)

### Volcanic Canyon (Fire)
Magma Gecko · Ash Bat · Ember Crab · Obsidian Beetle · Lava Slug · Smoke Imp · Basalt Ram · Cinder Hawk ·
Coal Mole · Fire Salamander

### Coral Shallows (Water)
Pearl Seahorse · Coral Hermit · Jelly Sprite · Reef Puffer · Sea Star Imp · Shell Turtle · Ribbon Eel ·
Tiny Manta · Bubble Octopus · Coral Shrimp

### Whispering Root Cavern (Nature)
Moss Mouse · Mushroom Sprite · Root Serpent · Glow Beetle · Acorn Goblin · Vine Spider · Crystal Snail ·
Fern Frog · Bark Owl · Seedling Golem

### Thunder Plains (Electric)
Spark Cat · Storm Hare · Compass Scarab · Cloud Ram · Bolt Gecko · Thunder Bird · Battery Slime ·
Electric Mole · Storm Crow · Static Fox

### Shadow Cave (Shadow)
Moon Bat · Obsidian Spider · Ghost Flame · Cave Goblin · Crystal Scorpion · Shadow Kitten · Lantern Moth ·
Abyss Snail · Smoke Raven · Dusk Salamander

## 4. ยี่สิบหก Fusion (Jogress) — ทำทีหลังสุด

### 6 สูตรหลัก (จากสาย Starter/Boss)
| ร่างฟิวชัน | ธาตุผสม |
|---|---|
| Wildflame Mane | Fire (Volcano King) + Nature |
| Mistgrove | Nature + Water (Tidal Emperor) |
| Stormtide | Water (Tidal Emperor) + Electric |
| Voltshade | Electric + Shadow |
| Umbra Thai | Shadow + Normal |
| ChaThai Sovereign | Normal + Fire (Volcano King) |

### 20 สูตรจากสาย Wild (Elder + Elder)
Lava Coral Leviathan (Fire/Water) · Thunder Obsidian Scorpion (Electric/Shadow) · Shadow Root Owl
(Nature/Shadow) · Magma Storm Ram (Fire/Electric) · Abyss Crystal Manta (Water/Shadow) · Electric Vine
Golem (Nature/Electric) · Volcanic Ghost Bat (Fire/Shadow) · Coral Lightning Fox (Water/Electric) · Root
Shadow Serpent (Nature/Shadow) · Stormfire Hawk (Fire/Electric) · Magma Reef Leviathan (Fire/Water) ·
Thunder Shadow Panther (Electric/Shadow) · Coral Root Tortoise (Nature/Water) · Lightning Flame Chimera
(Fire/Electric) · Abyss Mushroom Dragon (Nature/Water) · Obsidian Storm Beetle (Electric/Shadow) · Shadow
Coral Kraken (Water/Shadow) · Ember Crystal Wyvern (Fire/Shadow) · Thunder Root Stag (Nature/Electric) ·
Eclipse Sea Phoenix (Water/Shadow)

---

## 5. Folder เก็บภาพต้นฉบับ (ไม่ใช่ pixel) — สำหรับส่งให้ agent อื่นอ้างอิง/แปลง

ตรวจสอบตรงจากดิสก์จริงแล้ว (ไม่ใช่แค่โค้ด) ทุก path ด้านล่างมีไฟล์อยู่จริง:

| หมวด | Folder | มีอะไรข้างใน |
|---|---|---|
| Normal line (Meowlk/ChaCha/ChaThai) | `ChaThaiTheCat/assets/sprites/normal/` | `stage1.png`/`stage2.png`/`stage3.png` (ภาพนิ่งสะอาดแล้ว) + `-chroma.png`/`-clean.png` (เวอร์ชันระหว่างขั้นตอนลบพื้นหลัง ไม่ต้องใช้) |
| Nature starter (Sproutail/Bloomtiger/Junglord) | `ChaThaiTheCat/assets/sprites/nature/` | `stage{1,2,3}-f0.png` ถึง `-f11.png` (แอนิเมชัน 12 เฟรม) |
| Electric starter (Sparkit/Voltabby/Thundermane) | `ChaThaiTheCat/assets/sprites/electric/` | เหมือนกัน 12 เฟรมต่อสเตจ |
| Shadow starter (Duskit/Nightprowl/Eclipsemaw) | `ChaThaiTheCat/assets/sprites/shadow/` | เหมือนกัน 12 เฟรมต่อสเตจ |
| Fire/Water line **(ยังไม่มีภาพของตัวเอง — ใช้ภาพ gym boss ด้านล่างแทนไปพลาง ๆ)** | *(ไม่มี folder เฉพาะ — ดู gym-bosses แถวถัดไป)* | — |
| 10 Gym Boss ทั้งหมด (รวม Cinderclaw/Pyre Duchess/Volcano King ที่ Fire ยืมใช้ และ Reefblade/Abyss Oracle/Tidal Emperor ที่ Water ยืมใช้) | `ChaThaiTheCat/assets/sprites/gym-bosses/frames/` | `<name>-f0.png` ถึง `-f3.png` (4 เฟรม) + `<name>-static.png` ต่อบอส 1 คน (10 คน) |
| 50 สาย Wild x 3 สเตจ (150 ตัว) แบ่ง 5 โซน | `ChaThaiTheCat/assets/sprites/wild/volcanic-canyon/` , `.../coral-shallows/` , `.../whispering-root-cavern/` , `.../thunder-plains/` , `.../shadow-cave/` | `<NN-mob-name>-stage<1-3>-f0.png` ถึง `-f3.png` + `-static.png` ต่อสเตจ |
| 6 Fusion หลัก | `ChaThaiTheCat/assets/sprites/fusion/` (ไฟล์ตรง ๆ ไม่มีโฟลเดอร์ย่อย) | `fusion_fn.png`, `fusion_nw.png`, `fusion_we.png`, `fusion_es.png`, `fusion_sn.png`, `fusion_nf.png` (ภาพนิ่ง composite ภาพเดียว ไม่มีเฟรมเคลื่อนไหว) |
| 20 Fusion จากสาย Wild | `ChaThaiTheCat/assets/sprites/fusion/wild/` | `<NN-fusion-name>-f0.png` ถึง `-f3.png` + `-static.png` ต่อตัว (20 ตัว) |

**ข้อควรระวัง — โฟลเดอร์ที่มีอยู่แต่ "ไม่เกี่ยวข้องแล้ว" ห้ามหยิบไปใช้โดยไม่ตั้งใจ**: `ChaThaiTheCat/assets/
sprites/wild/fire/` และ `.../wild/water/` (สังเกตว่าเป็นคนละอันกับ `wild/volcanic-canyon/`/`wild/
coral-shallows/` ด้านบน) เป็นไฟล์เก่าจากระบบ `WILD_MOBS` ที่ถูกลบออกจากเกมไปแล้ว (ไม่มี species ไหนผูกกับ
ไฟล์พวกนี้อีกต่อไป) ยังไม่ถูกลบออกจากดิสก์เฉย ๆ — ไม่ต้องเอาไปทำ pixel version

## หมายเหตุสำหรับใช้กับ TaleofChaThai

ถ้าจะเอาไปใช้จริงในเกมใหม่ (ไม่ใช่แค่ทำ pixel version ของ ChaThaiTheCat เดิม) ต้องตัดสินใจเพิ่มว่า:
- จะ **map ธาตุเดิม (6 ธาตุ) เข้ากับธาตุใหม่ (18 ธาตุ) ยังไง** — Fire/Water/Electric ตรงกันชัดเจน, Nature
  น่าจะแมปกับ Grass, Shadow น่าจะแมปกับ Dark, Normal ตรงกันชื่ออยู่แล้ว — ต้องคุยกับผู้สร้างให้ชัดก่อนเริ่มวาด
- สาย wild เดิมมี **3 สเตจ** (ตาม §3 ด้านบน) แต่สาย pixel ใหม่ใน `sprites-pixel` เป็น **2 สเตจ** — ถ้าจะวาด
  มอนจาก checklist นี้ให้เข้าชุดใหม่ ต้องตัดสินใจว่าจะคง 3 สเตจ (ตามที่คุยกันไว้ก่อนหน้าว่าไม่บังคับ 2 สเตจ
  ทั้งเกม) หรือย่อเหลือ 2 สเตจให้ consistent กับสายอื่นในธาตุเดียวกัน
