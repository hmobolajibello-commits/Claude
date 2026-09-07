"use strict";
/* ═══════════════════════ Fisch Field Guide — the database ═══════════════════════
   Plain CommonJS, no imports: the static site generator (tools/build-site.js) reads
   this, and the generated pages read only what they need. Data compiled September
   2026 from community wikis and guides; figures the sources disagree on carry a
   .flag mark and are listed on the Accuracy & sources page.                    */

const DB = [];
const E = (type, id, name, o) => { DB.push(Object.assign({type, id, name}, o)); };

const CATS = {
  loc:   {n:"Locations",       g:"The world",  cols:["Location","Stage","Getting there","Why you go"]},
  npc:   {n:"NPCs",            g:"The world",  cols:["NPC","Where","What they do"]},
  hunt:  {n:"Bosses &amp; hunts", g:"The world", cols:["Boss","Where","How it starts"]},
  rod:   {n:"Rods",            g:"Gear",       cols:["Rod","Stage","Cost","Source","What it does for you"]},
  bait:  {n:"Baits",           g:"Gear",       cols:["Bait","Rarity","Effect","Where"]},
  ench:  {n:"Enchants",        g:"Gear",       cols:["Enchant","Relic","Effect"]},
  item:  {n:"Items &amp; gear",g:"Gear",       cols:["Item","Kind","What it does"]},
  fish:  {n:"Fish",            g:"Database",   cols:["Fish","Rarity","Where","Why it matters"]},
  mut:   {n:"Mutations",       g:"Database",   cols:["Mutation","Multiplier","How you get it"]},
  mech:  {n:"Mechanics",       g:"Database",   cols:["System","In one line"]}
};

/* stage 0-9: the planner, the rod table and the roadmap all key off this one scale */
const STAGES = ["Start","Early","Early-mid","Mid","Mid-late","Late","Endgame","Endgame+","Money meta","Event"];
const stageTag = s => '<span class="stage">' + s + " &middot; " + STAGES[s] + "</span>";

/* ═════════════════════════ LOCATIONS ═════════════════════════ */
E("loc","moosewood","Moosewood",{stage:0,
 t:[stageTag(0),"You spawn here","Rod shop, first boat, the tutorial"],
 info:[["Stage","0 &mdash; Start"],["Access","Spawn point"],["Key NPCs","Pierre, Marc, the Merchant, the Shipwright, the Appraiser"],["Shop rods","Plastic, Carbon, Fast, Lucky"],["First boat","Rowboat, 400 C$"]],
 lead:"The starting village and the only place in the game you are handed anything. Everything an account needs in its first hour is inside a thirty-second walk of the dock: a tutorial NPC, a rod shop, a fish buyer, a boat seller and the Appraiser.",
 sec:[["What to do here, in order","<ol><li>Talk to <strong>Pierre</strong> on the beach and finish the tutorial. He is onboarding, not a merchant &mdash; he does not sell anything.</li><li>Fish the dock with the <a href=\"#/e/flimsy-rod\">Flimsy Rod</a> until you have a few hundred C$. Sell to the Merchant in the middle of the village.</li><li>Buy the <a href=\"#/e/carbon-rod\">Carbon Rod</a> at <strong>2,000 C$</strong> from Marc&#8217;s shop. Skip the Plastic and Training rods entirely &mdash; the Carbon Rod is the first purchase worth making.</li><li>Buy the <strong>Rowboat</strong> from the Shipwright at the docks for <strong>400 C$</strong>. Without a boat the rest of the map does not exist.</li><li>Fill the Moosewood bestiary before you leave. It is the cheapest bestiary percentage in the game and it counts toward the 70% that unlocks the <a href=\"#/e/destiny-rod\">Destiny Rod</a>.</li></ol>"],
  ["The one beginner trap here","<p>New accounts buy the Plastic Rod at 900 C$ because it is the first thing on the shelf, then have to save 2,000 C$ again for the Carbon Rod anyway. Fish a little longer and buy once.</p>"]],
 see:["carbon-rod","pierre","marc","the-appraiser","rowboat","beginner","path"]});

E("loc","the-ocean","The Ocean",{stage:1,
 t:[stageTag(1),"Sail out from any island","Travel, ocean-only species, hunts"],
 info:[["Stage","1 &mdash; Early"],["Access","Any boat"],["Holds","Ocean-only bestiary, drifting hunt events"],["Danger","Deep water species outweigh early rods"]],
 lead:"The water between the islands is its own fishing location with its own bestiary, and it is where island names first appear on your screen &mdash; sail far enough from shore and the map fills itself in. Unlocking a location in Fisch mostly means visiting it once.",
 sec:[["Using the Ocean well","<ul><li>Sail deliberately on your first trip out. Every island name you reveal is a fast-travel destination later.</li><li>Ocean bestiary entries are among the easiest percentage in the game &mdash; they count the same as hard ones toward the 70% Destiny Rod gate.</li><li>Hunt events (Megalodon and friends) spawn in open water; if a hunt is up on your server, everything else can wait.</li></ul>"]],
 see:["rowboat","bestiary","megalodon","boats"]});

E("loc","roslit-bay","Roslit Bay",{stage:1,
 t:[stageTag(1),"Short sail from Moosewood","Steady Rod, relic farm, the Volcano"],
 info:[["Stage","1 &mdash; Early"],["Access","Sail from Moosewood"],["Shop rod","Steady Rod &mdash; <span class=\"flag\" title=\"Community figure; shop prices move between patches\">7,000 C$</span>"],["Notable","Roslit Volcano; Nurse Shark shallows"],["Farms","Enchant Relics"]],
 lead:"The second town, and the one that turns a beginner into a player. Its blacksmith sells the Steady Rod, its shallows are a workable Enchant Relic farm, and its volcano is the first place the game refuses to let you fish without the right gear.",
 sec:[["What to do here","<ul><li>Buy the <a href=\"#/e/steady-rod\">Steady Rod</a> once you can afford it. Wider shake window and enough resilience that the minigame stops being the thing that loses you fish.</li><li>Fish the <strong>Nurse Shark</strong> shallows for <a href=\"#/e/enchant-relic\">Enchant Relics</a>. Ancient Isle is better later; this is the version you can reach now.</li><li>Fill the Roslit bestiary &mdash; another cheap block of percentage.</li></ul>"],
  ["Roslit Volcano","<p>Lava fishing needs protection. The endgame answer is the <a href=\"#/e/invincible\">Invincible</a> exalted enchant, which lets any rod fish the Volcano and the Brine Pool. Until then, treat the volcano as scenery.</p>"]],
 see:["steady-rod","enchant-relic","invincible","enchanting","ancient-isle"]});

E("loc","terrapin-island","Terrapin Island",{stage:1,
 t:[stageTag(1),"Sail from Moosewood","Easy bestiary percentage"],
 info:[["Stage","1 &mdash; Early"],["Access","Sail"],["Best for","Bestiary completion"],["Difficulty","Low &mdash; early rods handle it"]],
 lead:"An early island whose value is almost entirely bestiary. Guides that route players to the 70% Destiny Rod gate name the same four blocks every time &mdash; Moosewood, Roslit Bay, Terrapin and the Ocean &mdash; because they are large, easy and finishable with a rod you already own.",
 see:["bestiary","destiny-rod","the-arch","terrapin-island"]});

E("loc","sunstone-island","Sunstone Island",{stage:2,
 t:[stageTag(2),"Sail","Its own bestiary block and merchant"],
 info:[["Stage","2 &mdash; Early-mid"],["Access","Sail"],["Best for","Bestiary, mid-tier sell values"]],
 lead:"One of the early-mid islands on the standard sailing loop. Community sources are consistent that it exists and is worth a bestiary pass, and inconsistent about its shop stock from patch to patch &mdash; check the merchant when you land rather than trusting any list, this one included.",
 see:["bestiary","the-ocean","boats"]});

E("loc","snowcap-island","Snowcap Island",{stage:2,
 t:[stageTag(2),"Sail north","Cold-water species, Sleet mutation"],
 info:[["Stage","2 &mdash; Early-mid"],["Access","Sail north"],["Weather","Cold; snow conditions"],["Mutation","Sleet is a cold-biome mutation"]],
 lead:"Cold-water fishing. Its species do not appear in the southern islands, so it is a required stop for bestiary completion, and its weather is what makes the <a href=\"#/e/sleet\">Sleet</a> mutation reachable.",
 see:["sleet","weather","bestiary","northern-expedition"]});

E("loc","mushgrove-swamp","Mushgrove Swamp",{stage:2,
 t:[stageTag(2),"Sail &mdash; the swamp channel","Agaric&#8217;s free Fungal Rod"],
 info:[["Stage","2 &mdash; Early-mid"],["Access","Sail"],["Key NPC","Agaric"],["Free rod","<a href=\"#/e/fungal-rod\">Fungal Rod</a> &mdash; catch an Alligator"],["Species","Swamp-only bestiary"]],
 lead:"The single best-value stop in the early-mid game, because the reward here is free. Agaric asks you to catch an <strong>Alligator</strong> in the swamp and hands over the Fungal Rod for nothing.",
 sec:[["Why the Fungal Rod matters","<p>It is a real upgrade obtained without spending C$, and its passive &mdash; a strong luck window that triggers on a majority of catches &mdash; makes it punch above the rods you could buy at the same point. Every progression guide in circulation routes players through Agaric for exactly this reason.</p><p>Do this before you spend six figures on a shop rod. It costs an afternoon and saves a fortune.</p>"]],
 see:["fungal-rod","agaric","alligator","path"]});

E("loc","forsaken-shores","Forsaken Shores",{stage:3,
 t:[stageTag(3),"Sail &mdash; a long way out","The early-mid money and XP farm"],
 info:[["Stage","3 &mdash; Mid"],["Access","Sail; bring a real boat"],["Best for","C$ per hour <em>and</em> XP per hour"],["Landmark","Waterfall pond, around <span class=\"num\">&minus;2685, 165, 1770</span>"],["Realistic rate","<span class=\"flag\" title=\"Community estimate; depends on rod, bait, enchant and luck stacking\">100K&ndash;500K C$/hr with a mid rod</span>"]],
 lead:"For most of the mid-game this is the answer to both &ldquo;where do I make money&rdquo; and &ldquo;where do I level&rdquo;, which is rare &mdash; usually those are different places. The waterfall pond is the specific spot guides point at.",
 sec:[["Farming it","<ul><li>Fish the <strong>waterfall pond</strong>, not the open shore. The coordinates above are the ones that circulate; the pond is visible from the cliff path.</li><li>Bring a luck bait. Sell values here reward rarity, so universal luck converts directly into C$/hr.</li><li>This is where you bank the <strong>150,000 C$</strong> for the <a href=\"#/e/trident-rod\">Trident Rod</a>.</li></ul>"]],
 see:["money","xp","trident-rod","fungal-rod"]});

E("loc","statue-of-sovereignty","Statue of Sovereignty",{stage:3,
 t:[stageTag(3),"Sail","The mines, and the way into the Keepers Altar"],
 info:[["Stage","3 &mdash; Mid"],["Access","Sail"],["Gate","Bribe the NPC by the mine elevator &mdash; <b>400 C$</b>"],["Leads to","<a href=\"#/e/keepers-altar\">Keepers Altar</a>"]],
 lead:"The island is a landmark; the reason you come is underneath it. Go into the mines, find the NPC standing next to the elevator, pay him <strong>400 C$</strong>, and the elevator takes you down to the Keepers Altar &mdash; where every enchant in the game is applied.",
 sec:[["Do this early","<p>400 C$ is a first-hour amount of money and the altar is a permanent unlock. There is no reason to arrive here at level 200 discovering you still have not opened it.</p>"]],
 see:["keepers-altar","enchanting","enchant-relic"]});

E("loc","keepers-altar","Keepers Altar",{stage:3,
 t:[stageTag(3),"Mine elevator, 400 C$ bribe","Enchanting &mdash; the only altar"],
 info:[["Stage","3 &mdash; Mid"],["Access","Under the Statue of Sovereignty"],["Cost to enter","400 C$ bribe, one time"],["Timing","<span class=\"flag\" title=\"Widely reported as night-only; some write-ups omit the restriction\">Offer relics at night</span>"],["Consumes","Enchant Relics and Exalted Relics"]],
 lead:"The chamber beneath the Statue of Sovereignty where you trade an <a href=\"#/e/enchant-relic\">Enchant Relic</a> for a random enchant on your rod. Every rod in your endgame kit gets its power here, not in a shop.",
 sec:[["How enchanting actually goes","<ul><li>An enchant is a <strong>random roll from a pool</strong>, not a purchase. You are gambling relics, so farm relics in bulk before you come.</li><li>A new roll <strong>replaces</strong> what is on the rod. Never re-roll a rod you are happy with.</li><li><a href=\"#/e/exalted-relic\">Exalted Relics</a> roll from a smaller, much stronger pool &mdash; <a href=\"#/e/quantum\">Quantum</a>, <a href=\"#/e/sea-overlord\">Sea Overlord</a>, <a href=\"#/e/invincible\">Invincible</a>. Save them for the rod you intend to keep.</li></ul>"]],
 see:["enchanting","enchant-relic","exalted-relic","quantum","invincible","ancient-isle"]});

E("loc","ancient-isle","Ancient Isle",{stage:4,
 t:[stageTag(4),"Sail","The best Enchant Relic farm"],
 info:[["Stage","4 &mdash; Mid-late"],["Access","Sail"],["Best for","Enchant Relics"],["Compared with","Roslit Bay &mdash; better here, per player testing"]],
 lead:"When players compare relic farms head to head, Ancient Isle comes out ahead of the Roslit Bay shallows. If you are building an enchant stack rather than hoping for one, this is the island you park on.",
 sec:[["Relic farming, honestly","<p>Relics are a drop, so the rate is a rate: no amount of session length makes the next cast luckier. Farm here in blocks, bank the relics, then spend them at the <a href=\"#/e/keepers-altar\">Keepers Altar</a> in one sitting so you can stop the moment you roll something you want to keep.</p>"]],
 see:["enchant-relic","keepers-altar","enchanting","odds"]});

E("loc","northern-expedition","Northern Expedition &amp; Northern Summit",{stage:4,
 t:[stageTag(4),"Sail far north","Arctic Rod, cold-biome species"],
 info:[["Stage","4 &mdash; Mid-late"],["Access","Sail north; cold water"],["Shop rod","<a href=\"#/e/arctic-rod\">Arctic Rod</a>, at the Summit"],["Species","Arctic bestiary"]],
 lead:"The far-north block. Progression guides route through it for one reason: the Arctic Rod at Northern Summit is the standard buy between the free Fungal Rod and the Trident Rod, and it is the rod that makes the cold biomes comfortable.",
 see:["arctic-rod","snowcap-island","bestiary"]});

E("loc","tridents-temple","Trident&#8217;s Temple",{stage:4,
 t:[stageTag(4),"Sail","Trident Rod &mdash; 150,000 C$"],
 info:[["Stage","4 &mdash; Mid-late"],["Access","Sail"],["Shop rod","<a href=\"#/e/trident-rod\">Trident Rod</a> &mdash; <b>150,000 C$</b>"],["Why","Atlantean mutation passive"]],
 lead:"You come here to buy one thing. The Trident Rod is the most flexible mid-game rod in the game and its passive &mdash; a roughly 30% chance to apply the <a href=\"#/e/atlantean\">Atlantean</a> mutation, tripling a catch&#8217;s value &mdash; means it partly pays for itself.",
 see:["trident-rod","atlantean","money","path"]});

E("loc","vertigo","Vertigo",{stage:5,
 t:[stageTag(5),"Deep water, far out","Gateway to The Depths"],
 info:[["Stage","5 &mdash; Late"],["Access","Sail to deep water"],["Gate out","100% Vertigo bestiary, then fish the <strong>Strange Whirlpool</strong> for The Depths Key"],["Danger","Heavy species; weak rods simply lose"]],
 lead:"A deep, dark, hostile zone, and the only door to The Depths. It is also the first place the game asks for real completion rather than attendance: you need the <strong>whole</strong> Vertigo bestiary before the key can drop.",
 sec:[["The Depths Key","<ol><li>Complete the Vertigo bestiary to <strong>100%</strong>.</li><li>Fish the <strong>Strange Whirlpool</strong> until you catch <strong>The Depths Key</strong>.</li><li>The key opens <a href=\"#/e/the-depths\">The Depths</a> below.</li></ol><p>This is a hard stop, not a soft one. There is no shortcut, no shop route and no boat that skips it &mdash; which is why the roadmap treats finishing the Vertigo bestiary as its own phase.</p>"]],
 see:["the-depths","depths-key","bestiary","rod-of-the-depths"]});

E("loc","the-depths","The Depths",{stage:5,
 t:[stageTag(5),"The Depths Key, from Vertigo","Rod of the Depths &mdash; 750,000 C$"],
 info:[["Stage","5 &mdash; Late"],["Access","The Depths Key"],["Shop rod","<a href=\"#/e/rod-of-the-depths\">Rod of the Depths</a> &mdash; <b>750,000 C$</b>"],["Prerequisite","100% Vertigo bestiary"]],
 lead:"A secret zone under Vertigo that cannot be sailed to. Inside is the Rod of the Depths at 750,000 C$ &mdash; the rod that carries most accounts from the late game into the endgame, and the reason people grind the Vertigo bestiary at all.",
 sec:[["Budget before you come","<p>Arrive with the 750,000 C$ already banked. Nothing here helps you earn it, and the trip back out to a money farm is long. <a href=\"#/e/forsaken-shores\">Forsaken Shores</a> or <a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a> first, The Depths second.</p>"]],
 see:["rod-of-the-depths","vertigo","depths-key","money"]});

E("loc","atlantis","Atlantis",{stage:6,
 t:[stageTag(6),"Sunken city &mdash; late-game sail","Kraken Rod, the Kraken"],
 info:[["Stage","6 &mdash; Endgame"],["Access","Late-game sail; deep water"],["Shop rod","<a href=\"#/e/kraken-rod\">Kraken Rod</a> &mdash; <span class=\"flag\" title=\"950,000 C$ in one widely-cited guide, 1,333,333 C$ in another\">950,000 or 1,333,333 C$</span>"],["Level gate","<span class=\"flag\" title=\"Reported as level 180 alongside the Atlantis task chain\">~level 180</span>"],["Boss","<a href=\"#/e/kraken\">The Kraken</a>, in the Kraken Pool"]],
 lead:"The sunken city, and the first location that gates on your character level rather than your boat. Its rod is a genuine endgame item and its boss sits behind a five-lever world quest that most players do with a guide open.",
 sec:[["The Kraken lever quest","<p>Five hidden levers have to be flicked before the Kraken Pool opens: <strong>behind the Merchant</strong>, <strong>under the Cannon Hut</strong>, <strong>behind the Waterfall</strong>, <strong>on the Mountain Bridge</strong> and <strong>inside the Skull Cave</strong>. Order does not matter; finding all five does.</p>"]],
 see:["kraken-rod","kraken","the-depths","bestiary"]});

E("loc","the-arch","The Arch",{stage:6,
 t:[stageTag(6),"Sail","Caleia &mdash; the Destiny Rod at 70% bestiary"],
 info:[["Stage","6 &mdash; Endgame"],["Access","Sail"],["Key NPC","Caleia"],["Sells","<a href=\"#/e/destiny-rod\">Destiny Rod</a> &mdash; <b>190,000 C$</b>"],["Gate","70% total bestiary completion"]],
 lead:"The payoff for every easy bestiary entry you filled on the way here. At <strong>70% total bestiary</strong>, Caleia will sell you the Destiny Rod for 190,000 C$ &mdash; cheap for what it is, and the clearest example in Fisch of collection work converting into gear.",
 sec:[["The bestiary rewards, in order","<ul><li><strong>70% total</strong> &mdash; Caleia unlocks the Destiny Rod (190,000 C$).</li><li><strong>100% total</strong> &mdash; a cosmetic-tier reward; sources name the <span class=\"flag\" title=\"Aurora Bobber in some guides, Aurora Glow Lantern in others; a further source adds the Masterline Rod\">Aurora Bobber, or the Aurora Glow Lantern</span>.</li></ul><p>Chase 70% deliberately: finish whole easy locations rather than one hard fish everywhere.</p>"]],
 see:["destiny-rod","caleia","bestiary","terrapin-island"]});

E("loc","cursed-isle","Cursed Isle",{stage:7,
 t:[stageTag(7),"Late-game sail","Great Dreamer Rod &mdash; 500,000 C$"],
 info:[["Stage","7 &mdash; Endgame+"],["Access","Late-game sail"],["Shop rod","<a href=\"#/e/great-dreamer-rod\">Great Dreamer Rod</a> &mdash; <b>500,000 C$</b>"],["Passive","<span class=\"flag\" title=\"An extra fish every third catch is attributed to the Great Dreamer in one source and to the Rod of the Depths in another\">Extra fish on a repeating cycle</span>"]],
 lead:"Cursed water, and the shop that sells the Great Dreamer Rod. High lure speed, high luck, and a duplication passive that makes it a farming rod as much as a rarity rod.",
 see:["great-dreamer-rod","money","enchanting"]});

E("loc","underground-music-venue","Underground Music Venue",{stage:7,
 t:[stageTag(7),"Hidden late-game location","Wingripper and Chrysalis rods"],
 info:[["Stage","7 &mdash; Endgame+"],["Access","Hidden; late-game"],["Rods","<a href=\"#/e/wingripper-rod\">Wingripper</a>, <a href=\"#/e/chrysalis-rod\">Chrysalis</a>"],["Role","The end of the standard rod ladder"]],
 lead:"Where the mainstream rod progression stops. Rod-progression guides that begin with &ldquo;take Agaric&#8217;s free Fungal Rod&rdquo; end with &ldquo;finish on the Wingripper or the Chrysalis Rod from the Underground Music Venue&rdquo; &mdash; these are the last rods most accounts will ever need.",
 see:["wingripper-rod","chrysalis-rod","ruinous-oath","path"]});

E("loc","castaway-cliffs","Castaway Cliffs",{stage:8,
 t:[stageTag(8),"Late-game sail","The Elder Moss Ripper money meta"],
 info:[["Stage","8 &mdash; Money meta"],["Access","Late-game sail"],["Rod","<a href=\"#/e/elder-moss-ripper\">Elder Moss Ripper Rod</a>"],["Rate","<span class=\"flag\" title=\"15-25M C$/hr is the figure quoted for the full Elder Moss Ripper setup; 2-4M/hr without it\">2&ndash;4M C$/hr, or 15&ndash;25M with the Elder Moss Ripper</span>"]],
 lead:"The current money meta. The Elder Moss Ripper Rod&#8217;s <em>Lurking Mossjaw</em> passive puts a guaranteed high-value Mossy Great Gold Cursed Shark on your line on a roughly two-minute timer, which turns the cliffs into an income rate rather than a fishing spot.",
 sec:[["What the numbers actually mean","<p>Fishing the cliffs with an ordinary late-game rod is a strong 2&ndash;4M C$/hr farm. The 15&ndash;25M figure is the <em>rod-specific</em> rate and does not transfer to any other setup. If you do not have the Elder Moss Ripper, you are farming the first number.</p>"]],
 see:["elder-moss-ripper","money","calm-zone","mossy-great-gold-cursed-shark"]});

E("loc","calm-zone","The Calm Zone",{stage:8,
 t:[stageTag(8),"Deep water, endgame only","Crystallized Seadragon money"],
 info:[["Stage","8 &mdash; Money meta"],["Access","Deep water; endgame rod required"],["Money fish","<a href=\"#/e/crystallized-seadragon\">Crystallized Seadragon</a> &mdash; <span class=\"flag\" title=\"Community average; individual sales swing hard on weight and mutation\">~26,100 C$ average</span>"],["Prerequisite","A rod that can land deep-water weight"]],
 lead:"The other half of the endgame money meta, and the one that does not depend on owning a specific rod. Its draw is the Crystallized Seadragon at roughly 26,100 C$ a catch on average &mdash; enough that a good session here funds an entire rod tier.",
 sec:[["Cliffs or Calm Zone?","<ul><li>You own the <strong>Elder Moss Ripper</strong> &rarr; <a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a>, and it is not close.</li><li>You do not &rarr; the <strong>Calm Zone</strong>, which rewards the rod you already have rather than one specific drop.</li></ul>"]],
 see:["crystallized-seadragon","money","castaway-cliffs","elder-moss-ripper"]});

E("loc","brine-pool","The Brine Pool",{stage:8,
 t:[stageTag(8),"Deep hazard water","Gated species &mdash; needs Invincible"],
 info:[["Stage","8"],["Access","Hazard water"],["Requires","<a href=\"#/e/invincible\">Invincible</a> enchant, or a rod built for it"],["Sibling hazard","Roslit Volcano"]],
 lead:"One of the two hazard pools &mdash; the Brine Pool and the Roslit Volcano &mdash; that ordinary rods cannot fish. The exalted <a href=\"#/e/invincible\">Invincible</a> enchant removes the restriction outright for whatever rod carries it, which is most of why it is chased.",
 see:["invincible","exalted-relic","roslit-bay","enchanting"]});

E("loc","fischfest","Fischfest",{stage:9,
 t:[stageTag(9),"Seasonal event hub","Event fish, crates, event rods"],
 info:[["Stage","9 &mdash; Event"],["Access","Open while the event runs"],["2026 window","Closed 12 September 2026"],["Holds","Event bestiary, crates, seasonal rods"]],
 lead:"Fisch&#8217;s recurring festival hub. Event locations carry their own bestiary blocks and their own rods, and they close on a schedule &mdash; a Fischfest rod you did not buy while the gate was open is not purchasable afterwards.",
 sec:[["Playing event content properly","<ul><li>Event bestiary counts toward your total. Fill it while the island exists.</li><li>Buy the event rods <strong>first</strong> and the cosmetics second.</li><li>Redeem the event codes on day one &mdash; they expire with the event.</li></ul>"]],
 see:["skycrest","codes","bestiary"]});

E("loc","skycrest","Skycrest",{stage:9,
 t:[stageTag(9),"Swim up the waterfall from Fischfest","Idols, Sky Crystals, Abaia"],
 info:[["Stage","9 &mdash; Event"],["Added","5 September 2026"],["Window","<span class=\"flag\" title=\"Opened 5 Sept 2026 12:00 ET, closed with Fischfest on 12 Sept 2026\">5&ndash;12 September 2026</span>"],["Access","From Fischfest, head right into the sea and swim up the waterfall"],["Progression","Crest Amulet &rarr; Idol Favor &rarr; 10 Sky Crystals &rarr; Abaia&#8217;s Chamber"],["Bestiary","29 fish"]],
 lead:"The floating island above Fischfest, added on 5 September 2026 and closed a week later with the festival. It is the clearest example of Fisch&#8217;s modern event design: a self-contained progression track with its own currency, its own gear and a boss at the end.",
 sec:[["The Skycrest track, in order","<ol><li>Reach Skycrest: from <strong>Fischfest</strong>, head right into the sea and <strong>swim up the waterfall</strong>.</li><li>Take the <strong>Crest Amulet</strong> from the <a href=\"#/e/keeper-of-the-sky\">Keeper of the Sky</a>. It is what holds Charms.</li><li>Fish the <strong>idol pond</strong> to grind <strong>Idol Favor</strong>.</li><li>Collect and place all <strong>10 Sky Crystals</strong> to open Abaia&#8217;s Chamber.</li><li>Sacrifice fish at the <strong>Fire of Spirits</strong> during a <strong>Tropical Squall</strong> to spawn the <a href=\"#/e/abaia\">Abaia</a> hunt.</li></ol>"],
  ["What it added permanently","<p>Charms, Ancient Idol trials, Sky Crystals, new rods, relics and side quests arrived with Skycrest. Event <em>islands</em> close; some of what they introduce stays in the game. Treat the island as expired and the systems as live until a patch says otherwise.</p>"]],
 see:["abaia","keeper-of-the-sky","charms","fischfest","codes"]});

/* ══════════ LOCATIONS ADDED WITH THE LATER UPDATES ══════════ */
E("loc","marianas-veil","Mariana&#8217;s Veil",{stage:8,
 t:[stageTag(8),"Deep-water update zone","Five rods, and the best of them"],
 info:[["Stage","8"],["Added","Mariana&#8217;s Veil update"],["Rods","Volcanic, Challenger&#8217;s, Rod of the Zenith, Ethereal Prism, Leviathan&#8217;s Fang"],["Sub-areas","Volcanic Vents, Challenger Deep, Abyssal Zenith, Rainbow Lake, Veil of the Forsaken"],["Boss","Scylla"]],
 lead:"The deep-water expansion, and the single most important update for anyone chasing gear: it added five rods, and two of them &mdash; the <a href=\"#/e/ethereal-prism-rod\">Ethereal Prism Rod</a> and the <a href=\"#/e/rod-of-the-zenith\">Rod of the Zenith</a> &mdash; sit at the very top of current tier lists.",
 sec:[["The five rods and where they are","<ul><li><a href=\"#/e/volcanic-rod\">Volcanic Rod</a> &mdash; 150,000 C$ at the Volcanic Vents Pool</li><li><a href=\"#/e/leviathans-fang-rod\">Leviathan&#8217;s Fang Rod</a> &mdash; by the entrance to the Veil of the Forsaken, after the Scylla fight</li><li><a href=\"#/e/challengers-rod\">Challenger&#8217;s Rod</a> &mdash; 2,500,000 C$ at Challenger Deep</li><li><a href=\"#/e/rod-of-the-zenith\">Rod of the Zenith</a> &mdash; 10,000,000 C$ at the Abyssal Zenith</li><li><a href=\"#/e/ethereal-prism-rod\">Ethereal Prism Rod</a> &mdash; on the island in Rainbow Lake, behind the Forsaken Gate and the Veil bestiary</li></ul>"],
  ["Reading the coordinates","<p>Several of these are pools rather than islands, so the community documents them by coordinate rather than by name on the map. They are reproduced on each rod&#8217;s page. Treat them as a starting point &mdash; coordinates drift when terrain gets reworked.</p>"]],
 see:["ethereal-prism-rod","challenger-deep","abyssal-zenith","sunken-depths","volcanic-rod"]});
E("loc","challenger-deep","Challenger Deep",{stage:8,
 t:[stageTag(8),"Deepest water in the game","Challenger&#8217;s Rod &mdash; 2,500,000 C$"],
 info:[["Stage","8"],["Part of","Mariana&#8217;s Veil"],["Coordinates","around <span class=\"num\">740, &minus;3355, &minus;1530</span>"],["Rod","<a href=\"#/e/challengers-rod\">Challenger&#8217;s Rod</a> &mdash; <b>2,500,000 C$</b>"]],
 lead:"The deepest point in Fisch, and the shop for the Challenger&#8217;s Rod. Its +20% reeling progress speed is the sort of passive that sounds dull and turns into a permanent raise on every money farm you ever run.",
 see:["challengers-rod","marianas-veil","max-weight","abyssal-zenith"]});
E("loc","abyssal-zenith","Abyssal Zenith",{stage:8,
 t:[stageTag(8),"Deep pool, Mariana&#8217;s Veil","Rod of the Zenith &mdash; 10,000,000 C$"],
 info:[["Stage","8"],["Part of","Mariana&#8217;s Veil"],["Coordinates","southwest of the pool, around <span class=\"num\">&minus;13625, &minus;11035, &minus;355</span>"],["Rod","<a href=\"#/e/rod-of-the-zenith\">Rod of the Zenith</a> &mdash; <b>10,000,000 C$</b>"]],
 lead:"Home of the only rod in Fisch that pays you for playing the minigame well. Perfect catches build a mutation streak; one miss resets it.",
 see:["rod-of-the-zenith","marianas-veil","minigame","challenger-deep"]});
E("loc","sunken-depths","The Sunken Depths",{stage:6,
 t:[stageTag(6),"Deep water &mdash; The Sunken Trials","Tempest, Sunken and Leviathan&#8217;s Fang rods"],
 info:[["Stage","6"],["Gate","The Sunken Trials"],["Rods","<a href=\"#/e/tempest-rod\">Tempest Rod</a>, <a href=\"#/e/sunken-rod\">Sunken Rod</a>, <a href=\"#/e/leviathans-fang-rod\">Leviathan&#8217;s Fang</a>"],["Watch out for","Weight ceilings &mdash; deep species are heavy"]],
 lead:"A deep zone with its own trial chain and its own rod shelf. It is also where a weak rod stops being a handicap and becomes a hard stop: down here the species outweigh anything from the early game.",
 sec:[["Before you go","<p>Check your <a href=\"#/e/max-weight\">max weight</a> rather than your luck. Luck decides what bites; weight decides whether you land it, and no amount of the first fixes the second.</p>"]],
 see:["tempest-rod","sunken-rod","leviathans-fang-rod","max-weight","marianas-veil"]});
E("loc","ancient-archives","The Ancient Archives",{stage:6,
 t:[stageTag(6),"Inside Ancient Isle &mdash; after the totem puzzle","The rod crafting station"],
 info:[["Stage","6"],["Where","Inside <a href=\"#/e/ancient-isle\">Ancient Isle</a>"],["Gate","Solve the Ancient Isle totem puzzle"],["Holds","The rod crafting table"],["Craftable rods","10, plus <a href=\"#/e/requiem\">Requiem</a>"]],
 lead:"The crafting room, and the part of Fisch that rewards planning instead of money. Ten rods are craftable here, from mid-tier utility up to genuine endgame &mdash; and the room does not exist for you until the Ancient Isle totem puzzle is solved.",
 sec:[["What is craftable here","<p><a href=\"#/e/resourceful-rod\">Resourceful</a> &middot; <a href=\"#/e/seasons-rod\">Seasons</a> &middot; <a href=\"#/e/riptide-rod\">Riptide</a> &middot; <a href=\"#/e/voyager-rod\">Voyager</a> &middot; <a href=\"#/e/lost-rod\">The Lost Rod</a> &middot; <a href=\"#/e/celestial-rod\">Celestial</a> &middot; <a href=\"#/e/rod-of-the-eternal-king\">Rod of the Eternal King</a> &middot; <a href=\"#/e/rod-of-the-forgotten-fang\">Rod of the Forgotten Fang</a> &middot; <a href=\"#/e/spiritbinder\">Spiritbinder</a> &middot; <a href=\"#/e/vineweaver-rod\">Vineweaver</a> &mdash; and the 15,000,000 C$ <a href=\"#/e/requiem\">Requiem</a>.</p>"]],
 see:["crafting","ancient-isle","requiem","voyager-rod","rod-of-the-eternal-king"]});
E("loc","tidefall","Tidefall",{stage:7,
 t:[stageTag(7),"Update zone","Its own rods, zones and hunts"],
 info:[["Stage","7"],["Added","Tidefall update"],["Entry rod","<a href=\"#/e/fallen-rod\">Fallen Rod</a>"],["Holds","Secret rods, sub-zones and hunts"]],
 lead:"One of the 2026 update zones, with its own secret rods, sub-zones and hunts. Its <a href=\"#/e/fallen-rod\">Fallen Rod</a> is the entry ticket the rest of the zone is balanced around.",
 see:["fallen-rod","bestiary","scoria-reach"]});
E("loc","scoria-reach","Scoria Reach",{stage:7,
 t:[stageTag(7),"Update zone &mdash; version 1.71.0","Volcanic-flavoured content"],
 info:[["Stage","7"],["Added","Version 1.71.0, March 2026"],["Flavour","Volcanic"],["Related","<a href=\"#/e/volcanic-rod\">Volcanic Rod</a>, Ashen Fortune"]],
 lead:"A volcanic update zone released in version 1.71.0. It sits in the same family as the Volcanic Vents and the Ashen Fortune mutation &mdash; heat-flavoured content with its own bestiary block.",
 see:["volcanic-rod","tidefall","bestiary","brine-pool"]});

/* ══════════ SYSTEMS ADDED ALONGSIDE THEM ══════════ */
E("mech","crafting","Rod crafting",{t:["Ten rods built from ingredients instead of bought with C$"],
 info:[["Where","<a href=\"#/e/ancient-archives\">The Ancient Archives</a>"],["Gate","The Ancient Isle totem puzzle"],["Each recipe","A level requirement and three ingredients"],["Catch","Some ingredients need a specific rod or mutation"]],
 lead:"The route to a strong rod that does not run through your bank balance. Ten rods are craftable at the Ancient Archives, each with its own level gate and three ingredients &mdash; and the ingredients are where the work is.",
 sec:[["What makes a recipe hard","<ul><li><strong>Mutation requirements.</strong> Some ingredients &mdash; Driftwood is the usual example &mdash; only count with a particular mutation on them, so you fish or <a href=\"#/e/appraisal\">appraise</a> for it rather than just catching one.</li><li><strong>Rod requirements.</strong> The <a href=\"#/e/requiem\">Requiem</a> recipe wants a Fossilized Plesiosaur <em>caught with a <a href=\"#/e/voyager-rod\">Voyager Rod</a></em>. One craft is a prerequisite for another.</li><li><strong>Hunt requirements.</strong> Others want a fish that only appears during a specific hunt.</li></ul><p>Read the whole recipe before farming any of it. Discovering the rod-specific line at the last ingredient is how people lose a week.</p>"]],
 see:["ancient-archives","requiem","voyager-rod","appraisal"]});
E("mech","rod-mastery","Rod Mastery",{t:["Per-rod quests that permanently buff that rod"],
 info:[["What","A quest set attached to individual rods"],["Rewards","Passive boosts to the rod, C$, XP, skins, bobbers, lanterns, titles, halos, boots, gliders"],["Related","The Rod Journal, and the <a href=\"#/e/masterline-rod\">Masterline Rod</a>"]],
 lead:"Rods in Fisch are not finished when you buy them. Rod Mastery attaches a quest set to individual rods, and clearing those quests permanently improves the rod as well as paying out cosmetics, C$ and XP.",
 sec:[["Why it matters for planning","<p>It changes the &ldquo;should I upgrade?&rdquo; question. A mastered mid-tier rod can outperform a fresh higher-tier one, so finishing the mastery on the rod you actually use is often better value than buying the next rod up.</p><p>The Rod Journal that tracks this is also named as half the requirement for the <a href=\"#/e/masterline-rod\">Masterline Rod</a>.</p>"]],
 see:["masterline-rod","rods-index","bestiary","path"]});

/* ═════════════════════════ RODS ═════════════════════════
   Fisch has a lot of rods — the counts published by the community databases in
   September 2026 are 188, 227, 232, 244 and 257, which tells you how fast they
   arrive and how hard they are to track. Listed here is every rod this wiki could
   source a real acquisition route for. Rows are ordered by roughly where they sit
   in a progression, and that order is what the planner reads.

   [id, name, stage, cost (C$ number, 0 = free, null = no published price),
    cost label, source, tier, one-line role, lead, passive/notes html, see] */
const RODS = [
["flimsy-rod","Flimsy Rod",0,0,"<b>Free</b> &mdash; you start with it","Given at spawn","D","The rod you are handed",
 "Every account starts with the Flimsy Rod and roughly no money. It is not good and it is not supposed to be &mdash; it exists to catch enough trash and common fish off the Moosewood dock to pay for the Carbon Rod.",
 "<p>No passive. Low luck, low resilience, low weight ceiling. Anything heavier than a Moosewood common will snap the fight.</p><p><strong>Use it for exactly one job:</strong> fish the dock until you have 2,000 C$, then never equip it again.</p>",["carbon-rod","moosewood","beginner"]],
["training-rod","Training Rod",0,300,"<b>300 C$</b>","Marc&#8217;s shop, Moosewood","D","Skip it",
 "A marginal step above the Flimsy Rod &mdash; slightly better control and resilience, still very low luck and weight. Sold early enough that new players buy it before they know better, and every progression guide says the same thing: skip it.",
 "<p>The 300 C$ spent here is 300 C$ not spent on the <a href=\"#/e/carbon-rod\">Carbon Rod</a>, which costs 2,000 and is a genuine upgrade. Buying both is the most common beginner mistake in Fisch.</p>",["carbon-rod","plastic-rod","beginner"]],
["plastic-rod","Plastic Rod",0,900,"<b>900 C$</b>","Marc&#8217;s shop, Moosewood","D","Also skip it",
 "The first rod that looks like a real purchase at 900 C$, which is why so many accounts own it. It beats the Flimsy Rod and is still a bad buy, because the rod you actually want costs 2,000.",
 "<p>Buying the Plastic Rod means earning 900 C$, then earning 2,000 C$ again. Fishing the dock for another ten minutes and buying once is strictly faster.</p>",["carbon-rod","moosewood","beginner"]],
["carbon-rod","Carbon Rod",1,2000,"<b>2,000 C$</b>","Marc&#8217;s shop, Moosewood","C","The first purchase worth making",
 "The consensus best beginner rod in Fisch: balanced stats, a weight ceiling high enough for the early islands, and cheap enough to be your first real purchase rather than a project. Buy it, then leave Moosewood.",
 "<p>No passive &mdash; its value is that nothing about it is bad. Enough resilience that the minigame stops punishing you, enough weight allowance that early-island catches land, and enough luck that bestiary work moves.</p><p>It stays fine until roughly <a href=\"#/e/mushgrove-swamp\">Mushgrove Swamp</a>, where the free <a href=\"#/e/fungal-rod\">Fungal Rod</a> replaces it for nothing.</p>",["fungal-rod","moosewood","beginner","path"]],
["long-rod","Long Rod",1,3000,"<b>3,000 C$</b>","Beside a tent at Moosewood","C","Reach, for the price of a snack",
 "Sold from a tent at Moosewood rather than from Marc&#8217;s shop, which is why plenty of players never find it. Its selling point is casting distance &mdash; some species simply do not live where a short cast lands.",
 "<p>Cheap enough to own alongside the Carbon Rod. If a bestiary entry is refusing to appear in water you can see, try casting further before you blame your luck stat.</p>",["carbon-rod","moosewood","bestiary"]],
["fast-rod","Fast Rod",1,4000,"<span class=\"flag\" title=\"4,000 C$ in one source, 4,500 C$ in another\"><b>4,000</b> or <b>4,500 C$</b></span>","Marc&#8217;s shop, Moosewood","C","Casts per hour, not rarity",
 "A lure-speed rod. Fish bite sooner, so you get more casts per hour &mdash; worth real money when you are farming common fish for C$, worth much less when you are hunting one rare species.",
 "<p>Lure speed multiplies your <em>throughput</em>; luck multiplies your <em>odds per cast</em>. Early on throughput usually wins, because you are selling volume.</p><p>Optional. If money is tight, skip it and the Lucky Rod both, and save for the Steady Rod.</p>",["lucky-rod","steady-rod","money"]],
["lucky-rod","Lucky Rod",1,4500,"<span class=\"flag\" title=\"4,500 C$ in one source, 5,250 C$ in another\"><b>4,500</b> or <b>5,250 C$</b></span>","Marc&#8217;s shop, Moosewood","C","Rarity bias, early",
 "The early luck rod. Where the Fast Rod gives you more casts, the Lucky Rod makes each cast likelier to produce something rare &mdash; which is what fills a bestiary and what sells for more than pocket change.",
 "<p>Universal luck biases the whole rarity table upward. It guarantees nothing: at these rates a dry stretch is normal and says nothing about the next cast.</p><p>Optional in the same way the Fast Rod is. The <a href=\"#/e/steady-rod\">Steady Rod</a> at 7,000 C$ is the rod both are a detour from.</p>",["steady-rod","fast-rod","luck","bestiary"]],
["steady-rod","Steady Rod",1,7000,"<b>7,000 C$</b>","Beside Alfie, Roslit Hamlet","B","The rod that ends the early game",
 "The first rod that feels like equipment rather than a starter item. It widens the shake UI and carries enough control and resilience to land almost anything the early and early-mid islands throw at you.",
 "<p>Its signature effect is a <strong>larger shake window</strong> &mdash; a direct difficulty reduction on the part of Fisch that costs new players the most fish. With high resilience alongside it, the minigame stops being a skill check on ordinary catches.</p><p>Buy it, sail to <a href=\"#/e/mushgrove-swamp\">Mushgrove Swamp</a>, and get the Fungal Rod for free.</p>",["fungal-rod","roslit-bay","minigame","path"]],
["fungal-rod","Fungal Rod",2,0,"<b>Free</b>","Agaric, Mushgrove Swamp &mdash; catch an Alligator","B","The best value in the game",
 "A free rod with a real passive, handed over for catching one Alligator in the swamp. There is no other point in Fisch where the reward-to-effort ratio is this lopsided, which is why every rod-progression guide routes through Agaric.",
 "<p><strong>Passive:</strong> roughly a <span class=\"flag\" title=\"60% is the figure the progression guides quote\">60% chance after each catch</span> to grant a strong luck boost for about <strong>45 seconds</strong>. Chained across a session that is close to permanent uptime.</p><p>That passive outperforms the shop rods available at the same stage, and it costs nothing. Get it before you spend six figures on anything.</p>",["agaric","mushgrove-swamp","luck","arctic-rod","path"]],
["stone-rod","Stone Rod",4,3000,"<b>3,000 C$</b>","Ancient Isle","C","Cheap, and a long way from home",
 "A 3,000 C$ rod sold on an island most players do not reach until the mid-game, which makes it an odd item: priced like a starter rod, stocked where nobody needs one.",
 "<p>Its real use is as a spare. If you are parked on <a href=\"#/e/ancient-isle\">Ancient Isle</a> farming relics and want a second rod for a different job, this is the cheapest one on the island.</p>",["ancient-isle","phoenix-rod","enchant-relic"]],
["nocturnal-rod","Nocturnal Rod",5,15000,"<b>15,000 C$</b>","Vertigo","B","Night fishing",
 "A cheap Vertigo purchase built around the night cycle. Fisch gates a real share of its species and mutations behind time of day, and this is the rod that specialises in the dark half.",
 "<p>Pair it with a <a href=\"#/e/sundial-totem\">Sundial Totem</a> rather than waiting for nightfall &mdash; the totem changes the server&#8217;s time, so a night rod is on-shift whenever you decide it is.</p>",["vertigo","sundial-totem","weather","darkened"]],
["magnet-rod","Magnet Rod",1,15000,"<b>15,000 C$</b>","Terrapin Island","B","Junk, on purpose",
 "Sold at Terrapin Island alongside the Shipwright. A magnet rod pulls metal and junk out of the water, which sounds like a downside until you want the things that come with it.",
 "<p>Worth owning if you are working the Terrapin bestiary or chasing container drops. Not a rod to progress on &mdash; it is a tool for one job.</p>",["terrapin-island","crates","bestiary"]],
["phoenix-rod","Phoenix Rod",4,40000,"<b>40,000 C$</b>","Ancient Isle","B","The Ancient Isle mid-tier buy",
 "The better of the two rods sold on Ancient Isle, at 40,000 C$. A reasonable purchase if you are already parked there farming <a href=\"#/e/enchant-relic\">Enchant Relics</a> and have money spare.",
 "<p>If you are choosing between this and saving toward the <a href=\"#/e/trident-rod\">Trident Rod</a> at 150,000 C$, save. The Trident Rod&#8217;s Atlantean passive earns part of its own price back; this does not.</p>",["ancient-isle","trident-rod","stone-rod"]],
["midas-rod","Midas Rod",3,55000,"<span class=\"flag\" title=\"55,000 C$ from the Travelling Merchant in one source; other write-ups place it differently\"><b>55,000 C$</b></span>","The Travelling Merchant","B","A money rod, not a rarity rod",
 "The dedicated money rod of the mid-game: a large chance for anything you catch to come up Golden, doubling what it sells for. It does nothing for bestiary work and everything for your bank balance.",
 "<p><strong>Passive:</strong> roughly a <span class=\"flag\" title=\"60% golden chance is the commonly quoted figure\">60% chance for a catch to be Golden</span>, doubling its value.</p><p>Sold by the <strong>Travelling Merchant</strong>, so stock and location move &mdash; that is also why write-ups disagree about where it comes from.</p><p>Worth owning if you are grinding toward a 750,000 C$ rod. Worth ignoring if you are grinding bestiary percentage, because a Golden common is still a common.</p>",["money","mutations-index","trident-rod","golden"]],
["aurora-rod","Aurora Rod",5,70000,"<b>70,000 C$</b>","Vertigo, during an Aurora Borealis","B","A mutation you can farm",
 "Bought in Vertigo, but only while an <strong>Aurora Borealis</strong> is running &mdash; a shop that is only open in the right weather. It lets you catch fish carrying the Aurora mutation.",
 "<p>The lesson this rod teaches is the one that carries the whole mid-game: in Fisch, weather is a resource. If the aurora is up on your server, buy the rod; if it is not, that is what <a href=\"#/e/totems\">totems</a> are for.</p>",["vertigo","weather","totems","mutations-index"]],
["kings-rod","King&#8217;s Rod",4,100000,"<span class=\"flag\" title=\"100,000 C$ in one source, 120,000 C$ in another\"><b>100,000</b> or <b>120,000 C$</b></span>","Keepers Altar &mdash; beside a skeleton, left of the elevator","B","Hidden in plain sight",
 "Not really a shop rod: it sits next to a skeleton in the <a href=\"#/e/keepers-altar\">Keepers Altar</a>, directly left of the elevator as you come down. Players who never paid the 400 C$ bribe have walked past it for months without knowing.",
 "<p>A solid mid-late rod. If you are choosing between this and the <a href=\"#/e/trident-rod\">Trident Rod</a> at 150,000 C$, take the Trident Rod &mdash; its Atlantean passive pays part of the difference back every session.</p>",["trident-rod","keepers-altar","enchanting"]],
["arctic-rod","Arctic Rod",4,null,"<span class=\"flag\" title=\"Shop price not consistently published\">Shop price varies</span>","Northern Summit","B","The cold-biome step",
 "The standard buy between the free Fungal Rod and the Trident Rod. Progression guides name it by position rather than by stat line: it is the rod you take north.",
 "<p>Its job is to make the northern and cold-water blocks comfortable while you fill their bestiary. If your route skips the cold biomes entirely, skip this rod and save toward the Trident Rod instead.</p>",["northern-expedition","snowcap-island","trident-rod","path"]],
["trident-rod","Trident Rod",4,150000,"<b>150,000 C$</b>","Trident&#8217;s Temple","A","The most flexible mid-game rod",
 "The rod the mid-game is built around, and the first one that partly pays for itself. Good at everything, exceptional at nothing, and carrying a passive that turns ordinary catches into triple-value ones.",
 "<p><strong>Passive:</strong> roughly a <strong>30% chance</strong> to apply the <a href=\"#/e/atlantean\">Atlantean</a> mutation, worth <strong>3&times; value</strong>.</p><p>That is the whole argument. At a 30% rate on a 3&times; multiplier the rod adds something in the region of 60% to your average sale &mdash; so the 150,000 C$ comes back, and every rod purchase after it comes faster.</p><p>This is the correct target for a mid-game player with no idea what to save for.</p>",["atlantean","tridents-temple","money","rod-of-the-depths","path"]],
["volcanic-rod","Volcanic Rod",5,150000,"<b>150,000 C$</b>","Volcanic Vents Pool &mdash; around <span class=\"num\">3180, &minus;2035, 4020</span>","A","A 5&times; mutation on a fifth of your catches",
 "One of the five rods added with Mariana&#8217;s Veil, and the cheapest genuinely strong money rod in the game. Bought at the Volcanic Vents Pool rather than from any town.",
 "<p><strong>Passive:</strong> a <strong>20% chance</strong> to apply the <strong>Ashen Fortune</strong> mutation, worth <strong>5&times; sale value</strong>.</p><p>Compare it with the <a href=\"#/e/trident-rod\">Trident Rod</a> at the same price: 30% at 3&times; against 20% at 5&times;. They land in much the same place on average, so buy whichever you can reach.</p>",["money","mutations-index","trident-rod","marianas-veil"]],
["destiny-rod","Destiny Rod",5,190000,"<b>190,000 C$</b>","Caleia, The Arch &mdash; needs <b>70% bestiary</b>","A","The collection payoff",
 "Cheap for its tier and locked behind work rather than money: Caleia will not sell it until your total bestiary completion reaches <strong>70%</strong>. It is the reward for having filled the easy locations properly on the way through.",
 "<p>The 70% gate is total completion across locations, so the efficient route is finishing <em>whole easy blocks</em> &mdash; Moosewood, Roslit Bay, Terrapin, the Ocean &mdash; rather than chasing one hard species everywhere.</p><p>At 190,000 C$ it undercuts rods well below it in power. If you are near 70%, finish the bestiary before you buy anything else.</p>",["caleia","the-arch","bestiary","terrapin-island"]],
["leviathans-fang-rod","Leviathan&#8217;s Fang Rod",6,350000,"<span class=\"flag\" title=\"350,000 C$ in the Mariana's Veil rod round-ups, 1,850,000 C$ in a Sunken Depths write-up\"><b>350,000</b> or <b>1,850,000 C$</b></span>","Near the entrance to the Veil of the Forsaken &mdash; after the Scylla fight","A","Fight-winning, not luck-winning",
 "A Mariana&#8217;s Veil rod that has to be earned before it can be bought: the <strong>Scylla</strong> boss fight gates the purchase. Everything about it is aimed at the reeling minigame rather than at what bites.",
 "<p><strong>Passive:</strong> <strong>+50 resilience</strong> and <strong>+20% progress speed with every slash</strong>.</p><p>That combination is what you want when the fish are heavy and the fights are long &mdash; deep water, hunts, boss catches. It does nothing for rarity, so pair it with a luck bait rather than a luck rod.</p>",["marianas-veil","resilience","minigame","sunken-depths"]],
["great-dreamer-rod","Great Dreamer Rod",7,500000,"<b>500,000 C$</b>","Cursed Isle","S","Farming and rarity at once",
 "Powerful lure speed, high luck and a duplication passive, for 500,000 C$ &mdash; less than the Rod of the Depths and arguably ahead of it. If Cursed Isle is reachable for you, this is the better buy.",
 "<p><strong>Passive:</strong> <span class=\"flag\" title=\"Credited to the Great Dreamer in one source and the Rod of the Depths in another\">an extra fish every third catch</span>. On a high lure-speed rod that compounds: more casts per hour, and every third one counts twice.</p>",["cursed-isle","money","rod-of-the-depths"]],
["tempest-rod","Tempest Rod",6,500000,"<span class=\"flag\" title=\"500,000 C$ in one Sunken Depths write-up, 1,850,000 C$ in another that ties it to The Sunken Trials\"><b>500,000</b> or <b>1,850,000 C$</b></span>","Sunken Depths &mdash; after The Sunken Trials","A","Storm-water specialist",
 "Sold in the <a href=\"#/e/sunken-depths\">Sunken Depths</a> behind The Sunken Trials. The two published prices differ by more than a million C$, which usually means a patch moved it &mdash; budget the higher one.",
 "<p>Storm and tempest conditions gate their own species and mutations, <a href=\"#/e/lightning\">Lightning</a> among them. A <a href=\"#/e/tempest-totem\">Tempest Totem</a> plus a storm rod is a deliberate loadout rather than a coincidence.</p>",["sunken-depths","weather","tempest-totem","lightning"]],
["rod-of-the-depths","Rod of the Depths",5,750000,"<b>750,000 C$</b>","Inside The Depths","A","The late-game workhorse",
 "The rod most accounts carry from the late game into the endgame, and the reason players grind the entire Vertigo bestiary. It costs 750,000 C$ and sits behind a key that cannot be bought.",
 "<p><strong>Getting to the shop is the hard part:</strong> 100% Vertigo bestiary &rarr; fish the Strange Whirlpool for The Depths Key &rarr; The Depths.</p><p><strong>Passive:</strong> sources split &mdash; one credits it with <span class=\"flag\" title=\"An extra fish every third catch is credited to this rod in one guide and to the Great Dreamer Rod in another\">an extra fish every third catch</span>, another describes ghost-catch and relic utility. Both agree it is strong.</p><p>Arrive with the money already banked; nothing in The Depths helps you earn it.</p>",["the-depths","vertigo","depths-key","money","path"]],
["abyssal-specter-rod","Abyssal Specter Rod",6,850000,"<b>850,000 C$</b>","Atlantis","A","The cheapest Atlantis rod",
 "The entry-level purchase among the Atlantis rods at 850,000 C$ &mdash; well under the Poseidon, Zeus and Kraken rods sold on the same island.",
 "<p>If you have made it to Atlantis but not to a million C$, this is the rod that makes the trip worth it immediately, rather than sailing home to farm and coming back.</p>",["atlantis","kraken-rod","poseidon-rod","money"]],
["kraken-rod","Kraken Rod",6,1333333,"<span class=\"flag\" title=\"950,000 C$ in one guide, 1,333,333 C$ in another\"><b>950,000</b> or <b>1,333,333 C$</b></span>","Atlantis &mdash; after unlocking the Kraken Pool, <span class=\"flag\" title=\"Reported alongside the Atlantis task chain\">~level 180</span>","A","The endgame bridge",
 "An Atlantis purchase gated on the Kraken Pool and on character level as well as money. Rare-catch bias, a duplication effect and a Tentacle Surge make it the bridge between late-game farming and genuine endgame gear.",
 "<p>The Kraken Pool opens only after the five-lever world quest &mdash; see <a href=\"#/e/kraken\">The Kraken</a>. Around <strong>level 180</strong> is also required; if your level is short, money will not substitute.</p><p>The two published prices differ by nearly 400,000 C$. Bank the higher figure and be pleasantly surprised.</p>",["atlantis","kraken","xp","money"]],
["poseidon-rod","Poseidon Rod",6,1555555,"<b>1,555,555 C$</b>","Atlantis &mdash; after the Poseidon Trial","A","Trial-gated Atlantis power",
 "One of the three trial rods sold in Atlantis. The money is the easy half; the Poseidon Trial is the half that decides when you get it.",
 "<p>Atlantis rewards doing the whole island rather than visiting it: the trials, the levers, the bestiary. Plan a long trip with the money already banked, not several short ones.</p>",["atlantis","zeus-rod","kraken-rod"]],
["zeus-rod","Zeus Rod",6,1700000,"<b>1,700,000 C$</b>","Atlantis &mdash; after the Zeus Trial, at Zeus&#8217; Rod Room","A","The other Atlantis trial rod",
 "Sold at Zeus&#8217; Rod Room once the Zeus Trial is complete. At 1.7M C$ it is the most expensive of the standard Atlantis rods.",
 "<p>Do the Zeus and Poseidon trials on the same visit. The rods are priced closely enough that the deciding factor is usually which trial you find easier, not which stat line reads better.</p>",["atlantis","poseidon-rod","kraken-rod"]],
["challengers-rod","Challenger&#8217;s Rod",8,2500000,"<b>2,500,000 C$</b>","Challenger Deep &mdash; around <span class=\"num\">740, &minus;3355, &minus;1530</span>","S","Faster fights, forever",
 "A Mariana&#8217;s Veil rod bought in the deepest water in the game. Its passive is unglamorous and quietly excellent.",
 "<p><strong>Passive:</strong> <strong>+20% progress speed</strong> when reeling.</p><p>Every fight ends 20% sooner, which means 20% more fights per hour, which on a money farm is a 20% raise that never rolls badly. Boring passives that always fire beat exciting ones that sometimes do.</p>",["marianas-veil","money","lure-speed","challenger-deep"]],
["heavens-rod","Heaven&#8217;s Rod",4,2750000,"<b>2,750,000 C$</b>","Northern Summit &mdash; solve the cave puzzle first","S","A puzzle, then a price tag",
 "Hidden behind a puzzle in a cave near the top of Northern Summit, and then sold for 2,750,000 C$. Two separate walls, one after the other.",
 "<p>Worth knowing about early even though you will not buy it early: it is the reason experienced players go back to <a href=\"#/e/northern-expedition\">Northern Summit</a> long after the Arctic Rod stops mattering.</p>",["northern-expedition","arctic-rod","money"]],
["chrysalis-rod","Chrysalis Rod",7,null,"<span class=\"flag\" title=\"No consistently published shop price\">Not a plain shop purchase</span>","Underground Music Venue","S","End of the standard ladder",
 "One of the two rods the mainstream progression guides finish on. Past this point the ladder stops being a ladder and becomes a question of which specialist rod suits what you are farming.",
 "<p>If you own one of the pair, the other is a sidegrade, not an upgrade. Spend the effort on <a href=\"#/g/enchanting\">enchanting</a> the one you have &mdash; an exalted enchant is worth more than a second finisher rod.</p>",["wingripper-rod","underground-music-venue","enchanting"]],
["wingripper-rod","Wingripper Rod",7,null,"<span class=\"flag\" title=\"No consistently published shop price\">Not a plain shop purchase</span>","Underground Music Venue","S","End of the standard ladder",
 "The other finisher from the Underground Music Venue, and the other correct answer to &ldquo;what is the last rod I need&rdquo;. Interchangeable with the Chrysalis for most purposes, and a fixture near the top of every tier list.",
 "<p>Take whichever the venue offers you first, then stop shopping and start enchanting.</p>",["chrysalis-rod","underground-music-venue","ruinous-oath"]],
["elder-moss-ripper","Elder Moss Ripper Rod",8,null,"<span class=\"flag\" title=\"Obtained at Castaway Cliffs; acquisition details vary between write-ups\">Castaway Cliffs &mdash; verify in game</span>","Castaway Cliffs","S","The money meta, single-handedly",
 "The rod that defines endgame income. Its <em>Lurking Mossjaw</em> passive guarantees a high-value Mossy Great Gold Cursed Shark on roughly a two-minute cycle, which is why Castaway Cliffs is quoted at 15&ndash;25M C$ per hour with it and 2&ndash;4M without.",
 "<p><strong>Passive &mdash; Lurking Mossjaw:</strong> a guaranteed Mossy Great Gold Cursed Shark about every <strong>2 minutes</strong>.</p><p>Understand what that means: the rate is a <em>timer</em>, not a luck roll. Your job at the cliffs is to never be idle when the timer comes up &mdash; which makes lure speed and short fights worth more than extra luck here.</p>",["castaway-cliffs","money","mossy-great-gold-cursed-shark","calm-zone"]],
["ethereal-prism-rod","Ethereal Prism Rod",8,3500000,"<span class=\"flag\" title=\"3,500,000 C$ in one source, 15,000,000 C$ in the Mariana's Veil round-ups\"><b>3,500,000</b> or <b>15,000,000 C$</b></span>","Island in the middle of Rainbow Lake &mdash; needs the Forsaken Gate and the Veil of the Forsaken bestiary","S","The best money rod in the game",
 "Named outright by tier lists as the single best rod in Fisch, for one reason: money. The highest luck in the game, excellent lure speed, and a passive that fires on half of everything you catch.",
 "<p><strong>Passive:</strong> a <strong>50% chance</strong> to apply the <strong>Prismize</strong> mutation, worth <strong>8&times;</strong>.</p><p>Half your catches at eight times value is not a bonus, it is a different economy. It also pays for itself quickly even at the higher of the two quoted prices.</p><p>The gate is completion, not cash: the Forsaken Gate has to be unlocked and the Veil of the Forsaken bestiary finished.</p>",["marianas-veil","money","mutations-index","calm-zone"]],
["rod-of-the-zenith","Rod of the Zenith",8,10000000,"<b>10,000,000 C$</b>","Abyssal Zenith &mdash; southwest of the pool, around <span class=\"num\">&minus;13625, &minus;11035, &minus;355</span>","S","Rewards perfect play, literally",
 "The Mariana&#8217;s Veil skill rod. It is the only rod in the game that asks you to be good at the minigame and pays you for it.",
 "<p><strong>Passive:</strong> perfect catches build a streak that improves the mutations you roll. <strong>Miss a perfect catch and the streak resets.</strong></p><p>That makes it the opposite of the timer rods: on the Zenith your attention <em>is</em> the stat. Fish it when you are focused, and carry something forgiving when you are not.</p>",["marianas-veil","minigame","mutations-index","money"]],
["requiem","Requiem",8,15000000,"<b>15,000,000 C$</b> plus ingredients","Crafted at the Ancient Archives","S","The crafting endgame",
 "The headline craft. Fifteen million C$ is the easy part of the recipe; the four ingredients are the reason so few accounts carry one.",
 "<p><strong>Recipe:</strong></p><ul><li><b>5&times; Requis Essence</b> &mdash; mined from dripstones, or from Diver NPC quests</li><li><b>1&times; Requiem Core</b> &mdash; from the Magical Diver NPC&#8217;s quest</li><li><b>1&times; Awakened Omnithal</b> &mdash; caught during the Awakened Omnithal Hunt</li><li><b>1&times; Fossilized Plesiosaur</b> &mdash; caught <em>with a <a href=\"#/e/voyager-rod\">Voyager Rod</a></em> during the Plesiosaur Hunt</li></ul><p>Note the dependency: one craftable rod is an ingredient for another. Build the Voyager first or the recipe stalls at the last line.</p>",["ancient-archives","voyager-rod","crafting","masterline-rod"]],
["fabulous-rod","Fabulous Rod",8,null,"<span class=\"flag\" title=\"Quest reward; no purchase price\">Quest reward &mdash; level 1000</span>","Fabulous Deity, Calm Zone","S","A level-1000 wall",
 "Awarded for finishing the final stage of the Fabulous Deity&#8217;s quest in the <a href=\"#/e/calm-zone\">Calm Zone</a>. You cannot even start it below <strong>level 1000</strong>.",
 "<p>Tier lists put it in the top handful, with luck in the 250&ndash;300% band. For almost every player the honest note is that the level requirement, not the quest, is the project.</p>",["calm-zone","xp","masterline-rod","olympian-godbreaker"]],
["masterline-rod","Masterline Rod",8,null,"<span class=\"flag\" title=\"Named as the reward for completing the Bestiary and the Rod Journal; other sources describe the 100% bestiary reward as cosmetic\">Completion reward &mdash; disputed</span>","Bestiary + Rod Journal completion","S","The completionist rod",
 "Described as the best all-rounder in the game and earned rather than bought: complete the Bestiary <em>and</em> the Rod Journal. Other sources describe the 100% bestiary reward as cosmetic and do not mention a rod, so treat this as a target rather than a plan.",
 "<p>Plan your bestiary grind around the <strong>70% Destiny Rod gate</strong>, which every source agrees on, and treat anything at 100% as a bonus.</p>",["bestiary","destiny-rod","rod-mastery","sources"]],
["olympian-godbreaker","Olympian Godbreaker",8,50000000,"<b>50,000,000 C$</b>","Olympian Fissure &mdash; level 981, after catching the Olympian Devil, with <b>100% bestiaries</b>","S","The hardest thing to own",
 "The top of the game. Fifty million C$, level 981, a boss catch, and complete bestiaries &mdash; every gate Fisch has, on one item.",
 "<p><strong>Requirements:</strong> level <b>981</b>; catch the <strong>Olympian Devil</strong>; <strong>100% completion</strong> of the bestiaries; then 50,000,000 C$ at the Olympian Fissure.</p><p>If you are reading this before the endgame, the useful takeaway is that it changes none of your next five steps.</p>",["xp","bestiary","money","fabulous-rod"]],
["ruinous-oath","Ruinous Oath",8,null,"<span class=\"flag\" title=\"Endgame acquisition; not a standard shop purchase\">Endgame acquisition</span>","Endgame content","S","A high-level favourite",
 "Named repeatedly when high-level players are asked what the best rod in Fisch is: very high luck, very high lure speed, no meaningful weakness.",
 "<p>If you are reading this before the endgame, it does not change your next three steps. Get the <a href=\"#/e/trident-rod\">Trident Rod</a>, get through Vertigo, and worry about this when the rest of your account is there.</p>",["wingripper-rod","elder-moss-ripper","enchanting","path"]],
["resourceful-rod","Resourceful Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","B","Craftable",
 "One of the ten rods craftable at the Ancient Archives. Each craft has its own level requirement and three ingredients, and some of those ingredients have to be fished with a specific rod or carry a specific mutation before they count.",
 "<p>Crafting is the part of Fisch that rewards planning rather than money. Read the recipe before you start farming for it &mdash; several ask for an appraised or mutated version of an ordinary item, which is a different job from just catching one.</p>",["ancient-archives","crafting","ancient-isle"]],
["seasons-rod","Seasons Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","B","Craftable",
 "A craftable rod from the Ancient Archives. Named for the seasonal conditions its ingredients and behaviour revolve around.",
 "<p>Weather and time gate a real share of Fisch&#8217;s content, and <a href=\"#/e/totems\">totems</a> let you buy the condition rather than wait for it &mdash; which matters as much for gathering a recipe as for catching a fish.</p>",["ancient-archives","crafting","weather","totems"]],
["riptide-rod","Riptide Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","B","Craftable",
 "A craftable Ancient Archives rod. The Archives themselves are the gate most players hit first: the room only opens after the Ancient Isle totem puzzle is solved.",
 "<p>If the crafting station is not there when you arrive, you have not finished the puzzle. That is the requirement, not a bug.</p>",["ancient-archives","crafting","ancient-isle"]],
["voyager-rod","Voyager Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","A","Craftable, and a prerequisite",
 "A craftable rod that matters beyond its own stat line: the <a href=\"#/e/requiem\">Requiem</a> recipe requires a <strong>Fossilized Plesiosaur caught with a Voyager Rod</strong>. You cannot substitute another rod for that line.",
 "<p>If Requiem is anywhere in your plans, build the Voyager first. Discovering the dependency at the last ingredient is the kind of mistake that costs a week.</p>",["requiem","ancient-archives","crafting"]],
["lost-rod","The Lost Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","B","Craftable",
 "A craftable Ancient Archives rod with its own documented page on the official wiki, which is more than most rods at this tier can claim.",
 "<p>As with every craft here: three ingredients and a level requirement, and the ingredients are the hard half.</p>",["ancient-archives","crafting"]],
["celestial-rod","Celestial Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","A","Craftable",
 "One of the stronger Ancient Archives crafts. Celestial and night-cycle content overlap in Fisch, so it pairs naturally with a <a href=\"#/e/sundial-totem\">Sundial Totem</a>.",
 "<p>Crafted rods sit oddly in a progression: they are not gated by money, so a patient mid-game player can carry one long before they could afford an equivalent shop rod.</p>",["ancient-archives","crafting","sundial-totem","nocturnal-rod"]],
["rod-of-the-eternal-king","Rod of the Eternal King",7,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","S","Craftable, and top-tier",
 "The craftable rod that shows up in tier lists next to rods costing millions. Fisch&#8217;s crafting system is not a side activity &mdash; its ceiling is genuinely endgame.",
 "<p>If you are choosing one Archives project, this is the one most commonly named as worth it.</p>",["ancient-archives","crafting","requiem","masterline-rod"]],
["rod-of-the-forgotten-fang","Rod of the Forgotten Fang",7,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","A","Craftable",
 "An Ancient Archives craft. Named alongside the Eternal King and the Spiritbinder as the upper end of what the crafting table produces.",
 "<p>Three ingredients, a level requirement, and no C$ shortcut &mdash; the usual shape.</p>",["ancient-archives","crafting"]],
["spiritbinder","Spiritbinder",7,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","A","Craftable",
 "One of the ten Ancient Archives crafts, and one of the better-regarded ones.",
 "<p>Worth noting for anyone comparing routes: a crafted rod costs time and materials where a shop rod costs C$. If your bank balance is the bottleneck, crafting is the route that ignores it.</p>",["ancient-archives","crafting","money"]],
["vineweaver-rod","Vineweaver Rod",6,null,"Crafted &mdash; level gate + 3 ingredients","Ancient Archives","B","Craftable",
 "A craftable Ancient Archives rod, on the swamp-and-overgrowth end of the roster.",
 "<p>The tenth of the ten crafts documented as of the Ancient Isle crafting release.</p>",["ancient-archives","crafting","mushgrove-swamp"]],
["fallen-rod","Fallen Rod",7,null,"<span class=\"flag\" title=\"Tidefall acquisition; price not consistently published\">Tidefall &mdash; verify in game</span>","Tidefall","A","The Tidefall starter",
 "Described as the first essential rod of the Tidefall content. Update zones in Fisch usually ship with one rod that is effectively the entry ticket to the rest of the zone, and this is Tidefall&#8217;s.",
 "<p>Zone rods are worth buying early in a zone rather than late &mdash; they are balanced around the content around them, so they pay back across the whole area rather than at the end of it.</p>",["tidefall","bestiary"]],
["ancient-idol-rod","Ancient Idol Rod",9,null,"Quest &mdash; 7 Ancient Idol Charms + 5 Giant fish","Forge Master Torin, Skycrest","S","165% luck, infinite weight",
 "A Skycrest event rod earned rather than bought: collect all <strong>seven Ancient Idol Charms</strong> and catch <strong>five Giant fish</strong> at Skycrest, then hand them to Forge Master Torin.",
 "<p><strong>Stats:</strong> <b>165% luck</b> and <b>infinite max weight</b>, with a passive called <strong>Idol&#8217;s Judgment</strong> that fires during catches.</p><p>Infinite weight capacity is the quiet headline. It removes the one hard failure in Fisch &mdash; a fish too heavy to land &mdash; permanently.</p>",["skycrest","charms","max-weight","fruitline"]],
["fruitline","Fruitline",9,null,"Quest &mdash; Fruit Lover Frank, then the Fruity Abaia","Skycrest","S","The highest luck of any rod",
 "The other Skycrest headline rod, and the luck record-holder: <strong>200% luck</strong> with <strong>infinite max weight</strong>. Limited-time, and a genuine chain of work to get.",
 "<p><strong>The chain:</strong> collect <strong>25 tropical fruits</strong> around Skycrest for Fruit Lover Frank &rarr; clear his follow-up fishing task &rarr; sacrifice limited fish at the <strong>Fire of Spirits</strong> during a <strong>Tropical Sun</strong> to spawn the <strong>Fruity Abaia</strong> &rarr; land it.</p><p>Note the weather condition is a Tropical <em>Sun</em>, not the Tropical Squall that summons the ordinary <a href=\"#/e/abaia\">Abaia</a>. They are different hunts.</p>",["skycrest","abaia","charms","luck"]],
["migu-rod","MiguRod",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","Tier-list regular",
 "One of the rods September 2026 tier lists lead with. Its acquisition route is not consistently written up anywhere this wiki could check, so it is listed by name rather than described in detail.",
 "<p>Rods like this are the reason the rod count in circulation ranges from 188 to 257 &mdash; new ones arrive faster than the community databases agree on them.</p>",["rods-index","sources"]],
["castbound","Castbound",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","Tier-list regular",
 "A rod named among the top performers in current tier lists. Documented here by name and standing; its route is not something this wiki can confirm.",
 "<p>If you are choosing a goal rod, prefer one whose acquisition you can actually read start to finish &mdash; the <a href=\"#/e/ethereal-prism-rod\">Ethereal Prism Rod</a> or the <a href=\"#/e/rod-of-the-eternal-king\">Rod of the Eternal King</a>, for instance.</p>",["rods-index","sources"]],
["polaris-serenade","Polaris Serenade",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","Tier-list regular",
 "One half of a pair with the Astraeus Serenade, both named in the upper tiers of current lists.",
 "<p>Listed for completeness. Where this wiki cannot source an acquisition route, it says so rather than guessing at one.</p>",["astraeus-serenade","rods-index","sources"]],
["astraeus-serenade","Astraeus Serenade",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","250&ndash;300% luck band",
 "Grouped with the Fabulous Rod and Hades&#8217; Soul-Scythe as rods carrying <strong>250&ndash;300% luck</strong> with solid control and resilience &mdash; the consistency picks for rare hunting at the top of the game.",
 "<p>That luck band is roughly double what the strong mid-game rods carry, which is what &ldquo;endgame&rdquo; means in practice here.</p>",["fabulous-rod","hades-soul-scythe","luck"]],
["hades-soul-scythe","Hades&#8217; Soul-Scythe",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","250&ndash;300% luck band",
 "Named alongside the Astraeus Serenade and the Fabulous Rod in the 250&ndash;300% luck bracket. Part of the Olympus-flavoured content that also produced the <a href=\"#/e/olympian-godbreaker\">Olympian Godbreaker</a>.",
 "<p>High luck with real control and resilience is the endgame profile: you stop losing fish <em>and</em> you catch better ones.</p>",["olympian-godbreaker","astraeus-serenade","luck"]],
["dreambreaker","Dreambreaker",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","S","Tier-list regular",
 "A top-tier rod named in current lists, and presumably related to the <a href=\"#/e/great-dreamer-rod\">Great Dreamer Rod</a> line &mdash; though nothing this wiki could check confirms that.",
 "<p>Named here so the list is honest about what exists, not so you can plan around it.</p>",["great-dreamer-rod","rods-index","sources"]],
["cinderstring","Cinderstring",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","A","Tier-list regular",
 "A fire-flavoured rod named in the upper tiers, fitting the same family as the <a href=\"#/e/volcanic-rod\">Volcanic Rod</a> and the Ashen Fortune mutation.",
 "<p>If you are hunting volcanic-biome species, check whether this or the Volcanic Rod is stocked somewhere you can actually reach.</p>",["volcanic-rod","rods-index"]],
["fang-of-the-eclipse","Fang of the Eclipse",8,null,"<span class=\"flag\" title=\"Named in September 2026 tier lists; acquisition not consistently published\">Named in tier lists &mdash; verify in game</span>","Late-game content","A","Tier-list regular",
 "An eclipse-themed rod named among the notable performers. Eclipse and night content overlap, so it likely sits with the <a href=\"#/e/nocturnal-rod\">Nocturnal Rod</a> family.",
 "<p>Listed by name; the route is not something this wiki can verify.</p>",["nocturnal-rod","rods-index","sources"]],
["sunken-rod","Sunken Rod",6,null,"<span class=\"flag\" title=\"Documented on community wikis; price and exact route vary\">Sunken Depths &mdash; verify in game</span>","Sunken Depths","A","Deep-water specialist",
 "A rod tied to the <a href=\"#/e/sunken-depths\">Sunken Depths</a>, alongside the Tempest and Leviathan&#8217;s Fang rods. Deep water is where weight ceilings and resilience start deciding outcomes.",
 "<p>Before spending time down here, check your <a href=\"#/e/max-weight\">max weight</a>. A rod that cannot land the local species makes the trip pointless regardless of luck.</p>",["sunken-depths","tempest-rod","max-weight"]],
["mythical-rod","Mythical Rod",6,null,"<span class=\"flag\" title=\"Documented on community wikis; price and route not consistently published\">Verify in game</span>","Mid-late content","A","Rarity-focused",
 "A long-standing rod in the Fisch roster, built around chasing rarity rather than weight or speed.",
 "<p>Any rod in this family competes with simply putting a universal-luck bait on the rod you already own. Compare the two before you spend.</p>",["luck","weird-algae","rods-index"]],
["apollos-sunshot","Apollo&#8217;s Sunshot",8,null,"<span class=\"flag\" title=\"Documented in guide write-ups; route not consistently published\">Verify in game</span>","Olympus content","S","Sun and solar content",
 "Part of the Olympus-flavoured content, and connected to the Solar mutation line that also runs through <a href=\"#/e/sunstone-island\">Sunstone Island</a>.",
 "<p>Solar content is daytime-gated, which makes a <a href=\"#/e/sundial-totem\">Sundial Totem</a> as much a part of the loadout as the rod.</p>",["olympian-godbreaker","sundial-totem","weather"]],
["rod-of-the-singularity","Rod of the Singularity",8,null,"<span class=\"flag\" title=\"Documented in guide write-ups; route not consistently published\">Verify in game</span>","Endgame content","S","Endgame oddity",
 "An endgame rod documented in dedicated guides. Named here for completeness &mdash; the acquisition route is not something this wiki could confirm from the sources available to it.",
 "<p>The pattern with rods at this tier is consistent: a long quest chain, a level gate, or a completion requirement, rather than a price.</p>",["rods-index","sources"]],
["noiseform-rod","Noiseform Rod",8,null,"Shady Bazaar questline &mdash; three catch quests","Shady Bazaar","A","Questline rod",
 "Earned through the Shady Bazaar questline, which runs three separate catch quests rather than asking for money. The same content line carries a Chromatic skin code.",
 "<p>Questline rods are the friendliest kind for a mid-game account: the requirement is time and a checklist, not a bank balance.</p>",["codes","rods-index"]],
["lullaby","Lullaby",8,null,"<span class=\"flag\" title=\"Documented on community wikis; route not consistently published\">Verify in game</span>","Late-game content","A","Named rod",
 "A named rod documented on the community wikis. Included so the roster here is honest about the size of the game rather than tidy.",
 "<p>Fisch adds rods faster than any wiki keeps up with &mdash; including this one. Treat any rod list, anywhere, as a snapshot.</p>",["rods-index","sources"]]
];
RODS.forEach(r => E("rod", r[0], r[1], {stage:r[2], cost:r[3], tier:r[6], src:r[5],
  t:[stageTag(r[2]), r[4], r[5], r[7]],
  info:[["Stage","<b>" + r[2] + "</b> &mdash; " + STAGES[r[2]]],["Cost",r[4]],["Source",r[5]],["Tier",'<span class="tier t-'+r[6]+'">'+r[6]+"</span>"],["Role",r[7]]],
  lead:r[8], sec:[["Passive and notes", r[9]]], see:(r[10]||[]).concat(["rods-index","path"])}));

/* ═════════════════════════ BAITS ═════════════════════════ */
const BAITS = [
["worm","Worm","common","Small universal luck","Starter bait; shops and bait spots everywhere",
 "The default bait. A small universal luck bump for almost nothing, which makes it the right thing to have on the line when you are farming volume rather than hunting a species."],
["fish-head","Fish Head","common","Small luck; cheap and plentiful","Shops, crates, cut from catches",
 "The other everyday bait. Interchangeable with the Worm for most purposes &mdash; use whichever you have more of and save the good baits for when you are actually hunting something."],
["flakes","Flakes","common","Small universal luck","Shops",
 "Bulk bait. Buy it in stacks when you are settling in for a long farming session, because running out of bait mid-session costs more than the bait does."],
["squid","Squid","rare","Preferred <em>and</em> universal luck; lower lure speed","Caught, crates",
 "The first bait that behaves like real equipment: it raises both preferred and universal luck at the cost of lure speed. You are trading casts per hour for quality per cast, which is the correct trade when you are filling a bestiary."],
["truffle-worm","Truffle Worm","legendary","<b>+300% preferred luck</b>, &minus;10% lure speed","Crates, events, bait spots",
 "The species-hunting bait. A very large preferred-luck bonus for only a small lure-speed penalty &mdash; the best bait in the game for going after one specific fish, and close to wasted when you are farming whatever bites."],
["weird-algae","Weird Algae","legendary","<b>+200% universal luck</b>, &minus;35% lure speed","Crates, bait spots",
 "The rarity-hunting bait. It biases the whole table upward rather than one species, and it costs a third of your casting speed to do it. Right for bestiary sweeps and rare-drop farming, wrong for money farming, where throughput is the point."]
];
BAITS.forEach(b => E("bait", b[0], b[1], {rar:b[2],
  t:['<span class="rar rar-'+b[2]+'">'+b[2]+"</span>", b[3], b[4]],
  info:[["Rarity",'<span class="rar rar-'+b[2]+'">'+b[2]+"</span>"],["Effect",b[3]],["Sources",b[4]]],
  lead:b[5],
  sec:[["Choosing a bait","<p>The decision is always the same one: <strong>preferred luck</strong> if you are hunting a named fish, <strong>universal luck</strong> if you are hunting rarity in general, and <strong>lure speed</strong> if you are hunting money. A bait that helps one of those actively hurts the others.</p>"]],
  see:["luck","baits-index","money","bestiary"]}));

/* ═════════════════════════ FISH ═════════════════════════ */
const FISH = [
["alligator","Alligator","rare","Mushgrove Swamp","Agaric&#8217;s quest fish &mdash; catch one, get the Fungal Rod free",
 "The most valuable fish in the early game and it sells for almost nothing. Catching one Alligator in Mushgrove Swamp completes Agaric&#8217;s quest, and Agaric hands over the <a href=\"#/e/fungal-rod\">Fungal Rod</a> for free."],
["nurse-shark","Nurse Shark","uncommon","Roslit Bay shallows","Marks the early Enchant Relic shallows",
 "Not valuable in itself. It matters because the water where Nurse Sharks spawn in <a href=\"#/e/roslit-bay\">Roslit Bay</a> is the early-game <a href=\"#/e/enchant-relic\">Enchant Relic</a> farm &mdash; if you are catching them, you are in the right spot."],
["colossal-squid","Colossal Squid","legendary","Deep water, foggy weather","A weather-gated bestiary entry",
 "One of the fish that will not appear until the weather cooperates. Fog is the condition, and a <a href=\"#/e/smokescreen-totem\">Smokescreen Totem</a> is how you make fog happen instead of waiting for it."],
["crowned-anglerfish","Crowned Anglerfish","legendary","Deep water, foggy weather","The other classic fog catch",
 "Filed with the Colossal Squid for the same reason: fog-preferring, deep, and a bestiary hole that stays open for a long time if you never buy a totem."],
["crystallized-seadragon","Crystallized Seadragon","mythical","<a href=\"#/e/calm-zone\">The Calm Zone</a>","<span class=\"flag\" title=\"Community average; weight and mutation swing individual sales hard\">~26,100 C$ average</span> &mdash; the endgame money fish",
 "The single fish the endgame money meta is built on outside the Castaway Cliffs setup. At roughly 26,100 C$ on average it turns a Calm Zone session into a rod budget."],
["mossy-great-gold-cursed-shark","Mossy Great Gold Cursed Shark","mythical","<a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a>","The Elder Moss Ripper&#8217;s guaranteed catch, ~every 2 min",
 "The fish behind the 15&ndash;25M C$/hr figure. The <a href=\"#/e/elder-moss-ripper\">Elder Moss Ripper Rod</a>&#8217;s Lurking Mossjaw passive puts one on your line roughly every two minutes, which is an income rate rather than a drop rate."],
["megalodon","Megalodon","secret","Open ocean &mdash; hunt event","The open-world boss catch",
 "The classic Fisch trophy: an open-world hunt rather than a fish you find. Servers force Megalodon hunts through day/night cycling, which is why organised players carry stacks of <a href=\"#/e/sundial-totem\">Sundial Totems</a>."],
["isonade","Isonade","mythical","Deep water","The standard example of a stacked catch",
 "Community write-ups reach for Isonade whenever they explain stacking, because the canonical worked example is a <em>Glitched Shiny Sparkling Big Silver Isonade</em> &mdash; attributes and a mutation on one fish, all multiplying together."]
];
FISH.forEach(f => E("fish", f[0], f[1], {rar:f[2],
  t:['<span class="rar rar-'+f[2]+'">'+f[2]+"</span>", f[3], f[4]],
  info:[["Rarity",'<span class="rar rar-'+f[2]+'">'+f[2]+"</span>"],["Where",f[3]],["Why it matters",f[4]]],
  lead:f[5], see:["fish-index","bestiary","mutations-index","money"]}));

/* ═════════════════════════ MUTATIONS ═════════════════════════ */
const MUTS = [
["aether","Aether",12,"The top standard mutation. Rare enough that most players see one a handful of times."],
["tryhard","Tryhard",10,"Joint second among standard mutations."],
["plagued","Plagued",10,"Joint second, and the one people most often mistake for a debuff."],
["atlantean","Atlantean",3,"The <a href=\"#/e/trident-rod\">Trident Rod</a> applies it at roughly a 30% rate &mdash; the only mutation you can reliably manufacture mid-game."],
["midas","Midas",2.5,"Top of the common-tier multipliers, and the one the <a href=\"#/e/midas-rod\">Midas Rod</a> is named for."],
["purified","Purified",2.5,"Shares the 2.5&times; band with Midas."],
["sleet","Sleet",2.4,"A cold-biome mutation &mdash; <a href=\"#/e/snowcap-island\">Snowcap</a> and the northern water."],
["electric","Electric",2.1,"Storm-adjacent. Weather changes what you can roll."],
["aurelian","Aurelian",2,"Solid 2&times; band."],
["lightning","Lightning",2,"Storm weather. A <a href=\"#/e/tempest-totem\">Tempest Totem</a> makes storms happen on demand."],
["shiny","Shiny",1.85,"An <strong>attribute</strong>, not a mutation: admin-event only, stacks with a real mutation, and &mdash; critically &mdash; cannot be lost when you appraise."],
["sparkling","Sparkling",1.85,"The other admin-event attribute. Stacks with Shiny <em>and</em> with a mutation on the same fish."],
["silver","Silver",1.8,"Common enough to see regularly on a farming session."],
["studded","Studded",1.8,"Shares the 1.8&times; band with Silver."],
["glossy","Glossy",1.6,"Mid-band, unremarkable, adds up over a session."],
["aurous","Aurous",1.5,"The 1.5&times; band is where most of your mutated catches land."],
["cement","Cement",1.5,"1.5&times; band."],
["darkened","Darkened",1.5,"1.5&times; band; night-adjacent."],
["frozen","Frozen",1.5,"1.5&times; band; cold water."],
["mosaic","Mosaic",1.5,"1.5&times; band."],
["subspace","Subspace",null,"Applied by the exalted <a href=\"#/e/quantum\">Quantum</a> enchant at a 25% rate. The enchant is the reliable source; the multiplier itself is not consistently published."],
["golden","Golden",2,"<span class=\"flag\" title=\"Described as doubling value; sources treat Golden as a value state rather than listing it in the mutation multiplier tables\">Doubles value</span>. The <a href=\"#/e/midas-rod\">Midas Rod</a> applies it at roughly 60%."]
];
MUTS.forEach(m => E("mut", m[0], m[1], {mult:m[2],
  t:[m[2] ? '<span class="num"><b>' + m[2] + "&times;</b></span>" : '<span class="num flag" title="Multiplier not consistently published">unpublished</span>', m[3]],
  info:[["Multiplier",m[2] ? "<b>" + m[2] + "&times;</b> value" : "Not consistently published"],["Kind",(m[0]==="shiny"||m[0]==="sparkling")?"Attribute (appraisal-safe)":"Mutation"],["Stacks with","Attributes, weight, and appraisal rerolls"]],
  lead:m[3],
  sec:[["How mutations are earned","<p>Mutations come from the conditions you fish in &mdash; biome, weather, time of day &mdash; from rod passives that apply one directly, and from enchants. The reliable ones are the manufactured ones: the <a href=\"#/e/trident-rod\">Trident Rod</a>&#8217;s Atlantean at ~30%, the <a href=\"#/e/midas-rod\">Midas Rod</a>&#8217;s Golden at ~60%, and <a href=\"#/e/quantum\">Quantum</a>&#8217;s Subspace at 25%.</p><p><strong>Attributes stack with mutations.</strong> A fish can carry Shiny and Sparkling and a mutation at once, and the multipliers apply together &mdash; which is where the enormous headline sale values come from.</p>"]],
  see:["appraisal","mutations-index","value","weather"]}));

/* ═════════════════════════ ENCHANTS ═════════════════════════ */
const ENCH = [
["quantum","Quantum","Exalted","<b>25% chance</b> for a caught fish to gain the <a href=\"#/e/subspace\">Subspace</a> mutation",
 "The mutation-farming enchant. A quarter of everything you catch comes up mutated, which compounds with weight and attributes into sale values nothing else reaches.",
 "Put it on the rod you farm money with, not the rod you explore with. A 25% mutation rate is worth the most when you are catching high-base-value fish repeatedly &mdash; <a href=\"#/e/calm-zone\">Calm Zone</a> or <a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a>, not a bestiary sweep."],
["sea-overlord","Sea Overlord","Exalted","<b>+25%</b> fish weight",
 "A flat 25% on weight, and weight is a direct multiplier on sale value &mdash; so this is a flat 25% raise on every fish you sell, forever, with no conditions attached.",
 "The least exciting exalted enchant and one of the best. It never misfires, never depends on a roll and never stops applying."],
["invincible","Invincible","Exalted","Fish the <a href=\"#/e/brine-pool\">Brine Pool</a> and Roslit Volcano <em>regardless of rod</em>",
 "Access rather than power. The two hazard pools reject ordinary rods; Invincible removes the restriction for whatever rod carries it.",
 "If your bestiary is stuck on hazard-water species, this enchant is the fix and no amount of luck stacking substitutes for it."],
["immortal","Immortal","<span class=\"flag\" title=\"Named as a strong all-rounder; sources do not consistently place it in the exalted pool\">Pool disputed</span>","Strong balance of luck and speed",
 "The all-rounder pick: good luck, good lure speed, no glaring weakness. Named alongside Quantum whenever players are asked for the best enchant in the game.",
 "The right roll to keep if you carry one rod for everything. If you carry a farming rod and a hunting rod, the specialists beat it on each."]
];
ENCH.forEach(e => E("ench", e[0], e[1], {rar:e[2]==="Exalted"?"mythical":"legendary",
  t:[e[2], e[3]],
  info:[["Relic",e[2]],["Effect",e[3]],["Applied at","<a href=\"#/e/keepers-altar\">Keepers Altar</a>"],["Roll","Random from its pool"]],
  lead:e[4], sec:[["Using it well", "<p>" + e[5] + "</p>"]],
  see:["enchanting","keepers-altar","exalted-relic","enchants-index"]}));

/* ═════════════════════════ ITEMS & GEAR ═════════════════════════ */
const ITEMS = [
["rowboat","Rowboat","Boat","<b>400 C$</b> from the Shipwright at Moosewood docks &mdash; the unlock that opens the map",
 "The cheapest important purchase in Fisch. Without a boat there is one island; with one there is a game. Buy it in your first session, before any rod above the Carbon Rod."],
["enchant-relic","Enchant Relic","Relic","Fished up &mdash; best at <a href=\"#/e/ancient-isle\">Ancient Isle</a>, workable in <a href=\"#/e/roslit-bay\">Roslit Bay</a>",
 "The currency of enchanting. One relic buys one random enchant roll at the <a href=\"#/e/keepers-altar\">Keepers Altar</a>, and since a new roll overwrites the old one, you want a stack before you start rather than one at a time."],
["exalted-relic","Exalted Relic","Relic","Far rarer than a standard relic; same altar",
 "Rolls from a smaller pool of much stronger enchants &mdash; <a href=\"#/e/quantum\">Quantum</a>, <a href=\"#/e/sea-overlord\">Sea Overlord</a>, <a href=\"#/e/invincible\">Invincible</a>. Spend these on the rod you intend to keep, not the rod you happen to be holding."],
["depths-key","The Depths Key","Key","Fished from the Strange Whirlpool in <a href=\"#/e/vertigo\">Vertigo</a>, after 100% Vertigo bestiary",
 "The only way into <a href=\"#/e/the-depths\">The Depths</a>. It cannot be bought, traded around or skipped, and it will not drop at all until the Vertigo bestiary is complete."],
["crest-amulet","Crest Amulet","Event gear","Taken from the <a href=\"#/e/keeper-of-the-sky\">Keeper of the Sky</a> on <a href=\"#/e/skycrest\">Skycrest</a>",
 "The Skycrest amulet, and the socket that <a href=\"#/e/charms\">Charms</a> go into. Everything on the island runs through it."],
["sky-crystal","Sky Crystal","Event item","10 of them, hidden around Skycrest",
 "Collect and place all ten to open Abaia&#8217;s Chamber. The gate is completion, not luck &mdash; each crystal is findable."],
["charms","Charms","Event gear","Nine Skycrest charms, socketed into the Crest Amulet",
 "Charms level up as you fish with them equipped, and a levelled charm&#8217;s passive is substantially stronger than a fresh one. Pick one and commit rather than rotating."],
["totems","Totems","Consumable","Roughly <span class=\"flag\" title=\"20 in some guides, 26 in others\">20&ndash;26 totems</span>; shops, crates, codes",
 "Consumables that overwrite the <em>server&#8217;s</em> time and weather. This is the single most underused system in Fisch: instead of waiting for the condition a fish wants, you buy it."],
["sundial-totem","Sundial Totem","Totem","Cycles the server&#8217;s time of day",
 "The time totem, and the backbone of organised <a href=\"#/e/megalodon-hunt\">Megalodon</a> hunting &mdash; players cycle day and night with <span class=\"flag\" title=\"Community figure for forcing hunt events\">60&ndash;70 totems</span> to force hunt events to spawn."],
["tempest-totem","Tempest Totem","Totem","Forces rain",
 "Rain and storms gate a set of species and storm-band mutations such as <a href=\"#/e/lightning\">Lightning</a>. One totem replaces an indefinite wait."],
["windset-totem","Windset Totem","Totem","Forces windy weather",
 "Wind is its own weather state with its own preferring species. Cheap, specific, and the reason a stalled bestiary suddenly moves."],
["smokescreen-totem","Smokescreen Totem","Totem","Forces fog",
 "The fog totem &mdash; how you get the <a href=\"#/e/colossal-squid\">Colossal Squid</a> and <a href=\"#/e/crowned-anglerfish\">Crowned Anglerfish</a> without camping the weather."],
["clearcast-totem","Clearcast Totem","Totem","Clears the weather",
 "The undo button. Useful when someone else&#8217;s totem has put the server into weather you do not want."],
["potions","Potions","Consumable","<span class=\"flag\" title=\"Four potions named in one overview; the roster changes with patches\">Four potions</span>; shops and events",
 "Timed stat boosts. The XP potion is the one that matters for levelling &mdash; a temporary XP boost stacked with everything else is how max-level runs are done."],
["shell-of-wrath","Shell of Wrath","XP gear","<b>+25% XP</b>",
 "Part of the standard XP-stacking loadout. XP bonuses in Fisch stack from several unrelated sources, so collecting three small ones beats hunting for one big one."],
["companions","Companions","Companion","Pets that follow you and apply a passive &mdash; e.g. the Relic Construct",
 "Companions are a stat slot, not a cosmetic. The XP-farming setups name a specific companion for a reason."],
["crates","Crates &amp; geodes","Container","Bait Crates, Common and Quality Crates, Coral and Volcanic Geodes, Tropical Crates",
 "Where most good <a href=\"#/c/bait\">bait</a> actually comes from. If you are buying legendary bait rather than opening for it, you are overpaying."],
["personal-aquarium","Personal Aquarium","Facility","Holds fish you keep; produces bait over time",
 "A passive bait source and a place to store trophies instead of selling them. Small, permanent, easy to forget you own."],
["harpoon-gun","Harpoon Gun","Weapon","Added in the Harpoon Guns update",
 "An alternative to the rod for some content, and significant enough that rod tier lists are dated &ldquo;after the Harpoon Guns update&rdquo;. Treat any rod ranking written before it with suspicion."],
["aurora-bobber","Aurora Bobber","Cosmetic reward","<span class=\"flag\" title=\"Aurora Bobber in some guides, Aurora Glow Lantern in others\">100% bestiary reward &mdash; name disputed</span>",
 "The completionist prize for a fully filled bestiary. Sources name it differently, which is a good sign it is cosmetic rather than load-bearing."]
];
ITEMS.forEach(i => E("item", i[0], i[1], {t:[i[2], i[3]],
  info:[["Kind",i[2]],["Source / effect",i[3]]], lead:i[4],
  see:["items-index","path","enchanting"]}));

/* ═════════════════════════ NPCs ═════════════════════════ */
const NPCS = [
["pierre","Pierre","<a href=\"#/e/moosewood\">Moosewood</a> beach","Runs the tutorial. Onboarding only &mdash; he is not a merchant and sells nothing."],
["marc","Marc","<a href=\"#/e/moosewood\">Moosewood</a>","The starter rod shop: Plastic, Carbon, Fast and Lucky rods. The Carbon Rod at 2,000 C$ is the only one worth your first purchase."],
["moosewood-merchant","The Merchant","<a href=\"#/e/moosewood\">Moosewood</a>, village centre","Buys fish. Every named island has one, so you are never far from selling."],
["shipwright","The Shipwright","<a href=\"#/e/moosewood\">Moosewood</a> docks","Sells boats, starting with the Rowboat at 400 C$. This is the NPC that opens the map."],
["the-appraiser","The Appraiser","<a href=\"#/e/moosewood\">Moosewood</a>","Re-rolls a fish&#8217;s weight and mutation for a fee &mdash; a second chance at a better variant without catching a new fish."],
["agaric","Agaric","<a href=\"#/e/mushgrove-swamp\">Mushgrove Swamp</a>","Asks for one Alligator and hands over the <a href=\"#/e/fungal-rod\">Fungal Rod</a> free. The best-value NPC in the game."],
["roslit-blacksmith","The Blacksmith","<a href=\"#/e/roslit-bay\">Roslit Bay</a>","Sells the <a href=\"#/e/steady-rod\">Steady Rod</a> &mdash; the rod that ends the early game."],
["mine-guard","The Mine Guard","<a href=\"#/e/statue-of-sovereignty\">Statue of Sovereignty</a>, by the elevator","Takes a <b>400 C$</b> bribe and lets you down to the <a href=\"#/e/keepers-altar\">Keepers Altar</a>. One-time, cheap, permanent."],
["caleia","Caleia","<a href=\"#/e/the-arch\">The Arch</a>","Sells the <a href=\"#/e/destiny-rod\">Destiny Rod</a> for 190,000 C$ &mdash; but only once your total bestiary hits <b>70%</b>."],
["keeper-of-the-sky","Keeper of the Sky","<a href=\"#/e/skycrest\">Skycrest</a>","Holds the <a href=\"#/e/crest-amulet\">Crest Amulet</a> and takes the ten Sky Crystals that open Abaia&#8217;s Chamber."],
["merlin","Merlin","<a href=\"#/e/sunstone-island\">Sunstone Island</a>","Sells <a href=\"#/e/enchant-relic\">Enchant Relics</a> at <b>11,000 C$</b> and 10-minute Luck VI boosts at <b>5,000 C$</b>. XP-farming write-ups also credit him with a <b>+20% XP</b> boost."],
["alfie","Alfie","<a href=\"#/e/roslit-bay\">Roslit Hamlet</a>","The <a href=\"#/e/steady-rod\">Steady Rod</a> sits beside him at 7,000 C$ &mdash; the rod that ends the early game."],
["travelling-merchant","The Travelling Merchant","Moves around","Stock and location both rotate. The <a href=\"#/e/midas-rod\">Midas Rod</a> at 55,000 C$ is his headline item, which is why guides disagree about where the Midas Rod comes from."],
["forge-master-torin","Forge Master Torin","<a href=\"#/e/skycrest\">Skycrest</a>","Takes seven Ancient Idol Charms and five Giant fish, and forges the <a href=\"#/e/ancient-idol-rod\">Ancient Idol Rod</a>."],
["fruit-lover-frank","Fruit Lover Frank","<a href=\"#/e/skycrest\">Skycrest</a>","Wants 25 tropical fruits, then a follow-up catch, then the Fruity Abaia &mdash; and pays out the <a href=\"#/e/fruitline\">Fruitline</a>, the highest-luck rod in the game."]
];
NPCS.forEach(n => E("npc", n[0], n[1], {t:[n[2], n[3]],
  info:[["Where",n[2]],["Role","NPC"]], lead:n[3], see:["npcs-index","path"]}));

/* ═════════════════════════ BOSSES & HUNTS ═════════════════════════ */
const HUNTS = [
["megalodon-hunt","Megalodon Hunt","Open ocean","Forced by cycling the server&#8217;s day/night with <span class=\"flag\" title=\"Community figure\">~60&ndash;70 Sundial Totems</span>",
 "Fisch&#8217;s signature hunt. It is a server event rather than a fishing spot, which is why the community answer to &ldquo;how do I get a Megalodon&rdquo; is a stack of totems rather than a better rod.",
 "<ol><li>Bank <a href=\"#/e/sundial-totem\">Sundial Totems</a> &mdash; a lot of them.</li><li>Cycle the server&#8217;s time repeatedly to force hunt events to roll.</li><li>When the hunt spawns, everything else on the server stops. Be ready before you start cycling.</li></ol>"],
["kraken","The Kraken",'Kraken Pool, beneath <a href="#/e/atlantis">Atlantis</a>',"A five-lever world quest",
 "The base game&#8217;s most involved boss unlock. The pool does not exist for you until five hidden levers have been flicked.",
 "<p>The five levers: <strong>behind the Merchant</strong>, <strong>under the Cannon Hut</strong>, <strong>behind the Waterfall</strong>, <strong>on the Mountain Bridge</strong>, and <strong>inside the Skull Cave</strong>. Order does not matter.</p><p>Do this on the same trip you buy the <a href=\"#/e/kraken-rod\">Kraken Rod</a> &mdash; Atlantis is a long sail to make twice.</p>"],
["abaia","Abaia",'Abaia&#8217;s Chamber, beneath <a href="#/e/skycrest">Skycrest</a>',"Idol Favor &rarr; 10 Sky Crystals &rarr; Fire of Spirits during a Tropical Squall",
 "The Skycrest event boss, and a good example of how modern Fisch events are built: a currency to grind, a collection to finish, a weather condition to wait for, and a multi-stage fight at the end.",
 "<ol><li>Grind <strong>Idol Favor</strong> at the idol pond.</li><li>Return all <strong>10 <a href=\"#/e/sky-crystal\">Sky Crystals</a></strong> to the <a href=\"#/e/keeper-of-the-sky\">Keeper of the Sky</a> to open the gate.</li><li>Sacrifice caught fish at the <strong>Fire of Spirits</strong> during a <strong>Tropical Squall</strong> until the Abaia Hunt spawns.</li><li>Strip its barrier in the outer ponds, then fight it in the chamber.</li></ol>"],
["isonade-hunt","Isonade","Deep water","A deep-water catch rather than a scripted quest",
 "Treated as a trophy catch. Its main appearance in the wikis is as the worked example of stacking &mdash; the fabled <em>Glitched Shiny Sparkling Big Silver Isonade</em> that every mutation explainer reaches for.",
 "<p>Nothing scripted to do here: bring luck, bring weight allowance, and fish the deep water.</p>"]
];
HUNTS.forEach(h => E("hunt", h[0], h[1], {t:[h[2], h[3]],
  info:[["Where",h[2]],["How it starts",h[3]]], lead:h[4],
  sec:[["Doing it", h[5]]], see:["hunts-index","totems","bestiary"]}));

/* ═════════════════════════ MECHANICS ═════════════════════════ */
E("mech","minigame","The fishing minigame",{t:["Cast, shake, then reel &mdash; three separate skill checks"],
 info:[["Steps","Cast &rarr; Shake &rarr; Reel"],["Cast","Hold to fill the power meter, release"],["Shake","Click the prompts fast; a miss restarts the cast"],["Reel","Hold to move right, release to drift left"]],
 lead:"Fisch&#8217;s core loop is three checks in a row, and each one is failed differently. Most fish lost by new players are lost in the shake, not the reel.",
 sec:[["Casting","<p>Equip the rod, hold the mouse button to fill the power meter, release to cast. Distance matters: some species live further out than a lazy cast reaches.</p>"],
  ["Shaking","<p>Once the line lands, prompts appear. Click them quickly to shorten the wait. <strong>Missing one restarts the cast</strong> &mdash; this is the single biggest early-game time sink, and it is exactly what the <a href=\"#/e/steady-rod\">Steady Rod</a>&#8217;s wider shake window fixes.</p>"],
  ["Reeling","<p>A bar with a fish marker inside it. <strong>Hold</strong> to slide your bar right, <strong>release</strong> to let it drift left. Keep the bar over the fish until the progress meter fills. Fighting the drift with constant holds is how the bar overshoots &mdash; tap, do not grip.</p>"]],
 see:["control","resilience","steady-rod","beginner"]});
E("mech","luck","Luck &mdash; universal vs preferred",{t:["Two different luck stats that do two different jobs"],
 info:[["Universal luck","Biases the whole rarity table upward"],["Preferred luck","Boosts one species or a named set"],["Sources","Rod stat, bait, enchants, rod passives"],["Rule","Universal for sweeps, preferred for hunts"]],
 lead:"The most common gear mistake in Fisch is stacking the wrong luck. Universal luck raises your odds on <em>everything</em>; preferred luck raises your odds on <em>something specific</em>. A +300% preferred bait is close to worthless if you do not know what you are fishing for.",
 sec:[["Choosing between them","<ul><li>Filling a bestiary block, or farming rarity for money &rarr; <strong>universal</strong> (<a href=\"#/e/weird-algae\">Weird Algae</a>, luck rods).</li><li>Hunting one named fish &rarr; <strong>preferred</strong> (<a href=\"#/e/truffle-worm\">Truffle Worm</a>).</li><li>Farming volume for C$ &rarr; neither. Take <strong>lure speed</strong> and sell more fish per hour.</li></ul>"]],
 see:["lure-speed","baits-index","bestiary","money"]});
E("mech","lure-speed","Lure speed",{t:["How fast fish bite &mdash; your casts per hour"],
 info:[["Raises","Throughput"],["Trades against","Luck, on most baits"],["Matters most","Money farming and timer-based rod passives"]],
 lead:"Lure speed decides how long you wait between bites, which makes it a throughput stat rather than a quality one. It is worth the most when the thing you are farming is common and the thing you want is volume.",
 sec:[["Where it wins outright","<p>On a rod with a <em>timed</em> passive &mdash; the <a href=\"#/e/elder-moss-ripper\">Elder Moss Ripper</a>&#8217;s two-minute Mossjaw, the every-third-catch duplication passives &mdash; lure speed is the stat that converts the passive into income. Being idle when a timer comes up is pure loss.</p>"]],
 see:["luck","fast-rod","elder-moss-ripper","money"]});
E("mech","control","Control",{t:["How steadily your bar tracks the fish in the reel"],
 info:[["Affects","The reeling minigame"],["High control","Bar responds precisely; less overshoot"],["Low control","Sloppy, drifty bar on hard fish"]],
 lead:"Control is the difference between the reeling bar going where you meant and going where you pushed it. Cheap rods have little of it, which is why hard catches feel unfair on a Flimsy Rod and routine on a Steady Rod.",
 see:["minigame","resilience","steady-rod"]});
E("mech","resilience","Resilience",{t:["How much punishment the line absorbs before you lose the fish"],
 info:[["Affects","Failure tolerance in the reel"],["High resilience","Mistakes cost progress, not the fish"],["Boosted by","Rod stats and some baits"]],
 lead:"Resilience is your margin for error. With enough of it a fumbled reel costs progress; without it, the same fumble costs the catch. It is the least glamorous rod stat and the one that most changes how the game feels.",
 see:["minigame","control","steady-rod"]});
E("mech","max-weight","Max weight",{t:["The heaviest fish your rod can land at all"],
 info:[["Hard limit","Yes &mdash; over it, you do not land the fish"],["Raised by","Better rods"],["Weight also","Multiplies sale value"]],
 lead:"A hard ceiling, not a soft one. Deep-water and boss-tier species outweigh early rods outright, which is why the answer to &ldquo;why can I never land anything here&rdquo; is usually the rod rather than the technique.",
 sec:[["Weight is also money","<p>Sale value scales with weight, so the same species is worth more as a heavier specimen. That is what makes <a href=\"#/e/sea-overlord\">Sea Overlord</a>&#8217;s flat +25% weight quietly one of the best enchants in the game, and what the <a href=\"#/e/the-appraiser\">Appraiser</a> lets you re-roll.</p>"]],
 see:["value","appraisal","sea-overlord","rods-index"]});
E("mech","rarity","Rarity tiers",{t:["Trash through Secret &mdash; and the sources do not agree on the count"],
 info:[["Tiers","<span class=\"flag\" title=\"12, 17 and 18 tiers all appear in circulation, plus Limited/Special/Extinct side categories\">12 to 18, depending on the source</span>"],["Common chain","Trash &middot; Common &middot; Uncommon &middot; Unusual &middot; Rare &middot; Exotic &middot; Legendary &middot; Mythical &middot; Secret"],["Side categories","Limited, Special, Extinct"],["Effect","Higher tier &rarr; harder minigame, better value"]],
 lead:"Rarity does two things at once: it decides how often a species appears and how hard its minigame is. The exact ladder is one of the messier parts of the Fisch documentation &mdash; different community databases count 12, 17 or 18 tiers.",
 sec:[["What is safe to rely on","<p>The <em>ordering</em> is stable and the <em>direction</em> is stable: rarer means harder to hook, harder to land and worth more. The specific tier count and the published per-tier percentages are not consistent between sources, so do not build expectations around a number like &ldquo;45% common&rdquo;.</p>"]],
 see:["luck","bestiary","sources","fish-index"]});
E("mech","bestiary","The Bestiary",{t:["Per-location catch logs, and the gate on the Destiny Rod"],
 info:[["Tracked","Per location, and as a total"],["70% total","<a href=\"#/e/destiny-rod\">Destiny Rod</a> unlocks at Caleia, 190,000 C$"],["100% Vertigo","Required before <a href=\"#/e/depths-key\">The Depths Key</a> can drop"],["100% total","<span class=\"flag\" title=\"Aurora Bobber, Aurora Glow Lantern and the Masterline Rod are all named by different sources\">Reward name disputed</span>"]],
 lead:"Fisch&#8217;s collection log, and the only system in the game that converts patience directly into gear. Two thresholds actually matter: <strong>70% total</strong> for the Destiny Rod, and <strong>100% of Vertigo</strong> for The Depths Key.",
 sec:[["Filling it efficiently","<p>Percentage is percentage. A five-minute Moosewood common moves your total as much as a two-hour deep-water hunt, so complete <strong>whole easy locations</strong> first: Moosewood, Roslit Bay, Terrapin Island and the Ocean are the four blocks every guide names for reaching 70%.</p><p>The exception is Vertigo, where the requirement is that <em>one</em> location hits 100%. Do that as a deliberate project, not incidentally.</p>"],
  ["What blocks a bestiary","<ul><li><strong>Weather-gated species</strong> &mdash; buy a <a href=\"#/e/totems\">totem</a> instead of waiting.</li><li><strong>Weight-gated species</strong> &mdash; the rod is the problem.</li><li><strong>Hazard water</strong> &mdash; the Brine Pool and Roslit Volcano need <a href=\"#/e/invincible\">Invincible</a>.</li></ul>"]],
 see:["destiny-rod","vertigo","totems","the-arch","path"]});
E("mech","appraisal","Appraisal",{t:["Re-roll a caught fish&#8217;s weight and mutation"],
 info:[["NPC","<a href=\"#/e/the-appraiser\">The Appraiser</a>, Moosewood"],["Re-rolls","Weight and mutation"],["Safe","Attributes &mdash; Shiny, Sparkling &mdash; are never lost"],["Risk","A good mutation can be re-rolled into a worse one"]],
 lead:"A second roll of the dice on a fish you already own. The Appraiser re-rolls weight and mutation, which means it can improve a catch and can also ruin one &mdash; the mutation you have is not protected.",
 sec:[["When to appraise","<p>The community rule is narrow and correct: <strong>appraise fish that already show a mutation</strong>, because those are the ones where an upgrade is worth the most and the base value is already high. Appraising plain catches burns money on lottery tickets.</p><p>Attributes such as Shiny and Sparkling carry no appraisal risk &mdash; they cannot be lost &mdash; so a Shiny fish is a strictly safer appraisal candidate than a plain one.</p>"]],
 see:["mutations-index","value","the-appraiser","money"]});
E("mech","weather","Time &amp; weather",{t:["Gates species and mutations &mdash; and totems let you buy the condition"],
 info:[["States","Day/night, rain, storm, wind, fog, clear, and event weather"],["Gates","Species availability and some mutations"],["Control","<a href=\"#/e/totems\">Totems</a> overwrite the server state"],["Night","Carries its own XP and species effects"]],
 lead:"Weather and time of day are not scenery in Fisch &mdash; they decide what is catchable. The important consequence is that a stalled bestiary is usually a weather problem, and weather is purchasable.",
 sec:[["The totem shortcut","<ul><li>Fog &rarr; <a href=\"#/e/smokescreen-totem\">Smokescreen Totem</a></li><li>Rain and storms &rarr; <a href=\"#/e/tempest-totem\">Tempest Totem</a></li><li>Wind &rarr; <a href=\"#/e/windset-totem\">Windset Totem</a></li><li>Time of day &rarr; <a href=\"#/e/sundial-totem\">Sundial Totem</a></li><li>Undo all of it &rarr; <a href=\"#/e/clearcast-totem\">Clearcast Totem</a></li></ul><p>Totems change the state for the <strong>whole server</strong>, which is why hunt organisation in Fisch is a totem logistics problem.</p>"]],
 see:["totems","bestiary","megalodon-hunt","mutations-index"]});
E("mech","xp","Levels &amp; XP",{t:["190 &times; your current level to reach the next one"],
 info:[["XP to next level","<b>190 &times; current level</b>"],["Level 1 &rarr; 2","190 XP"],["Past level 1001","<span class=\"flag\" title=\"Reported as doubling for every 500 levels past 1001\">Doubles every 500 levels</span>"],["Max level","<b>2,000</b>"],["Total to max","<span class=\"num\">997,120,000</span> XP"],["Gates","Locations, rods and gear &mdash; e.g. <a href=\"#/e/kraken-rod\">Kraken Rod</a> at ~180"]],
 lead:"The XP curve is arithmetic, not exponential, for the first thousand levels: each level costs <strong>190 &times; your current level</strong>. That makes the early climb fast and the back half enormous &mdash; 997 million XP to reach the 2,000 cap.",
 sec:[["Stacking XP","<p>XP bonuses in Fisch come from unrelated sources and stack, which is why max-level runs look like shopping lists rather than fishing trips:</p><ul><li>An XP rod with XP-flavoured mutations</li><li>A temporary XP potion &mdash; <a href=\"#/e/merlin\">Merlin&#8217;s</a> is quoted at <b>+20%</b></li><li><a href=\"#/e/shell-of-wrath\">Shell of Wrath</a> &mdash; <b>+25%</b></li><li>A <a href=\"#/e/companions\">companion</a> with an XP passive</li><li>Location and time multipliers &mdash; night multipliers as high as <b>3&times;</b> are quoted for specific spots</li><li>The <strong>Double XP</strong> gamepass, a flat permanent multiplier</li><li><strong>Friends in your party</strong> &mdash; <b>+10% each, up to +50%</b></li></ul><p>Stacked properly a single catch can be worth tens of thousands of XP rather than a few hundred. Unstacked levelling at the same spot is not slow; it is a different order of magnitude.</p>"]],
 see:["xp-guide","merlin","shell-of-wrath","path"]});
E("mech","money","C$ and selling",{t:["Value = base species &times; weight &times; mutation &times; attributes"],
 info:[["Currency","C$"],["Sold to","The Merchant on any island"],["Multipliers","Weight, mutations, attributes, appraisal"],["Endgame rates","<span class=\"flag\" title=\"Community figures; setup-dependent\">2&ndash;4M/hr, or 15&ndash;25M/hr with the Elder Moss Ripper</span>"]],
 lead:"A fish&#8217;s price is its species&#8217; base value multiplied by weight, then by whatever mutation and attributes it carries. Every one of those terms is something you can influence, which is why two players fishing the same spot can earn ten times differently.",
 sec:[["The multipliers you control","<ul><li><strong>Where you fish</strong> &mdash; base value is the biggest single term.</li><li><strong>Weight</strong> &mdash; a bigger specimen is worth more; <a href=\"#/e/sea-overlord\">Sea Overlord</a> adds a flat 25%.</li><li><strong>Mutations</strong> &mdash; up to 12&times; on the top standard mutation, and <a href=\"#/e/quantum\">Quantum</a> manufactures them at 25%.</li><li><strong>Attributes</strong> &mdash; Shiny and Sparkling stack on top of a mutation.</li><li><strong>Appraisal</strong> &mdash; re-roll, but only on fish that are already mutated.</li></ul>"]],
 see:["money-guide","value","appraisal","mutations-index"]});
E("mech","boats","Boats",{t:["The map does not open until you own one"],
 info:[["First boat","Rowboat &mdash; 400 C$, Moosewood docks"],["What they do","Travel; island names reveal as you approach"],["Upgrades","Faster hulls sold as you progress"]],
 lead:"Boats are how Fisch does map unlocking: sail far enough from shore and island names appear above their locations, and visiting one is what unlocks it. There is no quest gate on most islands &mdash; only distance.",
 see:["rowboat","the-ocean","moosewood","path"]});
E("mech","enchant-system","Enchanting",{t:["Relic in, random enchant out &mdash; at one altar, at night"],
 info:[["Where","<a href=\"#/e/keepers-altar\">Keepers Altar</a>, under the Statue of Sovereignty"],["Entry","400 C$ bribe, once"],["Input","<a href=\"#/e/enchant-relic\">Enchant Relic</a> or <a href=\"#/e/exalted-relic\">Exalted Relic</a>"],["Result","A random enchant, replacing the current one"]],
 lead:"Fisch&#8217;s only rod-upgrade system that is not a purchase. You offer a relic at the Keepers Altar and get a random enchant, overwriting whatever the rod carried before.",
 see:["enchanting","keepers-altar","exalted-relic","quantum"]});
E("mech","bonuses","Gamepasses &amp; party bonuses",{t:["Permanent multipliers that sit outside your gear"],
 info:[["Double XP","Gamepass &mdash; flat permanent XP multiplier"],["Friends","<b>+10% XP each</b>, up to <b>+50%</b> with five"],["Stacks with","Everything else in the XP stack"]],
 lead:"Two multipliers that have nothing to do with fishing: the Double XP gamepass, and simply having friends in your party. Five friends is +50% XP for no gear, no grinding and no cost.",
 see:["xp","xp-guide"]});

/* ═══════════════════ THE PROGRESSION ENGINE ═══════════════════
   One ordered milestone list drives both the roadmap checklist and the
   "where am I" planner, so the two can never drift apart.
   State s = {lvl, ord (rod power index), cash, f:{...flags}}          */

const RODORD = {}; RODS.forEach((r, i) => { RODORD[r[0]] = i; });
const ordOf = id => (RODORD[id] === undefined ? 0 : RODORD[id]);

const MILESTONES = [
{id:"m-boat", ph:0, t:"Buy the Rowboat", cost:400, where:"Shipwright, Moosewood docks",
 body:"<b>400 C$</b> to the Shipwright. Until you own a boat, Fisch is one island; after it, island names reveal themselves as you sail near them and every location in this wiki becomes reachable.",
 done:s => s.f.boat},
{id:"m-carbon", ph:0, t:"Buy the Carbon Rod", cost:2000, where:"Marc&#8217;s shop, Moosewood",
 body:"Fish the Moosewood dock with the Flimsy Rod until you have <b>2,000 C$</b> and buy the <a href=\"#/e/carbon-rod\">Carbon Rod</a>. Do not buy the Plastic or Training rods on the way &mdash; that is 900 C$ you then have to earn again.",
 done:s => s.ord >= ordOf("carbon-rod")},
{id:"m-easybest", ph:0, t:"Clear the four easy bestiary blocks", cost:0, where:"Moosewood, Roslit Bay, Terrapin, the Ocean",
 body:"Fill the <a href=\"#/e/bestiary\">bestiary</a> for Moosewood, Roslit Bay, Terrapin Island and the Ocean. These four are the largest, easiest blocks in the game and they are what carries you toward the <b>70%</b> total that unlocks the Destiny Rod later. Doing them now costs nothing you were not already doing.",
 done:s => s.f.easybest},
{id:"m-steady", ph:1, t:"Buy the Steady Rod", cost:7000, where:"Blacksmith, Roslit Bay",
 body:"The <a href=\"#/e/steady-rod\">Steady Rod</a> widens the shake window and adds enough resilience that you stop losing fish to the minigame. This is the rod that ends the early game.",
 done:s => s.ord >= ordOf("steady-rod")},
{id:"m-altar", ph:1, t:"Open the Keepers Altar", cost:400, where:"Mines, Statue of Sovereignty",
 body:"Sail to the <a href=\"#/e/statue-of-sovereignty\">Statue of Sovereignty</a>, go into the mines, and pay the NPC by the elevator <b>400 C$</b>. That is the entire cost of permanently unlocking <a href=\"#/g/enchanting\">enchanting</a>. There is no reason to still have this closed at level 200.",
 done:s => s.f.altar},
{id:"m-fungal", ph:1, t:"Take Agaric&#8217;s free Fungal Rod", cost:0, where:"Mushgrove Swamp",
 body:"Sail to <a href=\"#/e/mushgrove-swamp\">Mushgrove Swamp</a>, talk to <a href=\"#/e/agaric\">Agaric</a>, catch one <b>Alligator</b>, and he hands over the <a href=\"#/e/fungal-rod\">Fungal Rod</a> for free. Its luck passive beats anything you could buy at this point, and it costs nothing.",
 done:s => s.ord >= ordOf("fungal-rod")},
{id:"m-relics", ph:2, t:"Farm relics and enchant your rod", cost:0, where:"Ancient Isle, or the Roslit Bay shallows",
 body:"Fish <a href=\"#/e/enchant-relic\">Enchant Relics</a> in bulk &mdash; <a href=\"#/e/ancient-isle\">Ancient Isle</a> if you can reach it, the Nurse Shark shallows in <a href=\"#/e/roslit-bay\">Roslit Bay</a> if you cannot &mdash; then spend the whole stack at the altar in one sitting. Each roll <b>overwrites</b> the last, so stop the moment you land something worth keeping.",
 done:s => s.f.enchanted},
{id:"m-money1", ph:2, t:"Set up a real money farm", cost:0, where:"Forsaken Shores &mdash; the waterfall pond",
 body:"<a href=\"#/e/forsaken-shores\">Forsaken Shores</a> is the mid-game answer to both money and XP, which is unusual &mdash; normally those are different places. Fish the waterfall pond, not the open shore. This is where the 150,000 C$ for the Trident Rod comes from.",
 done:s => s.ord >= ordOf("trident-rod") || s.cash >= 150000},
{id:"m-trident", ph:3, t:"Buy the Trident Rod", cost:150000, where:"Trident&#8217;s Temple",
 body:"The <a href=\"#/e/trident-rod\">Trident Rod</a> is the correct target for any mid-game player who does not know what to save for. Its ~30% <a href=\"#/e/atlantean\">Atlantean</a> passive multiplies catch value by 3, so it earns a good share of its own price back.",
 done:s => s.ord >= ordOf("trident-rod")},
{id:"m-best70", ph:3, t:"Reach 70% bestiary &rarr; Destiny Rod", cost:190000, where:"Caleia, The Arch",
 body:"At <b>70% total bestiary</b>, <a href=\"#/e/caleia\">Caleia</a> at <a href=\"#/e/the-arch\">The Arch</a> sells the <a href=\"#/e/destiny-rod\">Destiny Rod</a> for 190,000 C$ &mdash; cheap for its tier. Finish whole easy locations to get there; percentage is percentage.",
 done:s => s.f.best70 || s.ord >= ordOf("destiny-rod")},
{id:"m-vertigo", ph:4, t:"Complete the Vertigo bestiary to 100%", cost:0, where:"Vertigo",
 body:"A hard gate with no shortcut. <a href=\"#/e/vertigo\">Vertigo</a> must be at <b>100%</b> before The Depths Key can drop at all. Treat it as its own project rather than something that happens by accident.",
 done:s => s.f.vertigo},
{id:"m-depthskey", ph:4, t:"Fish The Depths Key from the Strange Whirlpool", cost:0, where:"Vertigo &mdash; the Strange Whirlpool",
 body:"With Vertigo at 100%, fish the <b>Strange Whirlpool</b> until you catch <a href=\"#/e/depths-key\">The Depths Key</a>. It cannot be bought or traded around.",
 done:s => s.f.depths},
{id:"m-depthsrod", ph:4, t:"Buy the Rod of the Depths", cost:750000, where:"Inside The Depths",
 body:"<b>750,000 C$</b> for the <a href=\"#/e/rod-of-the-depths\">Rod of the Depths</a>. Bank the money <em>before</em> you go down &mdash; nothing in The Depths helps you earn it and the trip back out is long.",
 done:s => s.ord >= ordOf("rod-of-the-depths")},
{id:"m-level180", ph:5, t:"Reach level 180 for Atlantis", cost:0, lvl:180, where:"Wherever your XP stack is best",
 body:"<a href=\"#/e/atlantis\">Atlantis</a> gates on character level as well as money &mdash; around <b>180</b>. If your level is short, money will not substitute; go stack XP bonuses and level deliberately (see <a href=\"#/g/xp-guide\">XP &amp; levelling</a>).",
 done:s => s.lvl >= 180},
{id:"m-kraken", ph:5, t:"Atlantis: five levers, then the Kraken Rod", cost:1333333, where:"Atlantis",
 body:"Flick the five hidden levers &mdash; behind the Merchant, under the Cannon Hut, behind the Waterfall, on the Mountain Bridge, inside the Skull Cave &mdash; to open the Kraken Pool, and buy the <a href=\"#/e/kraken-rod\">Kraken Rod</a> on the same trip. Budget the higher of the two published prices.",
 done:s => s.ord >= ordOf("kraken-rod")},
{id:"m-dreamer", ph:6, t:"Buy the Great Dreamer Rod", cost:500000, where:"Cursed Isle",
 body:"<b>500,000 C$</b> at <a href=\"#/e/cursed-isle\">Cursed Isle</a> for high lure speed, high luck and a duplication passive. Cheaper than the Rod of the Depths and arguably stronger &mdash; if you can reach Cursed Isle, this is the better buy.",
 done:s => s.ord >= ordOf("great-dreamer-rod")},
{id:"m-exalted", ph:6, t:"Land an exalted enchant", cost:0, where:"Keepers Altar",
 body:"<a href=\"#/e/exalted-relic\">Exalted Relics</a> roll from a small pool of much stronger enchants: <a href=\"#/e/quantum\">Quantum</a> (25% Subspace mutations), <a href=\"#/e/sea-overlord\">Sea Overlord</a> (+25% weight, so +25% money forever) and <a href=\"#/e/invincible\">Invincible</a> (fish the hazard pools with any rod). Spend them on the rod you intend to keep.",
 done:s => s.f.exalted},
{id:"m-venue", ph:7, t:"Finish the ladder: Wingripper or Chrysalis", cost:0, where:"Underground Music Venue",
 body:"The <a href=\"#/e/underground-music-venue\">Underground Music Venue</a> holds the two rods that mainstream progression guides finish on. Owning one makes the other a sidegrade &mdash; put the effort into enchanting instead.",
 done:s => s.ord >= ordOf("wingripper-rod")},
{id:"m-moneymeta", ph:7, t:"Move to the endgame money meta", cost:0, where:"Castaway Cliffs, or the Calm Zone",
 body:"Two farms: <a href=\"#/e/castaway-cliffs\">Castaway Cliffs</a> with the <a href=\"#/e/elder-moss-ripper\">Elder Moss Ripper</a> (15&ndash;25M C$/hr, because its Mossjaw passive is a two-minute timer rather than a luck roll), or the <a href=\"#/e/calm-zone\">Calm Zone</a> for the Crystallized Seadragon at ~26,100 C$ average with whatever rod you already own.",
 done:s => s.f.moneymeta || s.ord >= ordOf("elder-moss-ripper")}
];

const PHASES = [
 {n:"Phase 0 — The first hour", lv:"Level 1–10", note:"Everything here happens on or next to the Moosewood dock."},
 {n:"Phase 1 — Getting off the starter island", lv:"Level 10–40", note:"One shop rod, one free rod, one permanent unlock."},
 {n:"Phase 2 — Income and enchants", lv:"Level 40–80", note:"Stop fishing wherever you happen to be and start farming on purpose."},
 {n:"Phase 3 — The mid-game rod", lv:"Level 80–150", note:"The Trident Rod is the point of this phase; the Destiny Rod is the bonus."},
 {n:"Phase 4 — Vertigo and The Depths", lv:"Level 150–180", note:"The hardest gate in the base game, and the one with no shortcut."},
 {n:"Phase 5 — Atlantis", lv:"Level 180+", note:"The first content gated on your level rather than your wallet."},
 {n:"Phase 6 — Endgame gear", lv:"Endgame", note:"Rods stop being upgrades and start being choices."},
 {n:"Phase 7 — The money meta", lv:"Endgame", note:"Where the account stops progressing and starts printing."}
];

/* what to farm, given how far along you are */
function farmFor(stage) {
  if (stage <= 1) return ["the Moosewood dock and Roslit Bay", "#/e/roslit-bay", "a few thousand C$/hr"];
  if (stage <= 3) return ["the Forsaken Shores waterfall pond", "#/e/forsaken-shores", "100K–500K C$/hr"];
  if (stage <= 5) return ["Forsaken Shores, with a luck bait on", "#/e/forsaken-shores", "100K–500K C$/hr"];
  if (stage <= 7) return ["the Calm Zone", "#/e/calm-zone", "Crystallized Seadragon, ~26,100 C$ a catch"];
  return ["Castaway Cliffs", "#/e/castaway-cliffs", "2–4M C$/hr, or 15–25M with the Elder Moss Ripper"];
}

const GUIDES = {
  beginner:   {n:"Beginner&#8217;s guide"},
  progression:{n:"Progression roadmap"},
  mistakes:   {n:"12 beginner mistakes"},
  "money-guide":{n:"Making money"},
  "xp-guide": {n:"XP &amp; levelling"},
  enchanting: {n:"Enchanting"},
  codes:      {n:"Codes"},
  sources:    {n:"Accuracy &amp; sources"}
};
const TOOLS = {
  path:  {n:"Where am I? &mdash; path planner"},
  budget:{n:"Rod budget planner"},
  odds:  {n:"Drop &amp; catch odds"},
  value: {n:"Fish value calculator"}
};
const INDEXES = {"locations-index":"loc","npcs-index":"npc","hunts-index":"hunt","rods-index":"rod",
 "baits-index":"bait","enchants-index":"ench","items-index":"item","fish-index":"fish",
 "mutations-index":"mut","mechanics-index":"mech"};


module.exports = {DB, CATS, STAGES, stageTag, RODS, RODORD, ordOf, MILESTONES, PHASES,
  farmFor, GUIDES, TOOLS, INDEXES, MUTS, BAITS, FISH, ENCH, ITEMS, NPCS, HUNTS};
